import Link from "next/link";

export function BookingSessionExpired() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Your booking session expired
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          For your security, unfinished bookings are only held for a short time.
          Start again to enter your request and continue to checkout.
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard/customer/post-job"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
          >
            Start over
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-slate-600 sm:text-left">
          <Link
            href="/dashboard/customer"
            className="font-medium text-blue-700 hover:text-blue-800"
          >
            ← Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
