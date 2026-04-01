import { JobActionButtons } from "@/app/admin/job-action-buttons";
import { OwnerDashboardControls } from "@/app/admin/owner-dashboard-controls";
import { OwnerOperationsMap } from "@/app/admin/owner-operations-map";
import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { isAdminEmail } from "@/lib/admin-config";
import {
  BOOKING_CATEGORIES,
  getBookingCategoryForLineType,
  type BookingCategory,
} from "@/lib/jobs/options";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

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
    .select("*")
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
    .select("offered_price, payout_transfer_id, created_at, completed_at")
    .eq("status", "completed");

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now);
  startOfMonth.setDate(now.getDate() - 30);

  const todayIso = startOfToday.toISOString();
  const weekIso = startOfWeek.toISOString();
  const monthIso = startOfMonth.toISOString();

  const { count: totalRequestsTodayCount } = await admin
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayIso);

  const { count: completedTodayCount } = await admin
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("completed_at", todayIso);

  const { data: openRows } = await admin
    .from("jobs")
    .select("id, created_at")
    .eq("status", "open");

  const staleOpenCount = (openRows ?? []).filter((row) => {
    const created = new Date(row.created_at).getTime();
    return Number.isFinite(created) && now.getTime() - created > 15 * 60 * 1000;
  }).length;

  let revenueToday = 0;
  let revenueWeek = 0;
  let revenueMonth = 0;
  let platformRevenueMonth = 0;
  let payoutsMonth = 0;
  let completedCountForAvg = 0;
  let completionMinutesTotal = 0;
  for (const row of completedRows ?? []) {
    const offered = Number(row.offered_price) || 0;
    const completedAt = row.completed_at ? new Date(row.completed_at) : null;
    const createdAt = row.created_at ? new Date(row.created_at) : null;
    if (completedAt) {
      const cIso = completedAt.toISOString();
      if (cIso >= todayIso) revenueToday += offered;
      if (cIso >= weekIso) revenueWeek += offered;
      if (cIso >= monthIso) revenueMonth += offered;
    }
    if (row.payout_transfer_id) {
      const fee = offered * 0.2;
      if (completedAt && completedAt.toISOString() >= monthIso) {
        platformRevenueMonth += fee;
      }
      payoutsMonth += offered * 0.8;
    }
    if (createdAt && completedAt) {
      const mins = (completedAt.getTime() - createdAt.getTime()) / (1000 * 60);
      if (Number.isFinite(mins) && mins >= 0) {
        completionMinutesTotal += mins;
        completedCountForAvg += 1;
      }
    }
  }

  const avgFulfillmentMinutes =
    completedCountForAvg > 0
      ? Math.round(completionMinutesTotal / completedCountForAvg)
      : 0;

  const { count: cancellationsWeekCount } = await admin
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("status", "cancelled")
    .gte("created_at", weekIso);

  const { count: disputesWeekCount } = await admin
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("status", "disputed")
    .gte("created_at", weekIso);

  const { data: recentJobs } = await admin
    .from("jobs")
    .select("id, status, airport, line_type, offered_price, created_at, completed_at, waiter_email")
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: recentMonthJobs } = await admin
    .from("jobs")
    .select("id, status, airport, line_type, offered_price, created_at, waiter_id")
    .gte("created_at", monthIso)
    .order("created_at", { ascending: false })
    .limit(1500);

  const { data: waiterProfiles } = await admin
    .from("profiles")
    .select(
      "id, first_name, last_name, full_name, display_name, average_rating, jobs_completed, is_available, serving_airports, preferred_categories"
    )
    .eq("role", "waiter")
    .limit(300);

  const activityFeed = (recentJobs ?? []).slice(0, 6).map((job) => {
    const ts = new Date(job.created_at).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    if (job.status === "completed") {
      return `Job completed: ${job.airport} ${job.line_type} · $${Number(job.offered_price).toFixed(2)} (${ts})`;
    }
    if (job.status === "accepted" || job.status === "at_airport" || job.status === "in_line") {
      return `Job accepted/in progress: ${job.airport} ${job.line_type} (${ts})`;
    }
    if (job.status === "open") {
      return `Job requested: ${job.airport} ${job.line_type} (${ts})`;
    }
    if (job.status === "cancelled") {
      return `Job cancelled: ${job.airport} ${job.line_type} (${ts})`;
    }
    if (job.status === "disputed") {
      return `Issue opened: disputed booking ${job.id.slice(0, 8)}… (${ts})`;
    }
    return `Activity: ${job.status} at ${job.airport} (${ts})`;
  });

  const totalRequestsToday = totalRequestsTodayCount ?? 0;
  const completedToday = completedTodayCount ?? 0;
  const activeToday = activeJobs ?? 0;
  const unfulfilledToday = staleOpenCount;

  const requestCountsByCategory = new Map<BookingCategory, number>();
  const requestCountsByAirport = new Map<string, number>();
  const acceptedByCategory = new Map<BookingCategory, number>();
  for (const c of BOOKING_CATEGORIES) {
    requestCountsByCategory.set(c, 0);
    acceptedByCategory.set(c, 0);
  }
  const requestsByDay = new Map<string, number>();
  const revenueByDay = new Map<string, number>();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    requestsByDay.set(key, 0);
    revenueByDay.set(key, 0);
  }

  for (const job of recentMonthJobs ?? []) {
    const category = getBookingCategoryForLineType(job.line_type ?? "");
    requestCountsByCategory.set(
      category,
      (requestCountsByCategory.get(category) ?? 0) + 1
    );
    const airport = (job.airport ?? "Unknown").toUpperCase();
    requestCountsByAirport.set(airport, (requestCountsByAirport.get(airport) ?? 0) + 1);
    if (job.status !== "open") {
      acceptedByCategory.set(
        category,
        (acceptedByCategory.get(category) ?? 0) + 1
      );
    }
    const dayKey = new Date(job.created_at).toISOString().slice(0, 10);
    if (requestsByDay.has(dayKey)) {
      requestsByDay.set(dayKey, (requestsByDay.get(dayKey) ?? 0) + 1);
      if (job.status === "completed") {
        revenueByDay.set(
          dayKey,
          (revenueByDay.get(dayKey) ?? 0) + (Number(job.offered_price) || 0)
        );
      }
    }
  }

  const airportToCity: Record<string, string> = {
    MCO: "Orlando",
    ATL: "Atlanta",
    JFK: "New York",
    LAX: "Los Angeles",
    ORD: "Chicago",
    DFW: "Dallas",
    MIA: "Miami",
    SEA: "Seattle",
    DEN: "Denver",
    CLT: "Charlotte",
  };

  const airportToCoord: Record<string, { lat: number; lon: number }> = {
    MCO: { lat: 28.4312, lon: -81.3081 },
    ATL: { lat: 33.6407, lon: -84.4277 },
    JFK: { lat: 40.6413, lon: -73.7781 },
    LAX: { lat: 33.9416, lon: -118.4085 },
    ORD: { lat: 41.9742, lon: -87.9073 },
    DFW: { lat: 32.8998, lon: -97.0403 },
    MIA: { lat: 25.7959, lon: -80.287 },
    SEA: { lat: 47.4502, lon: -122.3088 },
    DEN: { lat: 39.8561, lon: -104.6737 },
    CLT: { lat: 35.2144, lon: -80.9473 },
    LAS: { lat: 36.084, lon: -115.1537 },
    EWR: { lat: 40.6895, lon: -74.1745 },
    BOS: { lat: 42.3656, lon: -71.0096 },
    IAH: { lat: 29.9902, lon: -95.3368 },
    PHX: { lat: 33.4342, lon: -112.0116 },
  };

  const locationTotals = new Map<string, number>();
  for (const [airport, count] of requestCountsByAirport.entries()) {
    const city = airportToCity[airport] ?? airport;
    locationTotals.set(city, (locationTotals.get(city) ?? 0) + count);
  }

  const waiters = waiterProfiles ?? [];
  const recentJobsSafe = recentMonthJobs ?? [];
  const activeWaiterIds = new Set(
    (recentMonthJobs ?? [])
      .filter((job) =>
        ["accepted", "at_airport", "in_line", "near_front", "pending_confirmation"].includes(
          job.status
        )
      )
      .map((job) => job.waiter_id)
      .filter(Boolean)
  );
  const availableWaiters = waiters.filter((w) => w.is_available !== false).length;
  const busyWaiters = waiters.filter((w) => activeWaiterIds.has(w.id)).length;

  const activeStatuses = new Set([
    "accepted",
    "at_airport",
    "in_line",
    "near_front",
    "pending_confirmation",
  ]);
  const activeJobsByAirport = new Map<string, number>();
  const unfulfilledByAirport = new Map<string, number>();
  for (const job of recentJobsSafe) {
    const airport = (job.airport ?? "").toUpperCase();
    if (!airport) continue;
    if (activeStatuses.has(job.status)) {
      activeJobsByAirport.set(airport, (activeJobsByAirport.get(airport) ?? 0) + 1);
    }
    if (job.status === "open") {
      const created = new Date(job.created_at).getTime();
      if (Number.isFinite(created) && now.getTime() - created > 15 * 60 * 1000) {
        unfulfilledByAirport.set(airport, (unfulfilledByAirport.get(airport) ?? 0) + 1);
      }
    }
  }

  const availableWaitersByAirport = new Map<string, number>();
  for (const w of waiters) {
    if (w.is_available === false) continue;
    for (const airport of (w.serving_airports ?? []).filter(Boolean)) {
      const code = airport.toUpperCase();
      availableWaitersByAirport.set(code, (availableWaitersByAirport.get(code) ?? 0) + 1);
    }
  }

  type MapMarker = {
    key: string;
    airport: string;
    label: string;
    count: number;
    type: "active" | "available" | "unfulfilled";
    top: string;
    left: string;
  };

  const toMapPosition = (airport: string): { top: string; left: string } | null => {
    const c = airportToCoord[airport];
    if (!c) return null;
    const minLon = -125;
    const maxLon = -66;
    const minLat = 24;
    const maxLat = 50;
    const left = ((c.lon - minLon) / (maxLon - minLon)) * 100;
    const top = (1 - (c.lat - minLat) / (maxLat - minLat)) * 100;
    return {
      left: `${Math.max(6, Math.min(94, left)).toFixed(1)}%`,
      top: `${Math.max(8, Math.min(90, top)).toFixed(1)}%`,
    };
  };

  const buildMarkers = (
    source: Map<string, number>,
    type: "active" | "available" | "unfulfilled",
    prefix: string
  ): MapMarker[] =>
    Array.from(source.entries())
      .map(([airport, count]) => {
        const pos = toMapPosition(airport);
        if (!pos) return null;
        return {
          key: `${type}-${airport}`,
          airport,
          label: `${prefix}: ${airport} (${count})`,
          count,
          type,
          top: pos.top,
          left: pos.left,
        } satisfies MapMarker;
      })
      .filter((m): m is MapMarker => Boolean(m))
      .slice(0, 30);

  const mapMarkers = [
    ...buildMarkers(activeJobsByAirport, "active", "Active jobs"),
    ...buildMarkers(availableWaitersByAirport, "available", "Available"),
    ...buildMarkers(unfulfilledByAirport, "unfulfilled", "Unfulfilled"),
  ];

  const unknownAirportCount =
    Array.from(activeJobsByAirport.keys()).filter((k) => !airportToCoord[k]).length +
    Array.from(availableWaitersByAirport.keys()).filter((k) => !airportToCoord[k]).length +
    Array.from(unfulfilledByAirport.keys()).filter((k) => !airportToCoord[k]).length;

  const topCategories = [
    "Airports",
    "DMV & Government Services",
    "Concerts & Festivals",
    "Retail Drops / Product Launches",
    "Amusement Parks",
    "Restaurants",
    "Sporting Events",
    "Conventions & Expos",
    "Tourist Attractions",
    "Pop-Ups / Brand Activations",
    "Other / Custom Request",
  ] as const;

  const categoryDemand = topCategories.map((name) => {
    const requests = requestCountsByCategory.get(name) ?? 0;
    const supply = Math.max(
      0,
      waiters.filter((w) =>
        (w.serving_airports ?? []).length > 0 || name !== "Airports"
      ).length - busyWaiters
    );
    return { name, requests, supply };
  });

  const waiterPrefCounts = new Map<BookingCategory, number>();
  for (const c of BOOKING_CATEGORIES) waiterPrefCounts.set(c, 0);
  for (const w of waiters) {
    const prefs =
      (w as { preferred_categories?: string[] | null }).preferred_categories ?? [];
    for (const p of prefs) {
      if ((BOOKING_CATEGORIES as readonly string[]).includes(p)) {
        const cat = p as BookingCategory;
        waiterPrefCounts.set(cat, (waiterPrefCounts.get(cat) ?? 0) + 1);
      }
    }
  }
  const preferenceVsAccepted = BOOKING_CATEGORIES.map((category) => ({
    category,
    preferred: waiterPrefCounts.get(category) ?? 0,
    accepted: acceptedByCategory.get(category) ?? 0,
    requested: requestCountsByCategory.get(category) ?? 0,
  }));

  const locationDemand = Array.from(locationTotals.entries())
    .map(([name, requests]) => ({ name, requests }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 4);

  const alerts: { level: "high" | "medium"; text: string }[] = [
    {
      level: unfulfilledToday > 0 ? "high" : "medium",
      text:
        unfulfilledToday > 0
          ? `${unfulfilledToday} open requests are older than 15 minutes`
          : "No stale open requests right now",
    },
    {
      level: activeToday >= 12 ? "high" : "medium",
      text: `${activeToday} active jobs currently in progress`,
    },
    {
      level: (cancellationsWeekCount ?? 0) > 0 ? "high" : "medium",
      text: `${cancellationsWeekCount ?? 0} cancellations in the last 7 days`,
    },
    {
      level: (disputesWeekCount ?? 0) > 0 ? "high" : "medium",
      text: `${disputesWeekCount ?? 0} disputes in the last 7 days`,
    },
  ];

  const revenueBlocks = [
    { label: "Today", value: `$${revenueToday.toFixed(2)}` },
    { label: "This week", value: `$${revenueWeek.toFixed(2)}` },
    { label: "This month", value: `$${revenueMonth.toFixed(2)}` },
    {
      label: "Avg order value",
      value:
        completedRows && completedRows.length > 0
          ? `$${(revenueMonth / Math.max(1, completedRows.length)).toFixed(2)}`
          : "$0.00",
    },
    { label: "Platform fees", value: `$${platformRevenueMonth.toFixed(2)}` },
    { label: "Payouts", value: `$${payoutsMonth.toFixed(2)}` },
    {
      label: "Profit margin",
      value:
        revenueMonth > 0
          ? `${((platformRevenueMonth / revenueMonth) * 100).toFixed(1)}%`
          : "0.0%",
    },
  ] as const;

  const totalRequestsMonth = (recentMonthJobs ?? []).length;
  const totalAcceptedMonth = (recentMonthJobs ?? []).filter((job) => job.status !== "open").length;
  const acceptanceRatePct =
    totalRequestsMonth > 0
      ? Math.round((totalAcceptedMonth / totalRequestsMonth) * 100)
      : 0;

  const trendSeries = Array.from(requestsByDay.entries()).map(([day, requests]) => {
    const revenue = revenueByDay.get(day) ?? 0;
    const categoryScore = Math.min(100, Math.round((requests * 7 + revenue / 8) / 2));
    return { day: day.slice(5), requests, revenue, categoryScore };
  });

  const waiterStats = new Map<
    string,
    { completed: number; total: number; accepted: number; active: boolean }
  >();
  for (const job of recentMonthJobs ?? []) {
    const waiterId = job.waiter_id;
    if (!waiterId) continue;
    const entry = waiterStats.get(waiterId) ?? {
      completed: 0,
      total: 0,
      accepted: 0,
      active: false,
    };
    entry.total += 1;
    if (job.status !== "open") entry.accepted += 1;
    if (job.status === "completed") entry.completed += 1;
    if (
      ["accepted", "at_airport", "in_line", "near_front", "pending_confirmation"].includes(
        job.status
      )
    ) {
      entry.active = true;
    }
    waiterStats.set(waiterId, entry);
  }

  const lineHolders = waiters
    .slice(0, 20)
    .map((w) => {
      const stats = waiterStats.get(w.id) ?? {
        completed: Number(w.jobs_completed ?? 0),
        total: Number(w.jobs_completed ?? 0),
        accepted: Number(w.jobs_completed ?? 0),
        active: false,
      };
      const name =
        w.full_name ||
        w.display_name ||
        [w.first_name, w.last_name].filter(Boolean).join(" ") ||
        `Waiter ${w.id.slice(0, 6)}`;
      const acceptance =
        stats.total > 0 ? `${Math.round((stats.accepted / stats.total) * 100)}%` : "0%";
      const location = (w.serving_airports ?? [])[0] ?? "—";
      const status =
        w.is_available === false ? "paused" : stats.active ? "busy" : "available";
      return {
        id: w.id,
        name,
        status,
        rating: Number(w.average_rating ?? 0),
        jobs: Number(w.jobs_completed ?? stats.completed ?? 0),
        acceptance,
        location,
      };
    })
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-emerald-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            LineCrew.ai Owner Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Signed in as {user.email}. Live operations, revenue, and AI pricing insights.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Total Requests Today" value={String(totalRequestsToday)} />
          <StatCard label="Completed Jobs" value={String(completedToday)} />
          <StatCard label="Active Jobs" value={String(activeToday)} />
          <StatCard label="Unfulfilled Requests" value={String(unfulfilledToday)} />
          <StatCard label="Revenue Today" value={`$${revenueToday.toFixed(2)}`} />
          <StatCard label="Avg Fulfillment Time" value={`${avgFulfillmentMinutes}m`} />
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card title="Live Operations Map" className="xl:col-span-2">
            <OwnerOperationsMap
              markers={mapMarkers}
              unknownAirportCount={unknownAirportCount}
            />
          </Card>
          <Card title="Demand vs Supply">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Demand by category
                </p>
                <div className="mt-2 space-y-2">
                  {categoryDemand.map((row) => (
                    <div key={row.name}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                        <span>{row.name}</span>
                        <span>{row.requests} req / {row.supply} supply</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${Math.min(100, row.requests * 3)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Requests by location
                </p>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  {locationDemand.map((row) => (
                    <p key={row.name} className="flex items-center justify-between">
                      <span>{row.name}</span>
                      <span className="font-medium">{row.requests}</span>
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <p>Active line holders: <span className="font-semibold">{busyWaiters}</span></p>
                <p>Available vs busy: <span className="font-semibold">{availableWaiters} / {busyWaiters}</span></p>
                <p>Acceptance rate: <span className="font-semibold">{acceptanceRatePct}%</span></p>
                <p>Total users: <span className="font-semibold">{totalUsers ?? 0}</span></p>
              </div>
            </div>
          </Card>
        </section>

        <Card title="Preference vs Accepted Categories">
          <p className="mb-3 text-sm text-slate-600">
            Compare where line holders prefer to work versus where accepted jobs are occurring.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Requests</th>
                  <th className="px-3 py-2">Accepted</th>
                  <th className="px-3 py-2">Waiter Preferred</th>
                  <th className="px-3 py-2">Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {preferenceVsAccepted.map((row) => {
                  const gap = row.preferred - row.accepted;
                  return (
                    <tr key={row.category}>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {row.category}
                      </td>
                      <td className="px-3 py-2">{row.requested}</td>
                      <td className="px-3 py-2">{row.accepted}</td>
                      <td className="px-3 py-2">{row.preferred}</td>
                      <td
                        className={`px-3 py-2 font-semibold ${
                          gap < 0 ? "text-red-700" : "text-emerald-700"
                        }`}
                      >
                        {gap}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card title="Alerts & Issues">
            <div className="space-y-2">
              {alerts.map((a) => (
                <p
                  key={a.text}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    a.level === "high"
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {a.text}
                </p>
              ))}
            </div>
          </Card>
          <Card title="Revenue Snapshot" className="xl:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {revenueBlocks.map((item) => (
                <div key={item.label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card title="Trends & Analytics" className="xl:col-span-2">
            <div className="grid gap-4 md:grid-cols-3">
              <MiniTrend title="Requests Over Time" color="bg-blue-500" values={trendSeries.map((d) => d.requests)} />
              <MiniTrend title="Revenue Over Time" color="bg-emerald-500" values={trendSeries.map((d) => Math.round(d.revenue / 25))} />
              <MiniTrend title="Category Performance" color="bg-violet-500" values={trendSeries.map((d) => d.categoryScore)} />
            </div>
          </Card>
          <Card title="Real-time Activity Feed">
            <ul className="space-y-2 text-sm text-slate-700">
              {activityFeed.map((event) => (
                <li key={event} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  {event}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <Card title="Line Holder Management">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Jobs</th>
                  <th className="px-3 py-2">Acceptance</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {lineHolders.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          row.status === "available"
                            ? "bg-emerald-100 text-emerald-800"
                            : row.status === "busy"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">{row.rating.toFixed(1)}</td>
                    <td className="px-3 py-2">{row.jobs}</td>
                    <td className="px-3 py-2">{row.acceptance}</td>
                    <td className="px-3 py-2">{row.location}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          Activate
                        </button>
                        <button className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100">
                          Message
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <OwnerDashboardControls />

        <Card title="Disputed bookings">
          {(!disputed || disputed.length === 0) && (
            <p className="text-sm text-slate-600">No disputed bookings.</p>
          )}
          {disputed && disputed.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
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
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-200/50">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 ${className}`}>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MiniTrend({
  title,
  color,
  values,
}: {
  title: string;
  color: string;
  values: readonly number[];
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-3 flex h-28 items-end gap-1.5">
        {values.map((value, idx) => (
          <div
            key={`${title}-${idx}`}
            className={`w-full rounded-t ${color}`}
            style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
