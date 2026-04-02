import type { JobStatus } from "@/lib/types/job";
import {
  BOOKING_PROGRESS_STEPS,
  getBookingProgressState,
} from "@/lib/customer-tracking";

function StepDot({
  n,
  isDone,
  isCurrent,
}: {
  n: number;
  isDone: boolean;
  isCurrent: boolean;
}) {
  return (
    <span
      className={`relative flex size-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm transition-colors ${
        isDone
          ? "bg-emerald-600 text-white"
          : isCurrent
            ? "bg-blue-600 text-white ring-4 ring-blue-500/30"
            : "border border-slate-200 bg-slate-50 text-slate-400"
      }`}
      aria-current={isCurrent ? "step" : undefined}
    >
      {isDone ? (
        <svg
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        n
      )}
    </span>
  );
}

export function BookingProgressTracker({ status }: { status: JobStatus }) {
  const state = getBookingProgressState(status);

  if (state.variant === "terminal") {
    const msg =
      state.reason === "cancelled"
        ? "This booking was cancelled."
        : state.reason === "disputed"
          ? "This booking is under review."
          : "This booking was refunded.";
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Progress
        </h2>
        <p className="mt-3 text-sm font-medium text-slate-800">{msg}</p>
        <ol className="mt-4 flex flex-wrap gap-2 opacity-70">
          {BOOKING_PROGRESS_STEPS.map((s) => (
            <li
              key={s.key}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500"
            >
              {s.label}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const currentStep =
    state.variant === "completed"
      ? BOOKING_PROGRESS_STEPS.length + 1
      : state.currentIndex + 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your booking
        </h2>
        {state.variant === "active" && status !== "completed" && (
          <span className="text-xs font-medium text-slate-500">
            Step {Math.min(currentStep, BOOKING_PROGRESS_STEPS.length)} of{" "}
            {BOOKING_PROGRESS_STEPS.length}
          </span>
        )}
      </div>

      {/* Horizontal — md+ */}
      <div className="mt-6 hidden overflow-x-auto pb-1 md:block">
        <ol className="flex min-w-0 items-start gap-0">
          {BOOKING_PROGRESS_STEPS.map((step, i) => {
            const n = i + 1;
            const isDone =
              state.variant === "completed" ? true : n < currentStep;
            const isCurrent =
              state.variant === "active" &&
              n === currentStep &&
              status !== "completed";
            const label =
              i === BOOKING_PROGRESS_STEPS.length - 1 &&
              status === "pending_confirmation"
                ? "Confirm to finish"
                : step.label;

            return (
              <li
                key={step.key}
                className="flex min-w-0 flex-1 items-start gap-0"
              >
                <div className="flex w-full min-w-0 flex-col items-center">
                  <StepDot
                    n={n}
                    isDone={isDone}
                    isCurrent={Boolean(isCurrent)}
                  />
                  <span
                    className={`mt-2 text-center text-[11px] font-medium leading-snug sm:text-xs ${
                      isCurrent || isDone ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < BOOKING_PROGRESS_STEPS.length - 1 && (
                  <div
                    className={`mx-1 mt-[1.375rem] h-0.5 min-w-[0.75rem] flex-1 rounded-full sm:mx-2 ${
                      isDone ? "bg-emerald-500/80" : "bg-slate-200"
                    }`}
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Vertical — mobile */}
      <ol className="relative mt-6 space-y-0 md:hidden">
        {BOOKING_PROGRESS_STEPS.map((step, i) => {
          const n = i + 1;
          const isDone =
            state.variant === "completed" ? true : n < currentStep;
          const isCurrent =
            state.variant === "active" &&
            n === currentStep &&
            status !== "completed";
          const label =
            i === BOOKING_PROGRESS_STEPS.length - 1 &&
            status === "pending_confirmation"
              ? "Confirm to finish"
              : step.label;
          const isLast = i === BOOKING_PROGRESS_STEPS.length - 1;

          return (
            <li key={step.key} className="relative flex gap-4 pb-8 last:pb-0">
              {!isLast && (
                <span
                  className={`absolute left-[1.375rem] top-11 h-[calc(100%-0.5rem)] w-0.5 -translate-x-1/2 ${
                    isDone ? "bg-emerald-500/80" : "bg-slate-200"
                  }`}
                  aria-hidden
                />
              )}
              <StepDot
                n={n}
                isDone={isDone}
                isCurrent={Boolean(isCurrent)}
              />
              <div className="min-w-0 flex-1 pt-1.5">
                <p
                  className={`text-base font-semibold leading-snug sm:text-sm ${
                    isCurrent || isDone ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {label}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
