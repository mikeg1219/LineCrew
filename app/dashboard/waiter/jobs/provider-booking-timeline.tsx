import type { ProviderTimelineEvent } from "@/lib/provider-booking";

function formatWhen(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

export function ProviderBookingTimeline({
  events,
}: {
  events: ProviderTimelineEvent[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 sm:p-7">
      <h2 className="text-base font-semibold tracking-tight text-slate-900">
        Updates
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Recent milestones for this booking.
      </p>
      <ol className="relative mt-6 space-y-0 border-l border-slate-200 pl-5 sm:pl-6">
        {events.map((ev) => {
          const when = formatWhen(ev.timestamp);
          return (
            <li key={ev.id} className="relative pb-8 last:pb-0">
              <span
                className={`absolute -left-[1.4rem] top-1.5 flex size-3 rounded-full ring-4 ring-white ${
                  ev.tone === "highlight"
                    ? "bg-blue-600"
                    : ev.tone === "muted"
                      ? "bg-slate-300"
                      : "bg-slate-400"
                }`}
                aria-hidden
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {ev.title}
                </p>
                {when && (
                  <p className="mt-0.5 text-xs text-slate-500">{when}</p>
                )}
                {ev.detail && (
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {ev.detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
