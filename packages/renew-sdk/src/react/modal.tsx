"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import type { RenewCheckoutClient } from "../clients/checkout-client.js";
import type {
  RenewCheckoutSession,
  SubmitCheckoutCustomerInput,
} from "../types/checkout.js";
import {
  useRenewCheckoutSession,
  type UseRenewCheckoutSessionOptions,
} from "./use-session.js";

type FormState = {
  name: string;
  email: string;
  market: string;
};

const modalStyles = `
.renew-modal__overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: rgba(8, 14, 10, 0.46);
}

.renew-modal__dialog {
  width: min(100%, 960px);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 32px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 246, 0.96));
  box-shadow: 0 40px 120px rgba(10, 20, 13, 0.22);
  color: #102114;
  font-family: inherit;
}

.renew-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 20px;
  border-bottom: 1px solid #dce4dc;
}

.renew-modal__eyebrow {
  margin: 0 0 8px;
  color: #0c4a27;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}

.renew-modal__title {
  margin: 0;
  font-size: clamp(1.65rem, 4vw, 2.35rem);
  font-weight: 700;
  line-height: 0.98;
  letter-spacing: -0.05em;
  color: #102114;
}

.renew-modal__subtitle,
.renew-modal__copy,
.renew-modal__field-copy,
.renew-modal__muted {
  margin: 0;
  color: #5b6f5f;
}

.renew-modal__subtitle {
  font-size: 14px;
  line-height: 1.6;
}

.renew-modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 1px solid #dce4dc;
  background: #ffffff;
  color: #102114;
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease;
}

.renew-modal__close:hover {
  border-color: #0c4a27;
  color: #0c4a27;
}

.renew-modal__body {
  display: grid;
}

.renew-modal__primary {
  padding: 24px;
  border-bottom: 1px solid #dce4dc;
}

.renew-modal__secondary {
  padding: 24px;
  background: #101211;
  color: #ffffff;
}

.renew-modal__section-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.04em;
  color: inherit;
}

.renew-modal__copy {
  max-width: 640px;
  font-size: 14px;
  line-height: 1.7;
}

.renew-modal__stack {
  display: grid;
  gap: 20px;
}

.renew-modal__grid {
  display: grid;
  gap: 16px;
}

.renew-modal__field {
  display: grid;
  gap: 8px;
}

.renew-modal__label {
  font-size: 14px;
  font-weight: 700;
  color: #102114;
}

.renew-modal__input,
.renew-modal__select {
  width: 100%;
  height: 48px;
  border-radius: 18px;
  border: 1px solid #dce4dc;
  background: #ffffff;
  padding: 0 16px;
  color: #102114;
  font: inherit;
  outline: none;
  transition: border-color 160ms ease;
  box-sizing: border-box;
}

.renew-modal__input:focus,
.renew-modal__select:focus {
  border-color: #0c4a27;
}

.renew-modal__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 24px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
  cursor: pointer;
  transition: background 160ms ease, opacity 160ms ease, transform 160ms ease;
}

.renew-modal__button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.renew-modal__button--brand {
  background: #0c4a27;
  color: #d9f6bc;
}

.renew-modal__button--brand:hover:not(:disabled) {
  background: #093a1e;
}

.renew-modal__meta-grid {
  display: grid;
  gap: 16px;
}

.renew-modal__card,
.renew-modal__instruction-card,
.renew-modal__state-card {
  border-radius: 24px;
  box-sizing: border-box;
}

.renew-modal__card {
  border: 1px solid #dce4dc;
  background: #ffffff;
  padding: 16px;
}

.renew-modal__instruction-card {
  border: 1px solid #dce4dc;
  background: #ffffff;
  padding: 20px;
}

.renew-modal__state-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  padding: 16px;
}

.renew-modal__card-label,
.renew-modal__state-label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.renew-modal__card-label {
  color: #5b6f5f;
}

.renew-modal__state-label {
  color: rgba(255, 255, 255, 0.55);
}

.renew-modal__card-value {
  margin: 12px 0 0;
  color: #102114;
  font-weight: 700;
  letter-spacing: -0.05em;
}

.renew-modal__card-value--lg {
  font-size: 32px;
}

.renew-modal__card-value--md {
  font-size: 18px;
  letter-spacing: -0.04em;
}

.renew-modal__state-value {
  margin: 8px 0 0;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.03em;
}

.renew-modal__session-id {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
  word-break: break-all;
}

.renew-modal__error {
  margin-top: 20px;
  border: 1px solid #fecaca;
  border-radius: 20px;
  background: #fef2f2;
  padding: 12px 16px;
  color: #b91c1c;
  font-size: 14px;
}

.renew-modal__secondary-title {
  margin: 0;
  color: #d9f6bc;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}

.renew-modal__secondary-stack {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

@media (min-width: 640px) {
  .renew-modal__header,
  .renew-modal__primary,
  .renew-modal__secondary {
    padding-left: 32px;
    padding-right: 32px;
  }

  .renew-modal__grid--two,
  .renew-modal__meta-grid--two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .renew-modal__overlay {
    align-items: center;
  }

  .renew-modal__body {
    grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  }

  .renew-modal__primary {
    border-right: 1px solid #dce4dc;
    border-bottom: 0;
  }
}
`;

