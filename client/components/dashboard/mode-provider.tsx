"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useDashboardSession } from "@/components/dashboard/session-provider";
import {
  fetchApi,
  workspaceModeStorageKey,
} from "@/lib/api";

type WorkspaceMode = "test" | "live";

type ModeContextValue = {
  mode: WorkspaceMode;
  isUpdating: boolean;
  setMode: (mode: WorkspaceMode) => Promise<void>;
};

const ModeContext = createContext<ModeContextValue | null>(null);

function readStoredMode(): WorkspaceMode {
  if (typeof window === "undefined") {
    return "test";
  }

  return window.localStorage.getItem(workspaceModeStorageKey) === "live"
    ? "live"
    : "test";
}

async function updateSessionMode(mode: WorkspaceMode, token: string) {
  const response = await fetchApi<{
    workspaceMode?: WorkspaceMode;
  }>("/auth/me/workspace-mode", {
    method: "PATCH",
    token,
    body: JSON.stringify({ mode }),
  });

  return response.data?.workspaceMode === "live" ? "live" : "test";
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const { token, user } = useDashboardSession();
  const [mode, setModeState] = useState<WorkspaceMode>("test");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const storedMode = readStoredMode();
    startTransition(() => {
      setModeState(storedMode);
    });

  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const nextMode = user.workspaceMode === "live" ? "live" : "test";
    window.localStorage.setItem(workspaceModeStorageKey, nextMode);
    startTransition(() => {
      setModeState(nextMode);
    });
  }, [user]);

  const value = useMemo<ModeContextValue>(
    () => ({
      mode,
      isUpdating,
      async setMode(nextMode) {
        if (nextMode === mode || isUpdating) {
          return;
        }

        const previousMode = mode;

        setIsUpdating(true);
        window.localStorage.setItem(workspaceModeStorageKey, nextMode);
        startTransition(() => {
          setModeState(nextMode);
        });

        try {
          if (!token) {
            return;
          }

          const confirmedMode = await updateSessionMode(nextMode, token);
          window.localStorage.setItem(workspaceModeStorageKey, confirmedMode);
          startTransition(() => {
            setModeState(confirmedMode);
          });
        } catch {
          window.localStorage.setItem(workspaceModeStorageKey, previousMode);
          startTransition(() => {
            setModeState(previousMode);
          });
        } finally {
          setIsUpdating(false);
        }
      },
    }),
    [isUpdating, mode, token]
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useWorkspaceMode() {
  const context = useContext(ModeContext);

  if (!context) {
    throw new Error("useWorkspaceMode must be used within ModeProvider.");
  }

  return context;
}
