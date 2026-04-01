import type { Job } from "@/lib/types/job";

function formatTs(v: string | null | undefined): string {
  if (!v) return "—";
  return new Date(v).toLocaleString();
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-medium text-slate-800">{value}</p>
    </div>
  );
}

export function HandoffAuditPanel({ job }: { job: Job }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Handoff audit trail</h3>
      <p className="mt-1 text-xs text-slate-600">
        Security timestamps for verification and dispute review.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Chip label="Worker ready" value={formatTs(job.worker_ready_at)} />
        <Chip label="Customer arrived" value={formatTs(job.customer_arrived_at)} />
        <Chip label="QR expires" value={formatTs(job.handoff_qr_expires_at)} />
        <Chip label="QR scanned" value={formatTs(job.qr_scanned_at)} />
        <Chip label="QR used at" value={formatTs(job.handoff_qr_used_at)} />
        <Chip label="Worker confirmed" value={formatTs(job.worker_confirmed_at)} />
        <Chip label="Customer confirmed" value={formatTs(job.customer_confirmed_at)} />
        <Chip
          label="Handoff method"
          value={job.handoff_method ? job.handoff_method.toUpperCase() : "—"}
        />
        <Chip
          label="Proximity passed"
          value={job.proximity_passed ? "Yes" : "No / not yet"}
        />
        <Chip
          label="Completion location"
          value={job.completion_location ?? "—"}
        />
        <Chip
          label="Verify attempts"
          value={String(job.handoff_verification_attempts ?? 0)}
        />
        <Chip
          label="Confidence score"
          value={
            job.handoff_confidence_score != null
              ? `${job.handoff_confidence_score}/100`
              : "—"
          }
        />
      </div>
      {job.handoff_issue_flag && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
          Issue flagged: {job.handoff_issue_reason ?? "No reason provided"}
        </div>
      )}
    </section>
  );
}
