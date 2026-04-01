"use client";

import { WaiterPayoutConnectForm } from "@/app/dashboard/waiter/waiter-payout-connect-form";
import { saveWaiterManualPayoutAction } from "@/app/profile/actions";
import { refreshStripeConnectStatusAction } from "@/app/profile/stripe-refresh-actions";
import {
  buildManualPayoutPreference,
  type ManualPayoutMethod,
} from "@/lib/waiter-profile-complete";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

const cardClass =
  "relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition sm:p-6";
const cardActiveRing =
  "border-emerald-200/90 bg-gradient-to-b from-emerald-50/40 to-white ring-1 ring-emerald-200/50";
const cardNeutral = "border-slate-200/90 ring-1 ring-slate-900/5";

const inputClass =
  "min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none ring-blue-600/15 transition focus:border-blue-600 focus:ring-[3px] sm:min-h-0 sm:text-sm";

function manualMethodLabel(m: ManualPayoutMethod): string {
  switch (m) {
    case "zelle":
      return "Zelle";
    case "cash_app":
      return "Cash App";
    case "paypal":
      return "PayPal";
    case "venmo":
      return "Venmo";
    default:
      return "Other";
  }
}

function ConfiguredBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
      <span className="text-emerald-600" aria-hidden>
        ✓
      </span>
      {label}
    </span>
  );
}

function getFocusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    )
  );
}

