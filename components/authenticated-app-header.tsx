"use client";

import { signOut } from "@/app/dashboard/actions";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export type AuthHeaderRole = "customer" | "waiter" | null;

type AuthenticatedAppHeaderProps = {
  email: string | null;
  role: AuthHeaderRole;
  avatarUrl: string | null;
  displayName: string;
  /** e.g. "Profile" — shows LineCrew / Profile */
  breadcrumbCurrent?: string;
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
  pathname,
}: AuthenticatedAppHeaderProps & { pathname: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountWrapRef = useRef<HTMLDivElement>(null);

  const dashboardHref =
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
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setAccountOpen(false);
                setMenuOpen((o) => !o);
              }}
              className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50"
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

            <div className="flex min-w-0 items-center gap-2">
              <Link
                href="/dashboard"
                className="truncate text-lg font-semibold tracking-tight text-blue-700 transition hover:text-blue-800"
              >
                LineCrew
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
          </div>

          <div className="relative shrink-0" ref={accountWrapRef}>
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
                    href="/dashboard/profile"
                    className="block px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href={dashboardHref}
                    className="block px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {role === "customer" ? (
                    <Link
                      href="/dashboard/customer/post-job"
                      className="block px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                    >
                      Book Now
                    </Link>
                  ) : null}
                  {role === "waiter" ? (
                    <Link
                      href="/dashboard/waiter/browse-jobs"
                      className="block px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                    >
                      Available bookings
                    </Link>
                  ) : null}
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
      </header>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 top-14 z-40 bg-slate-900/40 backdrop-blur-[2px]"
            aria-hidden
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
          />
          <aside
            id="app-nav-drawer"
            className="fixed left-0 top-14 z-50 flex h-[calc(100dvh-3.5rem)] w-[min(100vw-2rem,18rem)] flex-col overflow-y-auto border-r border-slate-200 bg-white shadow-2xl sm:w-72"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <div className="border-b border-slate-100 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Menu
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                LineCrew
              </p>
              <p className="mt-2">
                <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-100">
                  {roleBadgeText}
                </span>
              </p>
            </div>

            <nav
              className="flex flex-1 flex-col gap-0.5 p-3"
              aria-label="Main navigation"
            >
              {role === null ? (
                <>
                  <DrawerLink
                    href="/"
                    pathname={pathname}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    Home
                  </DrawerLink>
                  <DrawerLink
                    href="/dashboard"
                    pathname={pathname}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </DrawerLink>
                  <DrawerLink
                    href="/dashboard/profile"
                    pathname={pathname}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    Profile
                  </DrawerLink>
                </>
              ) : null}

              {role === "customer" ? (
                <>
                  <DrawerLink
                    href="/dashboard/customer"
                    pathname={pathname}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </DrawerLink>
                  <DrawerLink
                    href="/dashboard/customer/post-job"
                    pathname={pathname}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    Book Now
                  </DrawerLink>
                  <DrawerLink
                    href="/dashboard/customer"
                    pathname={pathname}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    My bookings
                  </DrawerLink>
                  <DrawerLink
                    href="/dashboard/profile"
                    pathname={pathname}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    Profile
                  </DrawerLink>
                </>
              ) : null}

              {role === "waiter" ? (
                <>
                  <DrawerLink
                    href="/dashboard/waiter"
                    pathname={pathname}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </DrawerLink>
                  <DrawerLink
                    href="/dashboard/waiter/browse-jobs"
                    pathname={pathname}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    Available bookings
                  </DrawerLink>
                  <DrawerLink
                    href="/dashboard/waiter"
                    pathname={pathname}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    My assignments
                  </DrawerLink>
                  <DrawerLink
                    href="/dashboard/profile"
                    pathname={pathname}
                    onNavigate={() => setMenuOpen(false)}
                  >
                    Profile
                  </DrawerLink>
                </>
              ) : null}
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

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DrawerLink({
  href,
  children,
  onNavigate,
  pathname,
}: {
  href: string;
  children: ReactNode;
  onNavigate: () => void;
  pathname: string;
}) {
  const active = isActivePath(pathname, href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
        active
          ? "bg-blue-50 text-blue-900 ring-1 ring-blue-100"
          : "text-slate-800 hover:bg-slate-100"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
