import Link from "next/link";
import type { ReactNode } from "react";
import { POLICY_VERSIONS, type PolicyVersionKey } from "@/lib/legal";

export function PolicyShell({
  title,
  versionKey,
  updated,
  children,
}: {
  title: string;
  /** Reads version from `lib/legal.ts` — prefer this so pages stay in sync. */
  versionKey: PolicyVersionKey;
  /** Optional override (e.g. tests). Defaults to POLICY_VERSIONS[versionKey]. */
  updated?: string;
  children: ReactNode;
}) {
  const resolved = updated ?? POLICY_VERSIONS[versionKey];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-xs text-slate-500">Version {resolved}</p>
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
