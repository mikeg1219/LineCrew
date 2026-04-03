"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function MenuIcon(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

const ctaBlue =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700";

/**
 * Marketing homepage nav — guest links only: How it works, Sign in, Get started.
 * Logo row: flex items-center gap-2, no background on wrapper.
 */
export function HomeHeaderNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const linkMutedT = "text-white/90 hover:text-white";
  const linkMutedS = "text-slate-600 hover:text-slate-900";
  const linkClass = `inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sm font-medium transition-colors ${
    scrolled ? linkMutedS : linkMutedT
  }`;

  const logoImgClass = scrolled
    ? "h-10 w-auto shrink-0"
    : "h-10 w-auto shrink-0 brightness-0 invert";

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-[100] transition-all duration-300 ${
          scrolled ? "bg-white shadow-md" : "bg-transparent"
        }`}
        aria-label="Primary"
      >
        <div className="mx-auto flex h-16 min-h-[64px] w-full max-w-7xl items-center justify-between px-6 md:px-12 lg:px-16">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="LineCrew.ai home"
            onClick={closeMenu}
          >
            <Image
              src="/linecrew-logo.png"
              alt="LineCrew.ai"
              width={140}
              height={40}
              className={logoImgClass}
              priority
            />
            <span
              className={`font-bold text-xl tracking-tight ${
                scrolled ? "text-slate-900" : "text-white"
              }`}
            >
              LineCrew.ai
            </span>
          </Link>

          <div className="hidden items-center gap-6 md:flex md:gap-8">
            <a href="/#how-it-works" className={linkClass}>
              How it works
            </a>
            <Link href="/auth" className={linkClass}>
              Sign in
            </Link>
            <Link href="/onboarding" className={ctaBlue}>
              Get started
            </Link>
          </div>

          <button
            type="button"
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg md:hidden ${
              scrolled
                ? "text-slate-800 hover:bg-slate-100"
                : "text-white hover:bg-white/10"
            }`}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-overlay"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MenuIcon className="size-6" />
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div
          id="mobile-nav-overlay"
          className="fixed inset-0 z-[110] flex flex-col bg-gradient-to-b from-blue-600 via-blue-500 to-teal-500 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="flex h-16 min-h-[64px] shrink-0 items-center justify-end px-6">
            <button
              type="button"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white hover:bg-white/10"
              aria-label="Close menu"
              onClick={closeMenu}
            >
              <CloseIcon className="size-7" />
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8 pb-24">
            <a
              href="/#how-it-works"
              className="text-center text-lg font-semibold text-white/90 hover:text-white"
              onClick={closeMenu}
            >
              How it works
            </a>
            <Link
              href="/auth"
              className="text-center text-lg font-semibold text-white/90 hover:text-white"
              onClick={closeMenu}
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className={`${ctaBlue} min-h-[48px] px-8 py-3 text-base`}
              onClick={closeMenu}
            >
              Get started
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
