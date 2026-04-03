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
    <header className={`pb-6 ${className}`.trim()}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h1>
      {subtitle ? (
        <div className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {subtitle}
        </div>
      ) : null}
      {meta ? (
        <div className="mt-4 text-sm leading-relaxed text-slate-500">{meta}</div>
      ) : null}
    </header>
  );
}
