import { WaiterPayoutConnectForm } from "@/app/dashboard/waiter/waiter-payout-connect-form";
import { SetupResendVerificationEmail } from "@/app/dashboard/waiter/setup-resend-verification";
import Link from "next/link";

type Props = {
  userEmail: string;
  emailVerified: boolean;
  profileBasicsComplete: boolean;
  hasAirports: boolean;
  hasPayouts: boolean;
};

const todo =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 bg-white text-xs font-bold text-amber-900";

export function LineHolderSetupChecklist({
  userEmail,
  emailVerified,
  profileBasicsComplete,
  hasAirports,
  hasPayouts,
}: Props) {
  const verifyEmailHref = `/auth/verify-email?pending=1&intent=waiter&email=${encodeURIComponent(userEmail)}`;

  const show =
    !emailVerified ||
    !profileBasicsComplete ||
    !hasAirports ||
    !hasPayouts;

  if (!show) return null;

  type RowKey = "email" | "profile" | "airports" | "payouts";
  const visible: RowKey[] = [];
  if (!emailVerified) visible.push("email");
  if (!profileBasicsComplete) visible.push("profile");
  if (!hasAirports) visible.push("airports");
  if (!hasPayouts) visible.push("payouts");

  return (
    <section
      className="mt-7 space-y-3 sm:mt-8"
      aria-labelledby="line-holder-setup-checklist-heading"
    >
      <div className="flex items-center gap-2">
        <h2
          id="line-holder-setup-checklist-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500"
        >
          Finish setup
        </h2>
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
          aria-hidden
        />
      </div>
      <p className="text-sm leading-relaxed text-slate-600">
        Complete these steps so you can accept bookings and get paid without
        interruptions.
      </p>

      <ol className="space-y-3">
        {visible.map((key, i) => {
          const n = i + 1;
          if (key === "email") {
            return (
              <li
                key="email"
                className="rounded-2xl border border-amber-200/90 border-l-[4px] border-l-amber-500 bg-amber-50/70 p-4 shadow-sm sm:p-5"
              >
                <div className="flex gap-3">
                  <span className={todo} aria-hidden>
                    {n}
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <h3 className="text-base font-semibold leading-snug text-amber-950">
                        Verify your email
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-amber-950/85">
                        Verify your email to activate your account and unlock Line
                        Holder features.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
                      <Link
                        href={verifyEmailHref}
                        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 active:bg-amber-800 sm:w-auto sm:min-w-[10rem]"
                      >
                        Verify email
                      </Link>
                      <SetupResendVerificationEmail />
                    </div>
                  </div>
                </div>
              </li>
            );
          }
          if (key === "profile") {
            return (
              <li
                key="profile"
                className="rounded-2xl border border-amber-200/90 border-l-[4px] border-l-amber-500 bg-gradient-to-br from-amber-50 to-amber-50/40 p-4 shadow-sm sm:p-5"
              >
                <div className="flex gap-3">
                  <span className={todo} aria-hidden>
                    {n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold leading-snug text-amber-950">
                      Complete your Line Holder profile
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-amber-950/85">
                      Add your photo, phone number, and service details so
                      customers can trust you.
                    </p>
                    <Link
                      href="/dashboard/profile"
                      className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-amber-400/50 bg-white px-5 py-3 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-100/60 active:bg-amber-100 sm:w-auto sm:min-w-[200px]"
                    >
                      Complete profile
                    </Link>
                  </div>
                </div>
              </li>
            );
          }
          if (key === "airports") {
            return (
              <li
                key="airports"
                className="rounded-2xl border border-amber-200/90 border-l-[4px] border-l-amber-500 bg-gradient-to-br from-amber-50 to-amber-50/40 p-4 shadow-sm sm:p-5"
              >
                <div className="flex gap-3">
                  <span className={todo} aria-hidden>
                    {n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold leading-snug text-amber-950">
                      Select your airports
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-amber-950/85">
                      Choose where you&apos;re available so we can show you nearby
                      available bookings.
                    </p>
                    <Link
                      href="/dashboard/waiter/airports"
                      className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-amber-400/50 bg-white px-5 py-3 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-100/60 active:bg-amber-100 sm:w-auto sm:min-w-[200px]"
                    >
                      Edit my airports
                    </Link>
                  </div>
                </div>
              </li>
            );
          }
          return (
            <li
              key="payouts"
              className="rounded-2xl border border-amber-200/90 border-l-[4px] border-l-amber-500 bg-amber-50/70 p-4 shadow-sm sm:p-5"
            >
              <div className="flex gap-3">
                <span className={todo} aria-hidden>
                  {n}
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <h3 className="text-base font-semibold leading-snug text-amber-950">
                      Set up payouts
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-amber-950/85">
                      Connect payouts to get paid for completed bookings. Add your
                      bank details through Stripe — you&apos;ll need this before
                      marking a booking complete.
                    </p>
                  </div>
                  <WaiterPayoutConnectForm
                    buttonClassName="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-slate-900/10 transition hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 sm:w-auto sm:min-w-[12rem]"
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-slate-500">
        Tip: You can also use the full{" "}
        <span className="font-medium text-slate-600">Payouts</span> section below
        for details and to update Stripe later.
      </p>
    </section>
  );
}
