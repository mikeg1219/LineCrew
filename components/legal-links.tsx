import Link from "next/link";
import { LEGAL_PATHS } from "@/lib/legal";

/** Single source for footer / inline legal link styling */
export const legalFooterLinkClass =
  "text-slate-500 transition hover:text-slate-800 underline-offset-2 hover:underline";

const linkClass = legalFooterLinkClass;

/** Same link set everywhere (order preserved) */
export const GLOBAL_FOOTER_LINKS = [
  { href: LEGAL_PATHS.terms, label: "Terms" },
  { href: LEGAL_PATHS.privacy, label: "Privacy" },
  { href: LEGAL_PATHS.refund, label: "Refunds" },
  { href: LEGAL_PATHS.guidelines, label: "Guidelines" },
  { href: LEGAL_PATHS.workerAgreement, label: "Line Holder Agreement" },
  { href: LEGAL_PATHS.contact, label: "Support" },
] as const;

export function LegalLinksInline({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-slate-500 ${className}`}>
      {GLOBAL_FOOTER_LINKS.map((item, i) => (
        <span key={item.href}>
          {i > 0 ? " · " : null}
          <Link href={item.href} className={linkClass}>
            {item.label}
          </Link>
        </span>
      ))}
    </p>
  );
}

export function GlobalLegalFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-4 text-xs text-slate-500 sm:justify-between sm:px-6">
        <p>LineCrew.ai is a marketplace connecting customers and independent line holders.</p>
        <nav
          className="flex flex-wrap items-center gap-x-3 gap-y-1"
          aria-label="Legal and support"
        >
          {GLOBAL_FOOTER_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
