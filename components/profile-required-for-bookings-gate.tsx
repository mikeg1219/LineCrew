import Link from "next/link";

/**
 * Shown when the user is signed in but has not completed a minimal profile yet.
 */
export function ProfileRequiredForBookingsGate({
  role,
  userEmail,
}: {
  role: "customer" | "waiter";
  userEmail: string;
}) {
  const isWaiter = role === "waiter";
  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
      <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {isWaiter ? "Finish your profile first" : "Complete your profile to book"}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">
        {isWaiter
          ? "Add your name, phone, and basic details in Profile before you browse bookings or see active jobs."
          : "Add your name, phone, and basic details in Profile before you book a Line Holder or view booking tools."}
      </p>
      <div className="mt-8">
        <Link
          href="/dashboard/profile"
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
        >
          Go to Profile
        </Link>
      </div>
      <p className="mt-8 text-sm text-slate-500">
        Signed in as{" "}
        <span className="font-medium text-slate-700">{userEmail}</span>
      </p>
    </div>
  );
}
