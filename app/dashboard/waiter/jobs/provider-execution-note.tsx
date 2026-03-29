export function ProviderExecutionNote() {
  return (
    <aside className="rounded-3xl border border-slate-200/90 bg-slate-50/90 p-5 text-sm leading-relaxed text-slate-700 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Execution tips
      </h2>
      <ul className="mt-3 list-outside list-disc space-y-2 pl-4 marker:text-slate-400 sm:space-y-2.5">
        <li>Update status as you move through each phase so the customer stays informed.</li>
        <li>Follow the exact location and terminal details—customers rely on them.</li>
        <li>Be ready for handoff when you mark &quot;Ready for handoff&quot;; the customer will confirm.</li>
      </ul>
    </aside>
  );
}
