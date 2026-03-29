import { JOB_STATUS_LABELS, statusBadgeClass } from "@/lib/job-status";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus } from "@/lib/types/job";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";

export default async function CustomerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, avatar_url, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/dashboard");
  if (profile.role === "waiter") redirect("/dashboard/waiter");

  let avatarUrl = null;
  if (profile.avatar_url) {
    const { data } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
    avatarUrl = data.publicUrl;
  }

  const { data: jobRows } = await supabase
    .from("jobs")
    .select("id, status, airport, line_type, offered_price, created_at")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const jobs = (jobRows ?? []) as Pick<Job, "id" | "status" | "airport" | "line_type" | "offered_price" | "created_at">[];

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", paddingTop: "60px", paddingBottom: "80px" }}>
      <NavBar role="customer" avatarUrl={avatarUrl} fullName={profile.full_name} />

      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Welcome back{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Signed in as <span className="font-medium text-slate-900">{user.email}</span>
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard/customer/post-job"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Book Now
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Edit profile
          </Link>
        </div>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-slate-900">Your bookings</h2>
          {jobs.length === 0 ? (
            <p className="mt-3 text-slate-600">You haven&apos;t created a booking yet. Book one to get matched with a Line Holder.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {jobs.map((job) => {
                const st = job.status as JobStatus;
                return (
                  <li key={job.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div>
                      <p className="font-medium text-slate-900">{job.airport} · {job.line_type}</p>
                      <p className="text-sm text-slate-600">${Number(job.offered_price).toFixed(2)} · {new Date(job.created_at).toLocaleString()}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(st)}`}>
                        {JOB_STATUS_LABELS[st]}
                      </span>
                    </div>
                    <Link href={`/dashboard/customer/jobs/${job.id}`} className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100">
                      Track booking
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
