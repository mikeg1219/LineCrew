import Link from "next/link";
import { GLOBAL_FOOTER_LINKS, legalFooterLinkClass } from "@/components/legal-links";

/**
 * Global footer — legal links + copyright. Used in root layout on all pages.
 */
export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        <p className="text-center text-xs text-slate-500 sm:text-left">
          © 2026 LineCrew.ai — All rights reserved
        </p>
        <nav
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end"
          aria-label="Legal and support"
        >
          {GLOBAL_FOOTER_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs font-medium ${legalFooterLinkClass}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