function RemoveManualPayoutModal({
  onCancel,
  onConfirm,
  pending,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    queueMicrotask(() => {
      cancelRef.current?.focus();
    });
    return () => {
      try {
        previous?.focus();
      } catch {
        /* ignore focus errors from detached nodes */
      }
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || pending) return;
      const panel = panelRef.current;
      if (!panel) return;
      const list = getFocusableIn(panel);
      if (list.length < 2) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pending]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-manual-payout-title"
      aria-describedby="remove-manual-payout-desc"
      aria-busy={pending}
      onClick={() => {
        if (!pending) onCancel();
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-900/10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="remove-manual-payout-title"
          className="text-lg font-semibold tracking-tight text-slate-900"
        >
          Remove manual payout?
        </h2>
        <p
          id="remove-manual-payout-desc"
          className="mt-2 text-sm leading-relaxed text-slate-600"
        >
          This clears your saved Zelle, PayPal, Cash App, or Venmo details. You
          can add them again later. Make sure you still have Stripe set up or
          another way to get paid.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3">
          <button
            ref={cancelRef}
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="min-h-[48px] rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Removing…" : "Remove manual payout"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function WaiterPayoutSetup({
  stripeAccountId,
  stripeDetailsSubmitted,
  stripePayoutsEnabled,
  initialManualMethod = "",
  initialManualHandle = "",
  returnTo = "/dashboard/waiter",
  onStripeRefreshSuccess,
  onManualPayoutSaved,
}: {
  stripeAccountId: string | null;
  stripeDetailsSubmitted?: boolean | null;
  stripePayoutsEnabled?: boolean | null;
  /** From `profiles.contact_preference` — keeps payout UI in sync after profile load. */
  initialManualMethod?: string;
  initialManualHandle?: string;
  returnTo?: "/dashboard/waiter" | "/dashboard/profile" | "/profile";
  onStripeRefreshSuccess?: () => void;
  /** e.g. refresh profile form state after saving manual payout */
  onManualPayoutSaved?: () => void;
}) {
  const router = useRouter();
  const [refreshPending, setRefreshPending] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshSyncedAt, setRefreshSyncedAt] = useState<string | null>(null);

  const [manualMethod, setManualMethod] = useState<ManualPayoutMethod | "">(
    () => (initialManualMethod as ManualPayoutMethod | "") || ""
  );
  const [manualHandle, setManualHandle] = useState(initialManualHandle);
  const [manualEditing, setManualEditing] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [isManualPending, startManualTransition] = useTransition();
  const [removeModalOpen, setRemoveModalOpen] = useState(false);

  const closeRemoveModal = useCallback(() => {
    if (isManualPending) return;
    setRemoveModalOpen(false);
  }, [isManualPending]);

  useEffect(() => {
    if (!removeModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeRemoveModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [removeModalOpen, closeRemoveModal]);

  useEffect(() => {
    if (!removeModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [removeModalOpen]);

  useEffect(() => {
    setManualMethod((initialManualMethod as ManualPayoutMethod | "") || "");
    setManualHandle(initialManualHandle);
    setManualEditing(false);
  }, [initialManualMethod, initialManualHandle]);

  const payoutBypass =
    process.env.NEXT_PUBLIC_ALLOW_TEST_PAYOUT_BYPASS === "true";

  const hasSchema =
    stripeDetailsSubmitted !== undefined && stripePayoutsEnabled !== undefined;
  const stripePayoutReady =
    Boolean(stripeAccountId?.trim()) &&
    (!hasSchema ||
      (stripeDetailsSubmitted === true && stripePayoutsEnabled === true));

  const serverManualReady =
    buildManualPayoutPreference(
      (initialManualMethod || "") as ManualPayoutMethod | "",
      initialManualHandle || ""
    ) !== null;

  const localDraftReady =
    buildManualPayoutPreference(manualMethod, manualHandle) !== null;

  const showManualForm = !serverManualReady || manualEditing;

  if (payoutBypass) {
    return (
      <div className="mt-7 rounded-2xl border border-amber-200/90 bg-amber-50/80 p-5 shadow-sm sm:mt-8 sm:p-6">
        <h2 className="text-lg font-semibold leading-snug tracking-tight text-slate-900 sm:text-[1.125rem]">
          Payouts — test mode bypass enabled
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-amber-900 sm:text-[15px]">
          Stripe Connect payout setup is bypassed for testing right now. You can
          continue end-to-end booking tests without registering a payout account.
        </p>
      </div>
    );
  }

  const stripeCardClass = `${cardClass} ${
    stripePayoutReady ? cardActiveRing : cardNeutral
  }`;
  const manualCardClass = `${cardClass} ${
    serverManualReady && !manualEditing ? cardActiveRing : cardNeutral
  }`;

  function saveManualPayout() {
    setManualError(null);
    startManualTransition(async () => {
      const r = await saveWaiterManualPayoutAction({
        method: manualMethod,
        handle: manualHandle,
      });
      if (!r.ok) {
        setManualError(
          r.kind === "validation"
            ? (r.message ??
              "Choose a payment method and enter your handle, email, or phone.")
            : "We couldn’t save your payment method. Please try again."
        );
        return;
      }
      setManualEditing(false);
      router.refresh();
      onManualPayoutSaved?.();
    });
  }

  function openRemoveManualModal() {
    setManualError(null);
    setRemoveModalOpen(true);
  }

  function confirmRemoveManualPayout() {
    setManualError(null);
    startManualTransition(async () => {
      const r = await saveWaiterManualPayoutAction({ method: "", handle: "" });
      if (!r.ok) {
        setManualError(
          "We couldn’t remove your manual payout. Please try again."
        );
        setRemoveModalOpen(false);
        return;
      }
      setRemoveModalOpen(false);
      setManualMethod("");
      setManualHandle("");
      setManualEditing(false);
      router.refresh();
      onManualPayoutSaved?.();
    });
  }

  return (
    <>
    <section className="mt-7 sm:mt-8" aria-labelledby="payout-heading">
      <h2
        id="payout-heading"
        className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
      >
        How do you want to get paid?
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
        Choose automatic bank payouts through Stripe or a manual method. A
        platform service fee applies at checkout. You need at least one active
        payout option before accepting bookings.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-2 lg:gap-6">
        {/* Option A — Stripe */}
        <div className={stripeCardClass}>
          {stripePayoutReady ? (
            <div className="mb-3">
              <ConfiguredBadge label="Stripe payouts active" />
            </div>
          ) : null}
          <h3 className="text-base font-semibold text-slate-900">
            Automatic bank transfer via Stripe
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Connect your bank account for automatic payouts after each completed
            booking.
          </p>
          {!stripePayoutReady && stripeAccountId?.trim() ? (
            <p className="mt-3 text-sm font-medium text-amber-900" role="status">
              {hasSchema && stripeDetailsSubmitted !== true
                ? "Finish identity and bank details in Stripe to enable payouts."
                : hasSchema && stripePayoutsEnabled !== true
                  ? "Stripe is still verifying your account — payouts aren’t enabled yet."
                  : "Complete Stripe onboarding to enable bank payouts."}
            </p>
          ) : !stripePayoutReady && !stripeAccountId?.trim() ? (
            <p className="mt-3 text-sm text-slate-600" role="status">
              You haven’t started Stripe setup yet — use the button below.
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-3">
            <WaiterPayoutConnectForm
              returnTo={returnTo}
              mode="onboarding"
              label="Set up Stripe payouts"
              pendingLabel="Opening Stripe…"
              buttonClassName="min-h-[48px] w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-slate-900/15 transition hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60"
            />
            <p className="text-xs leading-relaxed text-slate-500">
              Secure onboarding with Stripe Connect — add identity and bank
              details in one flow.
            </p>
            <button
              type="button"
              onClick={async () => {
                setRefreshError(null);
                setRefreshSyncedAt(null);
                setRefreshPending(true);
                try {
                  const result = await refreshStripeConnectStatusAction({
                    force: true,
                  });
                  if (!result.ok) {
                    setRefreshError(result.error);
                    return;
                  }
                  onStripeRefreshSuccess?.();
                  setRefreshSyncedAt(
                    new Date().toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  );
                  router.refresh();
                } catch (e) {
                  setRefreshError(
                    e instanceof Error
                      ? e.message
                      : "Could not refresh Stripe status."
                  );
                } finally {
                  setRefreshPending(false);
                }
              }}
              disabled={refreshPending || !stripeAccountId?.trim()}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {refreshPending
                ? "Refreshing Stripe status…"
                : "Refresh Stripe status"}
            </button>
            {refreshError ? (
              <p className="text-sm text-red-700" role="alert">
                {refreshError}
              </p>
            ) : null}
            {refreshSyncedAt && !refreshError ? (
              <p className="text-sm text-emerald-800" role="status">
                Stripe status synced ({refreshSyncedAt}).
              </p>
            ) : null}
          </div>
        </div>

        {/* Option B — Manual */}
        <div className={manualCardClass}>
          {serverManualReady && !manualEditing ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <ConfiguredBadge label="Manual payout saved" />
            </div>
          ) : null}
          <h3 className="text-base font-semibold text-slate-900">
            Manual payment (Zelle, PayPal, Cash App, Venmo)
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Customer pays you directly after booking confirmation.
          </p>

          {!showManualForm && serverManualReady ? (
            <div className="mt-5 rounded-xl border border-emerald-200/80 bg-white/80 px-4 py-4">
              <p className="text-sm font-medium text-emerald-950">
                <span className="text-emerald-600" aria-hidden>
                  ✓{" "}
                </span>
                You&apos;re set up to receive payments via{" "}
                {manualMethodLabel(initialManualMethod as ManualPayoutMethod)}
              </p>
              {initialManualHandle ? (
                <p className="mt-1.5 break-all text-sm text-slate-600">
                  {initialManualHandle}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setManualError(null);
                    setManualMethod(
                      (initialManualMethod as ManualPayoutMethod | "") || ""
                    );
                    setManualHandle(initialManualHandle);
                    setManualEditing(true);
                  }}
                  className="text-sm font-semibold text-blue-700 transition hover:text-blue-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={isManualPending}
                  onClick={openRemoveManualModal}
                  className="text-sm font-semibold text-red-700 transition hover:text-red-800 disabled:opacity-50"
                >
                  Remove manual payout
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="payout_manual_method"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Payment method
                </label>
                <select
                  id="payout_manual_method"
                  value={manualMethod}
                  onChange={(e) => {
                    setManualError(null);
                    setManualMethod(e.target.value as ManualPayoutMethod | "");
                  }}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  <option value="zelle">Zelle</option>
                  <option value="cash_app">Cash App</option>
                  <option value="paypal">PayPal</option>
                  <option value="venmo">Venmo</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="payout_manual_handle"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Your handle, email, or phone
                </label>
                <input
                  id="payout_manual_handle"
                  value={manualHandle}
                  onChange={(e) => {
                    setManualError(null);
                    setManualHandle(e.target.value);
                  }}
                  className={inputClass}
                  placeholder={
                    manualMethod === "zelle"
                      ? "Email or phone for Zelle"
                      : manualMethod === "cash_app"
                        ? "Cash App $cashtag"
                        : manualMethod === "paypal"
                          ? "PayPal email"
                          : manualMethod === "venmo"
                            ? "Venmo @username"
                            : "Payment details"
                  }
                  autoComplete="off"
                />
              </div>
              {manualError ? (
                <p className="text-sm text-red-700" role="alert">
                  {manualError}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isManualPending || !localDraftReady}
                  onClick={saveManualPayout}
                  className="min-h-[48px] rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {isManualPending ? "Saving…" : "Save payment method"}
                </button>
                {serverManualReady && manualEditing ? (
                  <button
                    type="button"
                    disabled={isManualPending}
                    onClick={() => {
                      setManualError(null);
                      setManualMethod(
                        (initialManualMethod as ManualPayoutMethod | "") || ""
                      );
                      setManualHandle(initialManualHandle);
                      setManualEditing(false);
                    }}
                    className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                ) : null}
                {serverManualReady && manualEditing ? (
                  <button
                    type="button"
                    disabled={isManualPending}
                    onClick={openRemoveManualModal}
                    className="min-h-[48px] rounded-xl px-2 text-sm font-semibold text-red-700 transition hover:text-red-800 disabled:opacity-50"
                  >
                    Remove manual payout
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>

    {removeModalOpen ? (
      <RemoveManualPayoutModal
        pending={isManualPending}
        onCancel={closeRemoveModal}
        onConfirm={confirmRemoveManualPayout}
      />
    ) : null}
    </>
  );
}
