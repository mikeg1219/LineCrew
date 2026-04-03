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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-teal-500 py-10 sm:py-12">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="linecrew-card-marketing p-6 text-slate-900 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Legal
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-xs text-slate-500">Version {resolved}</p>
          <article className="prose prose-slate mt-6 max-w-none text-sm leading-relaxed">
            {children}
          </article>
          <p className="mt-5 text-sm">
            <Link href="/legal" className="font-medium text-blue-600 hover:text-blue-700">
              ← Back to Legal Center
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
