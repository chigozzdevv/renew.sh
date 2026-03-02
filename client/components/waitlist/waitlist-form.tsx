"use client";

import { FormEvent, useMemo, useState } from "react";

type FormState = {
  email: string;
  name: string;
  company: string;
  useCase: string;
};

const initialState: FormState = {
  email: "",
  name: "",
  company: "",
  useCase: "",
};

function getWaitlistEndpoint() {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "https://api.renew.sh/v1";

  return `${baseUrl}/waitlist`;
}

export function WaitlistForm() {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const waitlistEndpoint = useMemo(() => getWaitlistEndpoint(), []);

  const updateField = (field: keyof FormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(waitlistEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formState.email,
          name: formState.name || undefined,
          company: formState.company || undefined,
          useCase: formState.useCase || undefined,
          source: "landing-page",
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            message?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to submit your request right now.");
      }

      setSuccessMessage("You are on the list. We will reach out when early access opens.");
      setFormState(initialState);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to submit your request right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-[color:var(--ink)]">Name</span>
          <input
            type="text"
            value={formState.name}
            onChange={(event) => updateField("name", event.target.value)}
            autoComplete="name"
            className="h-12 rounded-2xl border border-[color:var(--line)] bg-white px-4 text-sm text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]"
            placeholder="Your name"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-[color:var(--ink)]">Company</span>
          <input
            type="text"
            value={formState.company}
            onChange={(event) => updateField("company", event.target.value)}
            autoComplete="organization"
            className="h-12 rounded-2xl border border-[color:var(--line)] bg-white px-4 text-sm text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]"
            placeholder="Company name"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-[color:var(--ink)]">Work email</span>
        <input
          type="email"
          value={formState.email}
          onChange={(event) => updateField("email", event.target.value)}
          autoComplete="email"
          required
          className="h-12 rounded-2xl border border-[color:var(--line)] bg-white px-4 text-sm text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]"
          placeholder="you@company.com"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-[color:var(--ink)]">
          What are you planning to bill?
        </span>
        <textarea
          value={formState.useCase}
          onChange={(event) => updateField("useCase", event.target.value)}
          rows={5}
          className="min-h-32 rounded-[1.5rem] border border-[color:var(--line)] bg-white px-4 py-3 text-sm leading-6 text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--muted)] focus:border-[color:var(--brand)]"
          placeholder="Tell us about your subscriptions, usage-based billing, or settlement needs."
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-12 items-center justify-center rounded-full bg-[#0c4a27] px-6 text-sm font-semibold tracking-[-0.02em] text-[#d9f6bc] transition-colors duration-200 hover:bg-[#093a1e] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Joining..." : "Join waitlist"}
        </button>

        <p className="text-sm leading-6 text-[color:var(--muted)]">
          We only use this to coordinate access and onboarding.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}
    </form>
  );
}
