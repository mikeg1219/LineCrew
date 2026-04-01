import Link from "next/link";
import type { ReactNode } from "react";

export function PolicyShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-xs text-slate-500">Version {updated}</p>
      <article className="prose prose-slate mt-6 max-w-none rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed">
        {children}
      </article>
      <p className="mt-5 text-sm">
        <Link href="/legal" className="text-blue-700 hover:text-blue-800">
          ← Back to Legal Center
        </Link>
      </p>
    </main>
  );
}
