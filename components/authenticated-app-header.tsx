"use client";

import { signOut } from "@/app/dashboard/actions";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export type AuthHeaderRole = "customer" | "waiter" | null;

export type AuthenticatedAppHeaderProps = {
  email: string | null;
  role: AuthHeaderRole;
  avatarUrl: string | null;
  displayName: string;
  breadcrumbCurrent?: string;
  hasBookingDraft?: boolean;
  customerBookingsBadge?: number;
  waiterAssignmentsBadge?: number;
};

export function AuthenticatedAppHeader(props: AuthenticatedAppHeaderProps) {
  const pathname = usePathname();
  return <AuthenticatedAppHeaderInner key={pathname} {...props} pathname={pathname} />;
}

function AuthenticatedAppHeaderInner({
  email,
  role,
  avatarUrl,
  displayName,
  breadcrumbCurrent,
  hasBookingDraft,
  customerBookingsBadge = 0,
  waiterAssignmentsBadge = 0,
  pathname,
}: AuthenticatedAppHeaderProps & { pathname: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountWrapRef = useRef<HTMLDivElement>(null);

  const logoHref =
    role === "waiter"
      ? "/dashboard/waiter"
      : role === "customer"
        ? "/dashboard/customer"
        : "/dashboard";

  const roleBadgeText =
    role === "waiter"
      ? "Line Holder"
      : role === "customer"
        ? "Customer"
        : "Account setup";

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (
        accountWrapRef.current &&
        !accountWrapRef.current.contains(e.target as Node)
      ) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [accountOpen]);

  const initial =
    displayName.trim().slice(0, 1).toUpperCase() ||
    (email?.trim().slice(0, 1).toUpperCase() ?? "?");

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center gap-2 px-4 py-2 sm:gap-3 sm:px-5">
          {role === "customer" || role === "waiter" ? (
            <button
              type="button"
              onClick={() => {
                setAccountOpen(false);
                setMenuOpen((o) => !o);
              }}
              className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50 md:hidden"
              aria-expanded={menuOpen}
              aria-controls="app-nav-drawer"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? (
                <svg
                  className="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                </svg>
              ) : (
                <svg
                  className="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                </svg>
              )}
            </button>
          ) : null}

          <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
            <Link
              href={logoHref}
              className="inline-flex shrink-0 items-center transition hover:opacity-90"
              onClick={() => setMenuOpen(false)}
            >
              <Image
                src="/linecrew-logo.png"
                alt="LineCrew.ai"
                width={132}
                height={40}
                className="h-7 w-auto"
                priority
              />
            </Link>
            {breadcrumbCurrent ? (
              <>
                <span className="shrink-0 text-slate-300" aria-hidden>
                  /
                </span>
                <span className="truncate text-sm font-medium text-slate-800">
                  {breadcrumbCurrent}
                </span>
              </>
            ) : null}
          </div>

          {role === "customer" ? (
            <nav
              className="hidden flex-1 items-center justify-center gap-0.5 md:flex"
              aria-label="Main"
            >
              <DesktopNavLink
                href="/dashboard/customer/post-job"
                active={isCustomerBookActive(pathname)}
              >
                Book now
              </DesktopNavLink>
              <DesktopNavLink
                href="/dashboard/customer"
                active={isCustomerBookingsNavActive(pathname)}
                badge={customerBookingsBadge}
              >
                My bookings
              </DesktopNavLink>
            </nav>
          ) : null}

          {role === "waiter" ? (
            <nav
              className="hidden flex-1 items-center justify-center gap-0.5 md:flex"
              aria-label="Main"
            >
              <DesktopNavLink
                href="/dashboard/waiter/browse-jobs"
                active={pathname.startsWith("/dashboard/waiter/browse-jobs")}
              >
                Browse jobs
              </DesktopNavLink>
              <DesktopNavLink
                href="/dashboard/waiter"
                active={isWaiterAssignmentsNavActive(pathname)}
                badge={waiterAssignmentsBadge}
              >
                My assignments
              </DesktopNavLink>
              <DesktopNavLink
                href="/dashboard/waiter/service-areas"
                active={pathname.startsWith("/dashboard/waiter/service-areas")}
              >
                Service areas
              </DesktopNavLink>
            </nav>
          ) : null}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {role === "customer" &&
            hasBookingDraft &&
            pathname !== "/dashboard/customer/booking-review" ? (
              <Link
                href="/dashboard/customer/booking-review"
                className="hidden min-h-[40px] max-w-[11rem] truncate rounded-lg px-2 text-center text-xs font-semibold text-amber-800 underline decoration-amber-700/30 sm:inline md:max-w-xs md:text-sm"
              >
                Continue to review
              </Link>
            ) : null}

            <div className="relative" ref={accountWrapRef}>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setAccountOpen((o) => !o);
                }}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full ring-2 ring-slate-200/80 transition hover:ring-blue-300"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="size-10 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-semibold text-white">
                    {initial}
                  </span>
                )}
              </button>

              {accountOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),18rem)] rounded-2xl border border-slate-200 bg-white py-2 shadow-lg ring-1 ring-slate-900/5"
                  role="menu"
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {displayName}
                    </p>
                    {email ? (
                      <p
                        className="mt-0.5 truncate text-xs text-slate-500"
                        title={email}
                      >
                        {email}
                      </p>
                    ) : null}
                    <p className="mt-2">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-100">
                        {roleBadgeText}
                      </span>
                    </p>
                  </div>

                  <nav className="py-1" aria-label="Account">
                    <Link
                      href="/profile"
                      className="block px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                    >
                      Profile
                    </Link>
                  </nav>

                  <div className="border-t border-slate-100 px-2 py-2">
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50"
                        role="menuitem"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {role === "customer" &&
      hasBookingDraft &&
      pathname !== "/dashboard/customer/booking-review" ? (
        <div className="border-b border-amber-200/90 bg-amber-50/95 sm:hidden">
          <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-2.5">
            <Link
              href="/dashboard/customer/booking-review"
              className="text-center text-sm font-semibold text-blue-900 underline decoration-blue-900/25 underline-offset-2"
            >
              Continue to review — finish checkout
            </Link>
          </div>
        </div>
      ) : null}

      {menuOpen && (role === "customer" || role === "waiter") ? (
        <>
          <button
            type="button"
            className="fixed inset-0 top-14 z-40 bg-slate-900/40 backdrop-blur-[2px] md:hidden"
            aria-hidden
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
          />
          <aside
            id="app-nav-drawer"
            className="fixed left-0 top-14 z-50 flex h-[calc(100dvh-3.5rem)] w-[min(100vw-2rem,20rem)] flex-col overflow-y-auto border-r border-slate-200 bg-white shadow-2xl md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <div className="border-b border-slate-100 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Menu
              </p>
              <p className="mt-2">
                <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-100">
                  {roleBadgeText}
                </span>
              </p>
            </div>

            <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Main navigation">
              {role === "customer" ? (
                <>
                  <DrawerLink
                    href="/dashboard/customer/post-job"
                    active={isCustomerBookActive(pathname)}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    Book now
                  </DrawerLink>
                  <DrawerLink
                    href="/dashboard/customer"
                    active={isCustomerBookingsNavActive(pathname)}
                    onNavigate={() => setMenuOpen(false)}
                    badge={customerBookingsBadge}
                  >
                    My bookings
                  </DrawerLink>
                </>
              ) : null}
              {role === "waiter" ? (
                <>
                  <DrawerLink
                    href="/dashboard/waiter/browse-jobs"
                    active={pathname.startsWith("/dashboard/waiter/browse-jobs")}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    Browse jobs
                  </DrawerLink>
                  <DrawerLink
                    href="/dashboard/waiter"
                    active={isWaiterAssignmentsNavActive(pathname)}
                    onNavigate={() => setMenuOpen(false)}
                    badge={waiterAssignmentsBadge}
                  >
                    My assignments
                  </DrawerLink>
                  <DrawerLink
                    href="/dashboard/waiter/service-areas"
                    active={pathname.startsWith("/dashboard/waiter/service-areas")}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    Service areas
                  </DrawerLink>
                </>
              ) : null}
              <DrawerLink
                href="/profile"
                active={pathname.startsWith("/profile")}
                onNavigate={() => setMenuOpen(false)}
              >
                Profile
              </DrawerLink>
            </nav>

            <div className="border-t border-slate-100 p-3">
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}

function isCustomerBookActive(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard/customer/post-job") ||
    pathname.startsWith("/dashboard/customer/booking-review")
  );
}

