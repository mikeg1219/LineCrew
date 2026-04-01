import Link from "next/link";
import { LEGAL_PATHS } from "@/lib/legal";

const linkClass =
  "text-slate-500 transition hover:text-slate-800 underline-offset-2 hover:underline";

export function LegalLinksInline({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-slate-500 ${className}`}>
      <Link href={LEGAL_PATHS.terms} className={linkClass}>
        Terms
      </Link>{" "}
      ·{" "}
      <Link href={LEGAL_PATHS.privacy} className={linkClass}>
        Privacy
      </Link>{" "}
      ·{" "}
      <Link href={LEGAL_PATHS.refund} className={linkClass}>
        Cancellation & Refunds
      </Link>{" "}
      ·{" "}
      <Link href={LEGAL_PATHS.guidelines} className={linkClass}>
        Community Guidelines
      </Link>{" "}
      ·{" "}
      <Link href={LEGAL_PATHS.contact} className={linkClass}>
        Contact
      </Link>
    </p>
  );
}

export function GlobalLegalFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200/90 bg-white/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-4 text-xs text-slate-500 sm:justify-between sm:px-6">
        <p>LineCrew.ai is a marketplace connecting customers and independent line holders.</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href={LEGAL_PATHS.terms} className={linkClass}>
            Terms
          </Link>
          <Link href={LEGAL_PATHS.privacy} className={linkClass}>
            Privacy
          </Link>
          <Link href={LEGAL_PATHS.refund} className={linkClass}>
            Refunds
          </Link>
          <Link href={LEGAL_PATHS.guidelines} className={linkClass}>
            Guidelines
          </Link>
          <Link href={LEGAL_PATHS.workerAgreement} className={linkClass}>
            Line Holder Agreement
          </Link>
          <Link href={LEGAL_PATHS.contact} className={linkClass}>
            Support
          </Link>
        </div>
      </div>
    </footer>
  );
}
