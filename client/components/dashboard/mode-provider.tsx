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

type WorkspaceMode = "test" | "live";

type ModeContextValue = {
  mode: WorkspaceMode;
  isUpdating: boolean;
  setMode: (mode: WorkspaceMode) => Promise<void>;
};

const workspaceModeStorageKey = "renew:workspace-mode";
const accessTokenStorageKey = "renew:platform-access-token";

const ModeContext = createContext<ModeContextValue | null>(null);

function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
    "https://api.renew.sh/v1"
  );
}

function readStoredMode(): WorkspaceMode {
  if (typeof window === "undefined") {
    return "test";
  }

  return window.localStorage.getItem(workspaceModeStorageKey) === "live"
    ? "live"
    : "test";
}

function readAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(accessTokenStorageKey);
  return token?.trim() ? token.trim() : null;
}

async function fetchSessionMode(token: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to read workspace mode.");
  }

  const payload = (await response.json()) as {
    data?: {
      workspaceMode?: WorkspaceMode;
    } | null;
  };

  return payload.data?.workspaceMode === "live" ? "live" : "test";
}

async function updateSessionMode(mode: WorkspaceMode, token: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/me/workspace-mode`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mode }),
  });

  if (!response.ok) {
    throw new Error("Unable to update workspace mode.");
  }

  const payload = (await response.json()) as {
    data?: {
      workspaceMode?: WorkspaceMode;
    } | null;
  };

  return payload.data?.workspaceMode === "live" ? "live" : "test";
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<WorkspaceMode>("test");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const storedMode = readStoredMode();
    startTransition(() => {
      setModeState(storedMode);
    });

    const token = readAccessToken();

    // Prefer the authenticated workspace mode when a real session exists.
    if (!token) {
      return;
    }

    void fetchSessionMode(token)
      .then((nextMode) => {
        window.localStorage.setItem(workspaceModeStorageKey, nextMode);
        startTransition(() => {
          setModeState(nextMode);
        });
      })
      .catch(() => {
        window.localStorage.setItem(workspaceModeStorageKey, storedMode);
      });
  }, []);

  const value = useMemo<ModeContextValue>(
    () => ({
      mode,
      isUpdating,
      async setMode(nextMode) {
        if (nextMode === mode || isUpdating) {
          return;
        }

        const previousMode = mode;
        const token = readAccessToken();

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
    [isUpdating, mode]
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
