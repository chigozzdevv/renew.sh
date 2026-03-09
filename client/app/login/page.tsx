"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Container } from "@/components/ui/container";
import { Logo } from "@/components/shared/logo";
import { ApiError, accessTokenStorageKey, fetchApi } from "@/lib/api";

type LoginResponse = {
  accessToken: string;
  expiresInSeconds: number;
  user: {
    merchantId: string;
    teamMemberId: string;
    name: string;
    email: string;
  };
};

function getNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/dashboard";
  }

  return value;
}

function toErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to sign in.";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchApi<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      window.localStorage.setItem(accessTokenStorageKey, response.data.accessToken);
      router.replace(nextPath);
    } catch (submitError) {
      setError(toErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[color:var(--surface)] py-8 sm:py-12">
      <Container className="max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Renew home" className="shrink-0">
            <Logo />
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-[color:var(--muted)] transition-colors hover:text-[color:var(--brand)]"
          >
            Back home
          </Link>
        </div>

        <section className="mt-8">
          <div className="mx-auto max-w-[34rem] rounded-[2rem] border border-white/80 bg-white/82 p-6 shadow-[0_28px_90px_rgba(10,20,12,0.08)] backdrop-blur-xl sm:p-8">
            <div>
              <h1 className="text-[clamp(2.75rem,7vw,4.75rem)] font-semibold tracking-[-0.08em] text-[color:var(--ink)]">
                Sign in.
              </h1>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[color:var(--ink)]">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-[1.15rem] border border-[color:var(--line)] bg-white px-4 text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--brand)]"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[color:var(--ink)]">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 rounded-[1.15rem] border border-[color:var(--line)] bg-white px-4 text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--brand)]"
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                />
              </label>

              {error ? (
                <div className="rounded-[1.15rem] border border-[#e7c3bc] bg-[#fff7f5] px-4 py-3 text-sm text-[#9b3b2d]">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#0c4a27] px-6 text-sm font-semibold text-[#d9f6bc] transition-colors hover:bg-[#093a1e] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
                <p className="text-sm leading-6 text-[color:var(--muted)] sm:text-base">
                  No account yet?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold text-[color:var(--brand)] transition-colors hover:text-[#093a1e]"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </section>
      </Container>
    </main>
  );
}
