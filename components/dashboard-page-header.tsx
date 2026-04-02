import type { ReactNode } from "react";

export type DashboardRoleEyebrow = "CUSTOMER" | "LINE HOLDER" | "ACCOUNT";

type DashboardPageHeaderProps = {
  eyebrow: DashboardRoleEyebrow | string;
  title: string;
  subtitle?: ReactNode;
  /** e.g. “Signed in as …” */
  meta?: ReactNode;
  className?: string;
};

/**
 * Consistent page header for dashboard routes (Zone 2).
 */
export function DashboardPageHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  className = "",
}: DashboardPageHeaderProps) {
  return (
    <header className={`pt-8 pb-6 ${className}`.trim()}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h1>
      {subtitle ? (
        <div className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          {subtitle}
        </div>
      ) : null}
      {meta ? (
        <div className="mt-4 text-sm leading-snug text-slate-500">{meta}</div>
      ) : null}
    </header>
  );
}
