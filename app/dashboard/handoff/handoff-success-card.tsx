import Link from "next/link";

export function HandoffSuccessCard({
  role,
  jobId,
  offeredPrice,
  payoutTransferId,
}: {
  role: "customer" | "waiter";
  jobId: string;
  offeredPrice: number;
  payoutTransferId?: string | null;
}) {
  const payoutReady = Boolean(payoutTransferId);
  return (
    <section className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-md ring-1 ring-emerald-200">
      <h3 className="text-lg font-semibold text-emerald-900">Handoff completed</h3>
      <p className="mt-1 text-sm text-emerald-900/90">
        {role === "customer"
          ? "Your queue transfer is complete. Thanks for using LineCrew.ai."
          : "Great work. Queue transfer is confirmed and booking is complete."}
      </p>
      <div className="mt-3 grid gap-2 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-slate-700 sm:grid-cols-2">
        <p>
          Job: <span className="font-mono text-xs">{jobId.slice(0, 8)}…</span>
        </p>
        <p>
          Amount: <span className="font-semibold">${offeredPrice.toFixed(2)}</span>
        </p>
        <p className="sm:col-span-2">
          {role === "customer"
            ? `Payment status: ${payoutReady ? "Released to line holder" : "Processing release"}`
            : `Payout status: ${payoutReady ? "Transfer created" : "Pending release policy window"}`}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={role === "customer" ? "/dashboard/customer" : "/dashboard/waiter"}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Done
        </Link>
        <button
          type="button"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          title="Rating flow placeholder"
        >
          Rate experience
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          title="Support flow placeholder"
        >
          Need help
        </button>
      </div>
    </section>
  );
}
