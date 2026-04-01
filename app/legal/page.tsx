import Link from "next/link";
import { LEGAL_PATHS } from "@/lib/legal";

const pages = [
  { href: LEGAL_PATHS.terms, title: "Terms of Service" },
  { href: LEGAL_PATHS.privacy, title: "Privacy Policy" },
  { href: LEGAL_PATHS.refund, title: "Cancellation & Refund Policy" },
  { href: LEGAL_PATHS.guidelines, title: "Community Guidelines" },
  { href: LEGAL_PATHS.workerAgreement, title: "Independent Line Holder Agreement" },
  { href: LEGAL_PATHS.contact, title: "Contact & Support" },
];

export default function LegalIndexPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Legal Center</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        LineCrew.ai is a marketplace platform connecting customers with independent line holders.
        Review current policy pages below.
      </p>
      <ul className="mt-6 space-y-3">
        {pages.map((page) => (
          <li key={page.href}>
            <Link
              href={page.href}
              className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              {page.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
