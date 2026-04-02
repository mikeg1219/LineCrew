import { HomeHeroCTAs } from "@/components/home-hero-ctas";
import { HomeHeaderNav } from "@/components/home-header-nav";
import { HomeWaiterCtaLink } from "@/components/home-waiter-cta-link";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Save your spot. Keep your day moving.",
  description:
    "Book trusted Line Holders for airports, concerts, theme parks, and more. We hold your spot so you don't have to.",
  openGraph: {
    url: "https://linecrew.ai/",
    title: "LineCrew.ai — Save your spot. Keep your day moving.",
    description:
      "Book trusted Line Holders for airports, concerts, theme parks, and more.",
  },
  twitter: {
    title: "LineCrew.ai — Save your spot. Keep your day moving.",
    description:
      "Book trusted Line Holders for airports, concerts, theme parks, and more.",
  },
  alternates: { canonical: "https://linecrew.ai/" },
};

const TRUST_ITEMS = [
  "Verified Line Holders",
  "Live status updates",
  "Pay after completion",
  "Most bookings accepted in 3–10 min",
] as const;

const CATEGORY_CARDS = [
  { emoji: "✈", title: "Airports" },
  { emoji: "🎵", title: "Concerts" },
  { emoji: "🎢", title: "Theme Parks" },
  { emoji: "🛍", title: "Retail Drops" },
  { emoji: "🏛", title: "DMV" },
  { emoji: "🍽", title: "Restaurants" },
] as const;

function IconBook(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  );
}

function IconPerson(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconCheckCircle(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-0 flex-col bg-white">
      {/* Hero — full viewport on desktop; natural height on mobile */}
      <section
        className="relative flex min-h-0 flex-col overflow-hidden bg-gradient-to-b from-blue-600 via-blue-500 to-teal-500 md:min-h-screen"
        aria-label="Hero"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl" />
        <header className="relative z-10 border-b border-white/20 bg-gradient-to-b from-black/10 to-transparent backdrop-blur-md">
          <div className="mx-auto flex min-h-16 max-w-6xl items-center px-4 py-3 sm:px-6">
            <Suspense
              fallback={
                <div
                  className="flex h-10 w-full animate-pulse items-center justify-between rounded-lg bg-white/10"
                  aria-hidden
                />
              }
            >
              <HomeHeaderNav />
            </Suspense>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-12 text-center sm:px-6 sm:py-16 md:py-20">
          <p className="mb-5 inline-flex items-center justify-center self-center rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/95 backdrop-blur-sm sm:text-sm">
            Now available at major US airports
          </p>
          <h1 className="text-balance text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl">
            Save your spot. Keep your day moving.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-white/90 sm:text-lg md:text-xl">
            Book a trusted Line Holder for airport security, concerts, theme parks, and more. We
            hold your place so you don&apos;t have to.
          </p>

          <div className="mt-10 flex justify-center">
            <Suspense
              fallback={
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <div className="h-[52px] w-full max-w-xs animate-pulse rounded-2xl bg-white/20 sm:max-w-none" />
                  <div className="h-[52px] w-full max-w-xs animate-pulse rounded-2xl bg-white/10 sm:max-w-none" />
                </div>
              }
            >
              <HomeHeroCTAs />
            </Suspense>
          </div>

          <ul
            className="mx-auto mt-12 grid max-w-lg grid-cols-2 gap-x-4 gap-y-3 text-left text-sm text-white/90 sm:mt-14 sm:flex sm:max-w-4xl sm:flex-wrap sm:justify-center sm:text-base"
            aria-label="Trust highlights"
          >
            {TRUST_ITEMS.map((label) => (
              <li key={label} className="flex min-h-[44px] items-center gap-2">
                <span className="shrink-0 text-emerald-300" aria-hidden>
                  ✓
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-t border-slate-200 bg-white py-16 sm:py-20"
        aria-labelledby="how-it-works-heading"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2
            id="how-it-works-heading"
            className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            How LineCrew works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-10">
            <article className="linecrew-card-marketing flex flex-col items-center p-8 text-center">
              <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <IconBook className="size-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Post your request</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Choose your airport, line type, and offer price
              </p>
            </article>
            <article className="linecrew-card-marketing flex flex-col items-center p-8 text-center">
              <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <IconPerson className="size-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">We match you</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                A Line Holder accepts and heads to your line
              </p>
            </article>
            <article className="linecrew-card-marketing flex flex-col items-center p-8 text-center">
              <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <IconCheckCircle className="size-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Swap in</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Arrive when it&apos;s your turn and take your spot
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section
        className="border-t border-slate-200 bg-slate-50 py-16 sm:py-20"
        aria-labelledby="categories-heading"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2
            id="categories-heading"
            className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Where we hold your spot
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORY_CARDS.map((c) => (
              <div
                key={c.title}
                className="linecrew-card-marketing flex items-center gap-4 p-6 transition hover:border-slate-300 hover:shadow-md"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm ring-1 ring-slate-200/80">
                  {c.emoji}
                </span>
                <span className="text-lg font-semibold text-slate-900">{c.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Line Holder CTA */}
      <section
        className="relative overflow-hidden border-t border-white/10 bg-gradient-to-br from-blue-600 via-blue-600 to-teal-500 py-16 sm:py-20"
        aria-labelledby="earn-heading"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 id="earn-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Earn $15-40 per booking
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/90 sm:text-lg">
            Set your own schedule. Work when you want. Get paid after every completed handoff.
          </p>
          <div className="mt-10 flex justify-center">
            <Suspense
              fallback={
                <div className="h-12 w-56 animate-pulse rounded-2xl bg-white/25" aria-hidden />
              }
            >
              <HomeWaiterCtaLink className="inline-flex min-h-[44px] w-full max-w-xs min-w-[44px] items-center justify-center rounded-2xl bg-white px-10 py-3.5 text-base font-bold text-blue-600 shadow-lg shadow-blue-900/20 transition hover:bg-blue-50 sm:w-auto sm:min-h-[52px]">
                Start earning today
              </HomeWaiterCtaLink>
            </Suspense>
          </div>
        </div>
      </section>

      {/* App footer is rendered in root layout (components/app-footer.tsx) */}
    </div>
  );
}
