import { JobActionButtons } from "@/app/admin/job-action-buttons";
import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { isAdminEmail } from "@/lib/admin-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Auth + Supabase admin client — must run on the server for each request. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: verifyProfile, error: verifyErr } = await supabase
    .from("profiles")
    .select("email_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!isEmailVerifiedForApp(verifyErr ? null : verifyProfile, user)) {
    const q = new URLSearchParams({ pending: "1" });
    if (user.email) q.set("email", user.email);
    redirect(`/auth/verify-email?${q.toString()}`);
  }

  if (!user?.email || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  const { data: disputed } = await admin
    .from("jobs")
    .select(
      "id, airport, terminal, line_type, offered_price, status, customer_email, waiter_email, created_at, completed_at"
    )
    .eq("status", "disputed")
    .order("created_at", { ascending: false });

  const { count: totalUsers } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: completedJobs } = await admin
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  const { count: activeJobs } = await admin
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .in("status", [
      "open",
      "accepted",
      "at_airport",
      "in_line",
      "near_front",
      "pending_confirmation",
    ]);

  const { data: completedRows } = await admin
    .from("jobs")
    .select("offered_price, payout_transfer_id")
    .eq("status", "completed");

  let platformRevenue = 0;
  for (const row of completedRows ?? []) {
    if (row.payout_transfer_id) {
      platformRevenue += Number(row.offered_price) * 0.2;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
      <p className="mt-2 text-sm text-slate-600">
        Signed in as {user.email}. Disputed bookings and platform stats.
      </p>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Platform revenue (est.)" value={`$${platformRevenue.toFixed(2)}`} />
        <StatCard label="Bookings completed" value={String(completedJobs ?? 0)} />
        <StatCard label="Active bookings" value={String(activeJobs ?? 0)} />
        <StatCard label="Total users" value={String(totalUsers ?? 0)} />
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-slate-900">Disputed bookings</h2>
        {(!disputed || disputed.length === 0) && (
          <p className="mt-3 text-slate-600">No disputed bookings.</p>
        )}
        {disputed && disputed.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Line Holder</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {disputed.map((j) => (
                  <tr key={j.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {j.id.slice(0, 8)}…
                      <br />
                      <span className="text-slate-500">
                        {j.airport} · {j.line_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{j.customer_email ?? "—"}</td>
                    <td className="px-4 py-3">{j.waiter_email ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold">
                      ${Number(j.offered_price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(j.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <JobActionButtons jobId={j.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