const hiddenButtonStyle: CSSProperties = {
  appearance: "none",
  WebkitAppearance: "none",
};

export type RenewCheckoutModalProps = {
  readonly isOpen: boolean;
  readonly client: RenewCheckoutClient;
  readonly session: RenewCheckoutSession | null;
  readonly clientSecret?: string | null;
  readonly onClose: () => void;
  readonly onSessionChange?: UseRenewCheckoutSessionOptions["onSessionChange"];
  readonly onSettled?: UseRenewCheckoutSessionOptions["onSettled"];
  readonly onFailed?: UseRenewCheckoutSessionOptions["onFailed"];
};

function createInitialFormState(session: RenewCheckoutSession | null): FormState {
  return {
    name: session?.customer?.name ?? "",
    email: session?.customer?.email ?? "",
    market:
      session?.customer?.market ?? session?.plan.supportedMarkets[0] ?? "NGN",
  };
}

function formatInterval(days: number) {
  if (days % 30 === 0) {
    const months = days / 30;
    return `${months} month${months === 1 ? "" : "s"}`;
  }

  if (days % 7 === 0) {
    const weeks = days / 7;
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }

  return `${days} days`;
}

function humanizeValue(value: string) {
  return value.replace(/_/g, " ");
}

export function RenewCheckoutModal({
  isOpen,
  client,
  session,
  clientSecret,
  onClose,
  onSessionChange,
  onSettled,
  onFailed,
}: RenewCheckoutModalProps) {
  const [formState, setFormState] = useState<FormState>(
    createInitialFormState(session)
  );
  const {
    session: currentSession,
    error,
    isSubmittingCustomer,
    isCompletingTestPayment,
    submitCustomer,
    completeTestPayment,
  } = useRenewCheckoutSession({
    client,
    initialSession: session,
    clientSecret,
    enabled: isOpen,
    onSessionChange,
    onSettled,
    onFailed,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormState(createInitialFormState(session));
  }, [isOpen, session]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !currentSession) {
    return null;
  }

  const paymentInstructions = currentSession.paymentInstructions;
  const supportedMarkets = currentSession.plan.supportedMarkets;

  const handleSubmitCustomer = async () => {
    const payload: SubmitCheckoutCustomerInput = {
      name: formState.name.trim(),
      email: formState.email.trim().toLowerCase(),
      market: formState.market,
      paymentAccountType: "bank",
      metadata: {
        source: "renew-sdk-checkout-modal",
      },
    };

    await submitCustomer(payload);
  };

  return (
    <div
      className="renew-modal__overlay"
      onClick={onClose}
    >
      <style>{modalStyles}</style>
      <div
        className="renew-modal__dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="renew-modal__header">
          <div>
            <p className="renew-modal__eyebrow">Renew checkout</p>
            <div>
              <h2 className="renew-modal__title">{currentSession.plan.name}</h2>
              <p className="renew-modal__subtitle">
                ${currentSession.plan.usdAmount.toFixed(2)} billed every{" "}
                {formatInterval(currentSession.plan.billingIntervalDays)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="renew-modal__close"
            style={hiddenButtonStyle}
            aria-label="Close checkout"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 18 18"
              fill="none"
              style={{ width: 16, height: 16 }}
            >
              <path d="M4 4L14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="renew-modal__body">
          <div className="renew-modal__primary">
            {currentSession.nextAction === "submit_customer" ? (
              <div className="renew-modal__stack">
                <div>
                  <h3 className="renew-modal__section-title">Start the checkout</h3>
                  <p className="renew-modal__copy">
                    Enter customer details. Renew will create the customer,
                    subscription, and charge from the server-approved plan snapshot.
                  </p>
                </div>

                <div className="renew-modal__grid renew-modal__grid--two">
                  <label className="renew-modal__field">
                    <span className="renew-modal__label">Name</span>
                    <input
                      value={formState.name}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="renew-modal__input"
                      placeholder="Ada Ventures"
                    />
                  </label>

                  <label className="renew-modal__field">
                    <span className="renew-modal__label">Email</span>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      className="renew-modal__input"
                      placeholder="finance@company.com"
                    />
                  </label>
                </div>

                <label className="renew-modal__field">
                  <span className="renew-modal__label">Billing market</span>
                  <select
                    value={formState.market}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        market: event.target.value,
                      }))
                    }
                    className="renew-modal__select"
                  >
                    {supportedMarkets.map((market) => (
                      <option key={market} value={market}>
                        {market}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => void handleSubmitCustomer()}
                  disabled={
                    isSubmittingCustomer ||
                    !formState.name.trim() ||
                    !formState.email.trim()
                  }
                  className="renew-modal__button renew-modal__button--brand"
                  style={hiddenButtonStyle}
                >
                  {isSubmittingCustomer ? "Starting checkout..." : "Continue to payment"}
                </button>
              </div>
            ) : (
              <div className="renew-modal__stack">
                <div>
                  <h3 className="renew-modal__section-title">Payment instructions</h3>
                  <p className="renew-modal__copy">
                    The checkout now uses the server-approved charge state. In sandbox
                    mode, provider confirmation stays backend-driven.
                  </p>
                </div>

                <div className="renew-modal__meta-grid renew-modal__meta-grid--two">
                  <div className="renew-modal__card">
                    <p className="renew-modal__card-label">Charge amount</p>
                    <p className="renew-modal__card-value renew-modal__card-value--lg">
                      {paymentInstructions?.localAmount?.toFixed(2) ?? "--"}{" "}
                      {paymentInstructions?.billingCurrency ?? ""}
                    </p>
                  </div>

                  <div className="renew-modal__card">
                    <p className="renew-modal__card-label">Reference</p>
                    <p className="renew-modal__card-value renew-modal__card-value--md">
                      {paymentInstructions?.reference ??
                        currentSession.charge?.externalChargeId ??
                        "--"}
                    </p>
                  </div>
                </div>

                <div className="renew-modal__instruction-card">
                  <div className="renew-modal__grid renew-modal__grid--two">
                    <div>
                      <p className="renew-modal__card-label">Account name</p>
                      <p className="renew-modal__card-value renew-modal__card-value--md">
                        {paymentInstructions?.bankInfo?.accountName ?? "--"}
                      </p>
                    </div>

                    <div>
                      <p className="renew-modal__card-label">Bank</p>
                      <p className="renew-modal__card-value renew-modal__card-value--md">
                        {paymentInstructions?.bankInfo?.name ?? "--"}
                      </p>
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <p className="renew-modal__card-label">Account number</p>
                      <p
                        className="renew-modal__card-value renew-modal__card-value--md"
                        style={{ letterSpacing: "0.08em" }}
                      >
                        {paymentInstructions?.bankInfo?.accountNumber ?? "--"}
                      </p>
                    </div>
                  </div>
                </div>

                {currentSession.testMode.canCompletePayment ? (
                  <button
                    type="button"
                    onClick={() => void completeTestPayment()}
                    disabled={isCompletingTestPayment}
                    className="renew-modal__button renew-modal__button--brand"
                    style={hiddenButtonStyle}
                  >
                    {isCompletingTestPayment
                      ? "Completing sandbox payment..."
                      : "Complete sandbox payment"}
                  </button>
                ) : null}
              </div>
            )}

            {error ? (
              <div className="renew-modal__error">{error}</div>
            ) : null}
          </div>

          <div className="renew-modal__secondary">
            <p className="renew-modal__secondary-title">Session state</p>
            <div className="renew-modal__secondary-stack">
              <div className="renew-modal__state-card">
                <p className="renew-modal__state-label">Status</p>
                <p className="renew-modal__card-value renew-modal__card-value--lg" style={{ color: "#ffffff", marginTop: "8px" }}>
                  {humanizeValue(currentSession.status)}
                </p>
              </div>

              <div className="renew-modal__state-card">
                <p className="renew-modal__state-label">Next action</p>
                <p className="renew-modal__state-value">
                  {humanizeValue(currentSession.nextAction)}
                </p>
              </div>

              <div className="renew-modal__state-card">
                <p className="renew-modal__state-label">Customer</p>
                <p className="renew-modal__state-value">
                  {currentSession.customer?.email ?? "Pending customer details"}
                </p>
              </div>

              <div className="renew-modal__state-card">
                <p className="renew-modal__state-label">Settlement</p>
                <p className="renew-modal__state-value">
                  {currentSession.settlement?.status
                    ? humanizeValue(currentSession.settlement.status)
                    : "Not created yet"}
                </p>
              </div>

              <div className="renew-modal__state-card">
                <p className="renew-modal__state-label">Session ID</p>
                <p className="renew-modal__session-id">{currentSession.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
