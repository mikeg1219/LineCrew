"use client";

import type { UserRole } from "@/lib/types";
import Link from "next/link";

function intentHref(role: UserRole) {
  return `/onboarding/account?intent=${encodeURIComponent(role)}`;
}

export function RoleIntentButtons() {
  function rememberIntent(role: UserRole) {
    try {
      sessionStorage.setItem("linecrew_role_intent", role);
    } catch {
      // Ignore browser storage errors.
    }
  }

  return (
    <div className="space-y-3">
      <Link
        href={intentHref("customer")}
        onClick={() => rememberIntent("customer")}
        className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        I need someone to hold my line
      </Link>
      <Link
        href={intentHref("waiter")}
        onClick={() => rememberIntent("waiter")}
        className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
      >
        I want to earn money holding lines
      </Link>
    </div>
  );
}
