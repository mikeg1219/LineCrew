import {
  getLineHolderHandoffGuidance,
  type HandoffGuidanceTone,
} from "@/lib/handoff-guidance";
import type { JobStatus } from "@/lib/types/job";
import Link from "next/link";

function toneShell(tone: HandoffGuidanceTone): string {
  switch (tone) {
    case "urgent":
      return "border-amber-500 bg-gradient-to-br from-amber-50 via-orange-50/90 to-white shadow-lg ring-2 ring-amber-500/60";
    case "muted":
      return "border-slate-200/90 bg-slate-50/90 ring-1 ring-slate-900/5";
    case "success":
      return "border-emerald-400/90 bg-gradient-to-br from-emerald-50 to-white ring-2 ring-emerald-300/50 shadow-md";
    default:
      return "border-blue-200/80 bg-gradient-to-br from-blue-50/90 via-white to-white ring-1 ring-blue-100/80";
  }
}

export function LineHolderHandoffGuidanceCard({
  status,
  terminal,
  isOpenPreview,
  exactLocation,
  airportLabelText,
}: {
  status: JobStatus;
  terminal: string;
  isOpenPreview: boolean;
  exactLocation: string | null;
  airportLabelText: string;
}) {
  const g = getLineHolderHandoffGuidance(status, terminal, isOpenPreview);
  if (!g) return null;

  const showLoc =
    g.highlightLocation &&
    (terminal?.trim() || exactLocation?.trim());

  return (
    <section
      id="booking-handoff-guidance"
      className={`scroll-mt-28 rounded-2xl border p-5 sm:p-6 ${toneShell(g.tone)}`}
      aria-labelledby="line-holder-handoff-guidance-title"
    >
      {g.tone === "urgent" ? (
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
          Pre-handoff
        </p>
      ) : null}
      <h2
        id="line-holder-handoff-guidance-title"
        className={`text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl ${
          g.tone === "urgent" ? "mt-1" : ""
        }`}
      >
        {g.heading}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-800 sm:text-base">
        {g.instruction}
      </p>

      {showLoc ? (
        <div className="mt-4 rounded-xl border-2 border-amber-300/80 bg-white/95 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-900/90">
            Where to go
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {airportLabelText}
            {terminal?.trim() ? (
              <span className="text-slate-700">
                {" "}
                · Terminal {terminal.trim()}
              </span>
            ) : null}
          </p>
          {exactLocation?.trim() ? (
            <p className="mt-2 text-sm font-medium leading-snug text-slate-800">
              {exactLocation.trim()}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {g.actions.map((a) => (
          <Link
            key={`${a.href}-${a.label}`}
            href={a.href}
            className={`inline-flex min-h-[52px] flex-1 touch-manipulation items-center justify-center rounded-2xl px-5 text-center text-base font-semibold transition active:scale-[0.99] sm:min-w-[140px] sm:flex-initial ${
              a.emphasis
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 hover:bg-blue-700"
                : "border-2 border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50"
            }`}
          >
            {a.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
