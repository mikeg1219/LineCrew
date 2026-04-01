"use client";

import { FraudReviewActionButton } from "@/app/admin/fraud-review-action-button";
import { useEffect, useMemo, useState } from "react";

type FraudRow = {
  id: string;
  status: string;
  airport: string | null;
  line_type: string | null;
  customer_email: string | null;
  waiter_email: string | null;
  handoff_issue_flag: boolean | null;
  handoff_issue_reason: string | null;
  handoff_confidence_score: number | null;
  handoff_verification_attempts: number | null;
  handoff_escalated_at: string | null;
  handoff_reviewed_at: string | null;
  created_at: string;
};

function toCsv(rows: FraudRow[]): string {
  const header = [
    "job_id",
    "status",
    "airport",
    "line_type",
    "customer_email",
    "waiter_email",
    "issue_flag",
    "issue_reason",
    "confidence_score",
    "verification_attempts",
    "escalated_at",
    "reviewed_at",
    "created_at",
  ];
  const lines = rows.map((r) =>
    [
      r.id,
      r.status,
      r.airport ?? "",
      r.line_type ?? "",
      r.customer_email ?? "",
      r.waiter_email ?? "",
      r.handoff_issue_flag ? "true" : "false",
      r.handoff_issue_reason ?? "",
      r.handoff_confidence_score ?? "",
      r.handoff_verification_attempts ?? 0,
      r.handoff_escalated_at ?? "",
      r.handoff_reviewed_at ?? "",
      r.created_at,
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function badge(createdAt: string): { label: string; className: string } {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(ageMs / (1000 * 60 * 60));
  if (hours >= 24) return { label: "SLA breached", className: "bg-red-100 text-red-800" };
  if (hours >= 12) return { label: "SLA warning", className: "bg-amber-100 text-amber-800" };
  return { label: "Within SLA", className: "bg-emerald-100 text-emerald-800" };
}

export function FraudReviewQueueCard({
  rows,
  nowIso,
}: {
  rows: FraudRow[];
  nowIso: string;
}) {
  const [unreviewedOnly, setUnreviewedOnly] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const raw = localStorage.getItem("linecrew_fraud_filter_preset");
      if (!raw) return true;
      const p = JSON.parse(raw) as { unreviewedOnly?: boolean };
      return p.unreviewedOnly ?? true;
    } catch {
      return true;
    }
  });
  const [escalatedOnly, setEscalatedOnly] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("linecrew_fraud_filter_preset");
      if (!raw) return false;
      const p = JSON.parse(raw) as { escalatedOnly?: boolean };
      return p.escalatedOnly ?? false;
    } catch {
      return false;
    }
  });
  const [lowConfidenceOnly, setLowConfidenceOnly] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("linecrew_fraud_filter_preset");
      if (!raw) return false;
      const p = JSON.parse(raw) as { lowConfidenceOnly?: boolean };
      return p.lowConfidenceOnly ?? false;
    } catch {
      return false;
    }
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    localStorage.setItem(
      "linecrew_fraud_filter_preset",
      JSON.stringify({ unreviewedOnly, escalatedOnly, lowConfidenceOnly })
    );
  }, [unreviewedOnly, escalatedOnly, lowConfidenceOnly]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (unreviewedOnly && r.handoff_reviewed_at) return false;
      if (escalatedOnly && !r.handoff_escalated_at) return false;
      if (lowConfidenceOnly && (r.handoff_confidence_score ?? 100) >= 60) return false;
      return true;
    });
  }, [rows, unreviewedOnly, escalatedOnly, lowConfidenceOnly]);

  const kpis = useMemo(() => {
    const now = new Date(nowIso).getTime();
    const startOfToday = new Date(nowIso);
    startOfToday.setHours(0, 0, 0, 0);
    const startMs = startOfToday.getTime();

    const openEscalations = rows.filter(
      (r) => Boolean(r.handoff_escalated_at) && !r.handoff_reviewed_at
    ).length;
    const reviewedToday = rows.filter((r) => {
      if (!r.handoff_reviewed_at) return false;
      const t = new Date(r.handoff_reviewed_at).getTime();
      return Number.isFinite(t) && t >= startMs;
    }).length;
    const confidenceValues = rows
      .map((r) => r.handoff_confidence_score)
      .filter((v): v is number => typeof v === "number");
    const avgConfidence =
      confidenceValues.length > 0
        ? Math.round(
            confidenceValues.reduce((sum, v) => sum + v, 0) / confidenceValues.length
          )
        : 0;
    const breachCount = rows.filter((r) => {
      const base = r.handoff_escalated_at ?? r.created_at;
      const ageMs = now - new Date(base).getTime();
      const hours = Math.floor(ageMs / (1000 * 60 * 60));
      return hours >= 24 && !r.handoff_reviewed_at;
    }).length;

    return { openEscalations, reviewedToday, avgConfidence, breachCount };
  }, [rows, nowIso]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Open escalations
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{kpis.openEscalations}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Reviewed today
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{kpis.reviewedToday}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Avg confidence
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{kpis.avgConfidence}/100</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            SLA breaches
          </p>
          <p className="mt-1 text-xl font-semibold text-red-700">{kpis.breachCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setUnreviewedOnly((v) => !v);
            setPage(1);
          }}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            unreviewedOnly ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          Unreviewed only
        </button>
        <button
          type="button"
          onClick={() => {
            setEscalatedOnly((v) => !v);
            setPage(1);
          }}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            escalatedOnly ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          Escalated only
        </button>
        <button
          type="button"
          onClick={() => {
            setLowConfidenceOnly((v) => !v);
            setPage(1);
          }}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            lowConfidenceOnly ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          Low confidence only
        </button>
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              `linecrew-fraud-review-${new Date().toISOString().slice(0, 10)}.csv`,
              toCsv(filtered)
            )
          }
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => {
            const url = new URL("/api/admin/fraud-review-export", window.location.origin);
            url.searchParams.set("unreviewedOnly", String(unreviewedOnly));
            url.searchParams.set("escalatedOnly", String(escalatedOnly));
            url.searchParams.set("lowConfidenceOnly", String(lowConfidenceOnly));
            window.open(url.toString(), "_blank");
          }}
          className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"
        >
          Export all matching (server)
        </button>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-600">No fraud-review items match current filters.</p>
      )}

      {filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Risk Signals</th>
                <th className="px-4 py-3">People</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">SLA</th>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map((j) => {
                const score = j.handoff_confidence_score;
                const attempts = j.handoff_verification_attempts ?? 0;
                const issue = Boolean(j.handoff_issue_flag);
                const reviewed = Boolean(j.handoff_reviewed_at);
                const sla = badge(j.handoff_escalated_at ?? j.created_at);
                return (
                  <tr key={`fraud-${j.id}`}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {j.id.slice(0, 8)}…
                      <br />
                      <span className="text-slate-500">
                        {j.airport} · {j.line_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-xs">
                        <p>
                          Confidence:{" "}
                          <span
                            className={`font-semibold ${
                              score == null
                                ? "text-slate-600"
                                : score < 60
                                  ? "text-red-700"
                                  : "text-emerald-700"
                            }`}
                          >
                            {score == null ? "—" : `${score}/100`}
                          </span>
                        </p>
                        <p>
                          Attempts:{" "}
                          <span
                            className={`font-semibold ${
                              attempts >= 4 ? "text-red-700" : "text-slate-700"
                            }`}
                          >
                            {attempts}
                          </span>
                        </p>
                        <p>
                          Issue flag:{" "}
                          <span
                            className={`font-semibold ${issue ? "text-red-700" : "text-slate-700"}`}
                          >
                            {issue ? j.handoff_issue_reason || "Yes" : "No"}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {j.customer_email ?? "—"}
                      <br />
                      {j.waiter_email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">{j.status}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`rounded-full px-2 py-1 font-semibold ${sla.className}`}>
                        {sla.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {reviewed ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">
                          Reviewed
                        </span>
                      ) : (
                        <FraudReviewActionButton jobId={j.id} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(j.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            Page {safePage} of {totalPages} ({filtered.length} results)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
