"use client";

import type { AuthHeaderRole } from "@/components/authenticated-app-header";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

type MobileBottomNavProps = {
  role: AuthHeaderRole;
  customerBookingsBadge: number;
  waiterAssignmentsBadge: number;
};

function IconHome({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={active ? "text-blue-600" : "text-slate-500"}
      aria-hidden
    >
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBook({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={active ? "text-blue-600" : "text-slate-500"}
      aria-hidden
    >
      <path
        d="M12 6v12M8 10h8M8 14h5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth={1.8}
      />
    </svg>
  );
}

function IconClipboard({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={active ? "text-blue-600" : "text-slate-500"}
      aria-hidden
    >
      <path
        d="M9 4h6l1 2h3v14H5V6h3l1-2z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M9 12h6M9 16h4"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSearch({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={active ? "text-blue-600" : "text-slate-500"}
      aria-hidden
    >
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth={1.8} />
      <path
        d="M16 16l4 4"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconUser({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={active ? "text-blue-600" : "text-slate-500"}
      aria-hidden
    >
      <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth={1.8} />
      <path
        d="M6 20v-1.2C6 16.3 8.7 14 12 14s6 2.3 6 4.8V20"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  const text = n > 99 ? "99+" : String(n);
  return (
    <span className="absolute -right-1 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
      {text}
    </span>
  );
}

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function getHashSnapshot() {
  return window.location.hash;
}

function getServerHashSnapshot() {
  return "";
}

export function MobileBottomNav({
  role,
  customerBookingsBadge,
  waiterAssignmentsBadge,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const hash = useSyncExternalStore(
    subscribeHash,
    getHashSnapshot,
    getServerHashSnapshot
  );

  if (role !== "customer" && role !== "waiter") return null;

  if (role === "customer") {
    const homeActive =
      pathname === "/dashboard/customer" &&
      !pathname.startsWith("/dashboard/customer/jobs") &&
      hash !== "#customer-bookings";
    const bookActive =
      pathname.startsWith("/dashboard/customer/post-job") ||
      pathname.startsWith("/dashboard/customer/booking-review");
    const bookingsActive =
      pathname.startsWith("/dashboard/customer/jobs") ||
      (pathname === "/dashboard/customer" && hash === "#customer-bookings");
    const profileActive = pathname.startsWith("/profile");

    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-md md:hidden"
        aria-label="App navigation"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
          <li className="flex-1">
            <Link
              href="/dashboard/customer"
              className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
                homeActive ? "text-blue-600" : "text-slate-600"
              }`}
            >
              <span className="relative inline-flex size-6 items-center justify-center">
                <IconHome active={homeActive} />
              </span>
              Home
            </Link>
          </li>
          <li className="flex-1">
            <Link
              href="/dashboard/customer/post-job"
              className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
                bookActive ? "text-blue-600" : "text-slate-600"
              }`}
            >
              <span className="relative inline-flex size-6 items-center justify-center">
                <IconBook active={bookActive} />
              </span>
              Book
            </Link>
          </li>
          <li className="flex-1">
            <Link
              href="/dashboard/customer#customer-bookings"
              className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
                bookingsActive ? "text-blue-600" : "text-slate-600"
              }`}
            >
              <span className="relative inline-flex size-6 items-center justify-center">
                <IconClipboard active={bookingsActive} />
                <Badge n={customerBookingsBadge} />
              </span>
              Bookings
            </Link>
          </li>
          <li className="flex-1">
            <Link
              href="/profile"
              className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
                profileActive ? "text-blue-600" : "text-slate-600"
              }`}
            >
              <span className="relative inline-flex size-6 items-center justify-center">
                <IconUser active={profileActive} />
              </span>
              Profile
            </Link>
          </li>
        </ul>
      </nav>
    );
  }

  const homeActive =
    pathname === "/dashboard/waiter" &&
    !pathname.startsWith("/dashboard/waiter/jobs") &&
    hash !== "#waiter-assignments" &&
    !pathname.startsWith("/dashboard/waiter/browse-jobs") &&
    !pathname.startsWith("/dashboard/waiter/service-areas");
  const browseActive = pathname.startsWith("/dashboard/waiter/browse-jobs");
  const assignmentsActive =
    pathname.startsWith("/dashboard/waiter/jobs") ||
    (pathname === "/dashboard/waiter" && hash === "#waiter-assignments");
  const profileActive = pathname.startsWith("/profile");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-md md:hidden"
      aria-label="App navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        <li className="flex-1">
          <Link
            href="/dashboard/waiter"
            className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
              homeActive ? "text-blue-600" : "text-slate-600"
            }`}
          >
            <span className="relative inline-flex size-6 items-center justify-center">
              <IconHome active={homeActive} />
            </span>
            Home
          </Link>
        </li>
        <li className="flex-1">
          <Link
            href="/dashboard/waiter/browse-jobs"
            className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
              browseActive ? "text-blue-600" : "text-slate-600"
            }`}
          >
            <span className="relative inline-flex size-6 items-center justify-center">
              <IconSearch active={browseActive} />
            </span>
            Browse
          </Link>
        </li>
        <li className="flex-1">
          <Link
            href="/dashboard/waiter#waiter-assignments"
            className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
              assignmentsActive ? "text-blue-600" : "text-slate-600"
            }`}
          >
            <span className="relative inline-flex size-6 items-center justify-center">
              <IconClipboard active={assignmentsActive} />
              <Badge n={waiterAssignmentsBadge} />
            </span>
            Assignments
          </Link>
        </li>
        <li className="flex-1">
          <Link
            href="/profile"
            className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
              profileActive ? "text-blue-600" : "text-slate-600"
            }`}
          >
            <span className="relative inline-flex size-6 items-center justify-center">
              <IconUser active={profileActive} />
            </span>
            Profile
          </Link>
        </li>
      </ul>
    </nav>
  );
}
