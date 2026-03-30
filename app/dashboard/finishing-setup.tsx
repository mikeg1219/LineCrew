/** Stable fallback when profile row is missing or not ready — do not redirect to /dashboard (avoids loops with role subpaths). */
export function DashboardFinishingSetup({
  userEmail,
  errorMessage,
}: {
  userEmail: string;
  errorMessage?: string | null;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Finishing setup
      </h1>
      <p className="mt-3 text-slate-600">
        {errorMessage
          ? errorMessage
          : "Your profile row isn’t ready yet. This usually resolves after a few seconds — refresh the page. If it keeps happening, confirm the database trigger in Supabase ran for new users."}
      </p>
      <p className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <span className="font-medium text-slate-800">Signed in as</span>{" "}
        {userEmail}
      </p>
    </div>
  );
}
