type StickyAction = {
  href: string;
  label: string;
  /** Primary CTA styling (e.g. Contact / Update status) */
  emphasis?: boolean;
};

type Props = {
  actions: StickyAction[];
};

/**
 * Mobile-only sticky bottom bar. Links scroll to in-page anchors — no duplicate forms.
 * Hidden from `md` so desktop layouts stay clean.
 */
export function MobileBookingStickyBar({ actions }: Props) {
  if (actions.length === 0) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm md:hidden"
      aria-label="Booking quick actions"
    >
      <div className="mx-auto flex max-w-3xl gap-2">
        {actions.map((a) => (
          <a
            key={`${a.href}-${a.label}`}
            href={a.href}
            className={`flex min-h-[50px] min-w-0 flex-1 touch-manipulation items-center justify-center rounded-xl px-1.5 text-center text-[11px] font-semibold leading-tight transition active:scale-[0.99] sm:px-2.5 sm:text-sm ${
              a.emphasis
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25 hover:bg-blue-700"
                : "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50"
            }`}
          >
            {a.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