function isCustomerBookingsNavActive(pathname: string): boolean {
  if (isCustomerBookActive(pathname)) return false;
  return (
    pathname === "/dashboard/customer" ||
    pathname.startsWith("/dashboard/customer/jobs")
  );
}

function isWaiterAssignmentsNavActive(pathname: string): boolean {
  if (pathname.startsWith("/dashboard/waiter/browse-jobs")) return false;
  if (pathname.startsWith("/dashboard/waiter/service-areas")) return false;
  return (
    pathname === "/dashboard/waiter" ||
    pathname.startsWith("/dashboard/waiter/jobs")
  );
}

function DesktopNavLink({
  href,
  active,
  children,
  badge,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`relative flex min-h-[44px] items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active
          ? "text-blue-700 after:absolute after:bottom-1 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-blue-600"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {children}
      {badge != null && badge > 0 ? (
        <span className="ml-1.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold leading-none text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function DrawerLink({
  href,
  children,
  onNavigate,
  active,
  badge,
}: {
  href: string;
  children: ReactNode;
  onNavigate: () => void;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
        active
          ? "bg-blue-50 text-blue-900 ring-1 ring-blue-100"
          : "text-slate-800 hover:bg-slate-100"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span>{children}</span>
      {badge != null && badge > 0 ? (
        <span className="flex min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
