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

