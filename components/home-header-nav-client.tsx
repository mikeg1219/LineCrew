"use client";

import { TINY_BLUR_DATA_URL } from "@/lib/image-blur-placeholder";
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

/**
 * Marketing homepage nav only: always guest links (How it works, Sign in, Get started).
 * Logo + wordmark sit on the gradient without a white box.
 */
export function HomeHeaderNavClient() {
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

  const ctaTransparent =
    "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-white px-5 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50";
  const ctaScrolled =
    "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700";

  const logoImgClass = scrolled
    ? "h-10 w-auto shrink-0 md:h-12"
    : "h-10 w-auto shrink-0 brightness-0 invert md:h-12";

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
            className="flex min-h-[44px] min-w-0 items-center gap-2 transition hover:opacity-95"
            aria-label="LineCrew.ai home"
            onClick={closeMenu}
          >
            <Image
              src="/linecrew-logo.png"
              alt=""
              width={180}
              height={48}
              className={logoImgClass}
              priority
              placeholder="blur"
              blurDataURL={TINY_BLUR_DATA_URL}
            />
            <span
              className={`truncate text-xl font-bold tracking-tight sm:whitespace-normal ${
                scrolled ? "text-slate-900" : "text-white"
              }`}
            >
              LineCrew.ai
            </span>
          </Link>

          <div className="hidden items-center gap-6 md:flex md:gap-8">
            <Link href="/#how-it-works" className={linkClass}>
              How it works
            </Link>
            <Link href="/auth" className={linkClass}>
              Sign in
            </Link>
            <Link href="/onboarding" className={scrolled ? ctaScrolled : ctaTransparent}>
              Get started
            </Link>
          </div>

          <button
            type="button"
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg md:hidden ${
              scrolled ? "text-slate-800 hover:bg-slate-100" : "text-white hover:bg-white/10"
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
            <Link
              href="/#how-it-works"
              className="text-center text-lg font-semibold text-white/90 hover:text-white"
              onClick={closeMenu}
            >
              How it works
            </Link>
            <Link
              href="/auth"
              className="text-center text-lg font-semibold text-white/90 hover:text-white"
              onClick={closeMenu}
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-8 py-3 text-base font-semibold text-blue-600 shadow-lg hover:bg-blue-50"
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
