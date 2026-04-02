"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

export type WaiterOnboardingProgressProps = {
  gate1Unlocked: boolean;
  gate2Unlocked: boolean;
  gate3Unlocked: boolean;
  firstName: string | null;
  phone: string | null;
  bio: string | null;
  servingAirports: string[] | null;
  payoutReady: boolean;
  emailVerified: boolean;
  hasProfilePhoto: boolean;
};

type GateDef = {
  id: 1 | 2 | 3;
  title: string;
  subtitle: string;
  unlocked: boolean;
  unlockedMessage: string;
  needs: { label: string; done: boolean }[];
  action: { label: string; href?: string; onClick?: () => void } | null;
};

function LockIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <span
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200/80"
        aria-hidden
      >
        <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200/90"
      aria-hidden
    >
      <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
    </span>
  );
}

function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <div
      className={`hidden shrink-0 items-center justify-center text-slate-300 sm:flex ${className}`}
      aria-hidden
    >
      <svg className="size-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </div>
  );
}

export function WaiterOnboardingProgress({
  gate1Unlocked,
  gate2Unlocked,
  gate3Unlocked,
  firstName,
  phone,
  bio,
  servingAirports,
  payoutReady,
  emailVerified,
  hasProfilePhoto,
}: WaiterOnboardingProgressProps) {
  const scrollToPayout = useCallback(() => {
    const el = document.getElementById("waiter-payout-section");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const gates: GateDef[] = useMemo(() => {
    const g1Needs = [
      { label: "First name", done: Boolean(firstName?.trim()) },
      { label: "Phone", done: Boolean(phone?.trim()) },
      { label: "Email verified", done: emailVerified },
    ];
    const g2Needs = [
      { label: "Profile photo", done: hasProfilePhoto },
      { label: "Bio", done: Boolean(bio?.trim()) },
      {
        label: "Service areas",
        done: Array.isArray(servingAirports) && servingAirports.length > 0,
      },
    ];
    const g3Needs = [
      {
        label: "Set up a payout method",
        done: payoutReady,
      },
    ];

    return [
      {
        id: 1,
        title: "Browse jobs",
        subtitle: "Gate 1",
        unlocked: gate1Unlocked,
        unlockedMessage: "You can browse jobs",
        needs: g1Needs,
        action: gate1Unlocked
          ? null
          : { label: "Complete profile", href: "/profile" },
      },
      {
        id: 2,
        title: "Accept bookings",
        subtitle: "Gate 2",
        unlocked: gate2Unlocked,
        unlockedMessage: "You can accept bookings",
        needs: g2Needs,
        action: gate2Unlocked
          ? null
          : { label: "Add service areas", href: "/dashboard/waiter/service-areas" },
      },
      {
        id: 3,
        title: "Get paid",
        subtitle: "Gate 3",
        unlocked: gate3Unlocked,
        unlockedMessage: "Payouts enabled",
        needs: g3Needs,
        action: gate3Unlocked
          ? null
          : {
              label: "Set up payouts",
              onClick: scrollToPayout,
            },
      },
    ];
  }, [
    gate1Unlocked,
    gate2Unlocked,
    gate3Unlocked,
    firstName,
    phone,
    bio,
    servingAirports,
    payoutReady,
    emailVerified,
    hasProfilePhoto,
    scrollToPayout,
  ]);

  const stepsComplete = [gate1Unlocked, gate2Unlocked, gate3Unlocked].filter(
    Boolean
  ).length;

  /** Mobile: completed gates default collapsed; user toggle overrides. */
  const [mobileOpen, setMobileOpen] = useState<Record<number, boolean>>({});

  const mobileDetailsOpen = (gate: GateDef) => {
    const o = mobileOpen[gate.id];
    if (o !== undefined) return o;
    return !gate.unlocked;
  };

  const setGateOpen = (id: number, open: boolean) => {
    setMobileOpen((p) => ({ ...p, [id]: open }));
  };

  return (
    <section
      className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-6"
      aria-labelledby="waiter-onboarding-progress-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="waiter-onboarding-progress-heading"
            className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500"
          >
            Line Holder setup
          </h2>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            {stepsComplete} of 3 steps complete
          </p>
        </div>
        <div className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200 sm:mt-0 sm:w-48">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
            style={{ width: `${(stepsComplete / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: horizontal */}
      <div className="mt-6 hidden gap-2 sm:flex sm:items-stretch sm:justify-between">
        {gates.map((g, idx) => (
          <div key={g.id} className="flex min-w-0 flex-1 items-stretch gap-2">
            <GateCardDesktop gate={g} />
            {idx < gates.length - 1 ? <ArrowRight /> : null}
          </div>
        ))}
      </div>

      {/* Mobile: vertical timeline */}
      <div className="relative mt-6 space-y-0 sm:hidden">
        <div
          className="absolute bottom-2 left-[17px] top-2 w-0.5 bg-slate-200"
          aria-hidden
        />
        {gates.map((g) => (
          <GateCardMobile
            key={g.id}
            gate={g}
            open={mobileDetailsOpen(g)}
            onOpenChange={(o) => setGateOpen(g.id, o)}
          />
        ))}
      </div>
    </section>
  );
}

function GateCardDesktop({ gate }: { gate: GateDef }) {
  const remaining = gate.needs.filter((n) => !n.done).length;
  return (
    <div
      className={`flex min-h-[220px] min-w-0 flex-1 flex-col rounded-2xl border p-4 shadow-sm ${
        gate.unlocked
          ? "border-emerald-200/90 bg-emerald-50/40 ring-1 ring-emerald-100/80"
          : "border-slate-200/90 bg-white ring-1 ring-slate-900/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <LockIcon open={gate.unlocked} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {gate.subtitle}
          </p>
          <p className="mt-0.5 font-semibold text-slate-900">{gate.title}</p>
          <p
            className={`mt-2 text-xs font-medium ${
              gate.unlocked ? "text-emerald-700" : "text-slate-500"
            }`}
          >
            {gate.unlocked ? (
              <>
                Complete <span className="text-emerald-600">✓</span>
              </>
            ) : (
              <>
                {remaining} step{remaining === 1 ? "" : "s"} remaining
              </>
            )}
          </p>
        </div>
      </div>
      <ul className="mt-3 flex-1 space-y-1.5 text-xs leading-snug text-slate-600">
        {gate.needs.map((n) => (
          <li key={n.label} className="flex gap-2">
            <span className={n.done ? "text-emerald-600" : "text-slate-400"}>
              {n.done ? "✓" : "○"}
            </span>
            <span className={n.done ? "text-slate-600 line-through opacity-70" : ""}>
              {n.label}
            </span>
          </li>
        ))}
      </ul>
      {gate.unlocked ? (
        <p className="mt-3 text-xs font-medium text-emerald-800">{gate.unlockedMessage}</p>
      ) : null}
      {gate.action ? (
        <div className="mt-4">
          {gate.action.href ? (
            <Link
              href={gate.action.href}
              className="inline-flex min-h-[40px] w-full items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              {gate.action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={gate.action.onClick}
              className="inline-flex min-h-[40px] w-full items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              {gate.action.label}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function GateCardMobile({
  gate,
  open,
  onOpenChange,
}: {
  gate: GateDef;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const remaining = gate.needs.filter((n) => !n.done).length;
  const body = (
    <>
      <div className="flex items-start gap-3 pl-1">
        <LockIcon open={gate.unlocked} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {gate.subtitle}
          </p>
          <p className="mt-0.5 font-semibold text-slate-900">{gate.title}</p>
          <p
            className={`mt-2 text-xs font-medium ${
              gate.unlocked ? "text-emerald-700" : "text-slate-500"
            }`}
          >
            {gate.unlocked ? (
              <>
                Complete <span className="text-emerald-600">✓</span>
              </>
            ) : (
              <>
                {remaining} step{remaining === 1 ? "" : "s"} remaining
              </>
            )}
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5 pl-1 text-xs leading-snug text-slate-600">
        {gate.needs.map((n) => (
          <li key={n.label} className="flex gap-2">
            <span className={n.done ? "text-emerald-600" : "text-slate-400"}>
              {n.done ? "✓" : "○"}
            </span>
            <span className={n.done ? "text-slate-600 line-through opacity-70" : ""}>
              {n.label}
            </span>
          </li>
        ))}
      </ul>
      {gate.unlocked ? (
        <p className="mt-3 text-xs font-medium text-emerald-800">{gate.unlockedMessage}</p>
      ) : null}
      {gate.action ? (
        <div className="mt-4">
          {gate.action.href ? (
            <Link
              href={gate.action.href}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              {gate.action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={gate.action.onClick}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              {gate.action.label}
            </button>
          )}
        </div>
      ) : null}
    </>
  );

  if (!gate.unlocked) {
    return (
      <div className="relative pb-8 pl-10">
        <div
          className={`rounded-2xl border p-4 shadow-sm ${
            "border-slate-200/90 bg-white ring-1 ring-slate-900/5"
          }`}
        >
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-8 pl-10">
      <details
        className="group rounded-2xl border border-emerald-200/90 bg-emerald-50/35 ring-1 ring-emerald-100/80"
        open={open}
        onToggle={(e) => {
          onOpenChange((e.target as HTMLDetailsElement).open);
        }}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
          <span className="text-left text-sm font-semibold text-slate-900">
            {gate.subtitle}: {gate.title}{" "}
            <span className="text-emerald-700">✓</span>
          </span>
          <span className="text-xs font-semibold text-slate-500 group-open:hidden">
            Show
          </span>
          <span className="hidden text-xs font-semibold text-slate-500 group-open:inline">
            Hide
          </span>
        </summary>
        <div className="border-t border-emerald-100/80 px-4 pb-4 pt-0">{body}</div>
      </details>
    </div>
  );
}
