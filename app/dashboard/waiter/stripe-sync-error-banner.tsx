import Link from "next/link";

/** Server or client — static markup for Stripe→DB sync failures on waiter surfaces. */
export function WaiterStripeSyncErrorBanner({
  message,
  afterStripeRedirect,
  /** Browse bookings has no Payouts block — link to dashboard instead. */
  footerVariant = "default",
}: {
  message: string;
  /** Copy tuned for ?connect=return|refresh */
  afterStripeRedirect?: boolean;
  footerVariant?: "default" | "linkToDashboard";
}) {
  return (
    <div
      className="mt-6 rounded-xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm leading-relaxed text-red-950 shadow-sm sm:mt-7"
      role="alert"
    >
      <p className="font-medium">Payout status didn&apos;t sync</p>
      <p className="mt-1.5 text-red-900/95">
        {afterStripeRedirect
          ? `We couldn't confirm your payout status after returning from Stripe. ${message}`
          : `Couldn't refresh your Stripe payout status. ${message}`}
      </p>
      {footerVariant === "linkToDashboard" ? (
        <p className="mt-2 text-xs text-red-800/90">
          Go to{" "}
          <Link
            href="/dashboard/waiter"
            className="font-semibold text-red-950 underline decoration-red-800/30 underline-offset-2 hover:text-red-900"
          >
            your dashboard
          </Link>{" "}
          and tap{" "}
          <span className="font-semibold text-red-950">Refresh Stripe status now</span>{" "}
          in Payouts, or open{" "}
          <Link
            href="/dashboard/profile"
            className="font-semibold text-red-950 underline decoration-red-800/30 underline-offset-2 hover:text-red-900"
          >
            Profile
          </Link>
          .
        </p>
      ) : (
        <p className="mt-2 text-xs text-red-800/90">
          Try{" "}
          <span className="font-semibold text-red-950">
            Refresh Stripe status now
          </span>{" "}
          in the Payouts section below, or open{" "}
          <span className="font-semibold text-red-950">Profile</span> to retry.
        </p>
      )}
    </div>
  );
}
