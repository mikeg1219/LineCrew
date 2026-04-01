import Link from "next/link";
import Image from "next/image";
import { MARKETPLACE_CATEGORIES } from "@/lib/marketplace-categories";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative flex min-h-[min(90vh,900px)] flex-1 flex-col overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #1E4FAF 0%, #17A7B8 55%, #67C45A 100%)",
          }}
        />
        <div className="absolute -left-28 top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -right-20 bottom-14 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.18),transparent_42%),radial-gradient(circle_at_80%_65%,rgba(255,255,255,0.14),transparent_38%)]" />
        <header className="relative z-10 border-b border-white/20 bg-white/10 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Image
              src="/linecrew-logo.png"
              alt="LineCrew"
              width={180}
              height={54}
              className="h-8 w-auto"
              priority
            />
            <nav className="hidden items-center gap-4 text-sm text-white/80 md:flex">
              <a href="#categories" className="transition hover:text-white">Categories</a>
              <a href="#how-it-works-heading" className="transition hover:text-white">How It Works</a>
              <Link href="/dashboard/customer/post-job" className="transition hover:text-white">Book</Link>
              <Link href="/auth?intent=waiter" className="transition hover:text-white">Become a Line Holder</Link>
              <Link href="/auth" className="transition hover:text-white">Dashboard</Link>
            </nav>
          </div>
        </header>
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6 sm:py-24">
          <h1 className="mb-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Save your spot. Keep your day moving.
          </h1>
          <p className="mb-10 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            LineCrew.ai helps you book trusted line holders for concerts,
            amusement parks, product drops, airports, DMV visits, restaurants,
            and other high-wait situations.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/auth?intent=customer"
              className="rounded-[14px] bg-white px-8 py-4 text-center text-sm font-bold text-[#1E4FAF] shadow-[0_16px_40px_rgba(30,79,175,0.12)] transition hover:bg-slate-100 sm:text-base"
            >
              Book a Line Holder
            </Link>
            <Link
              href="/auth?intent=waiter"
              className="rounded-[14px] border border-white/40 bg-white/10 px-8 py-4 text-center text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:text-base"
            >
              Become a Line Holder
            </Link>
          </div>
          <div className="mt-10 flex max-w-lg flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/85">
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-400" aria-hidden>
                ✔
              </span>
              Verified Line Holders
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-400" aria-hidden>
                ✔
              </span>
              Live updates
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-400" aria-hidden>
                ✔
              </span>
              Pay after completion
            </span>
          </div>
          <p className="mt-6 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 backdrop-blur-sm">
            Most bookings accepted in 3–10 minutes
          </p>
        </main>
      </div>

      <section id="categories" className="border-t border-slate-200 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Browse categories
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-relaxed text-slate-600 sm:text-base">
            LineCrew supports events, attractions, retail drops, airports, and
            everyday service queues.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MARKETPLACE_CATEGORIES.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm"
              >
                <h3 className="text-base font-semibold text-slate-900">{c.label}</h3>
                <p className="mt-2 text-sm text-slate-600">{c.description}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Pricing: {c.pricingModel}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-t border-slate-200 bg-white py-14 sm:py-16"
        aria-labelledby="how-it-works-heading"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2
            id="how-it-works-heading"
            className="text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
          >
            How it works
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3 sm:gap-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
                1
              </div>
              <h3 className="font-semibold text-slate-900">Book your request</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Choose category, location, and details in under a minute.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
                2
              </div>
              <h3 className="font-semibold text-slate-900">We hold your place</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                A Line Holder checks in live and keeps you updated.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
                3
              </div>
              <h3 className="font-semibold text-slate-900">You walk up</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Arrive at handoff time, swap in, and keep moving.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-t border-slate-200 bg-slate-50 py-14 sm:py-16"
        aria-labelledby="getting-started-heading"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2
            id="getting-started-heading"
            className="text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
          >
            Getting started on the web
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 sm:gap-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                For customers
              </h3>
              <ol className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                <li>1. Click “Book a Line Holder” at the top of this page.</li>
                <li>2. Create your account with email and password.</li>
                <li>3. Open your email and verify your address.</li>
                <li>4. Go to Dashboard → Customer and complete your profile.</li>
                <li>5. Post a booking by category, choose payment, complete checkout.</li>
              </ol>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                For Line Holders (LineWaiters)
              </h3>
              <ol className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                <li>1. Click “Become a Line Holder” at the top of this page.</li>
                <li>2. Create your account and verify your email.</li>
                <li>3. In Dashboard → Line Holder, set profile, service areas, and preferred categories.</li>
                <li>4. Set up payouts when Stripe Connect is ready, or continue in test mode.</li>
                <li>5. Browse bookings, accept a job, and follow the in‑app steps.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-t border-slate-200 bg-slate-50 py-14 sm:py-16"
        aria-labelledby="why-linecrew-heading"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <header className="mx-auto max-w-2xl text-center">
            <h2
              id="why-linecrew-heading"
              className="text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
            >
              Why LineCrew
            </h2>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-600 sm:mt-5 sm:text-base sm:leading-relaxed">
              Built for people who want less waiting and more control in any
              high-demand queue.
            </p>
          </header>
          <ul className="mt-10 grid list-none grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:mt-14 lg:grid-cols-3 lg:gap-8">
            <li className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-balance text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                Skip long lines anywhere
              </h3>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600">
                Events, airports, retail drops, services, and more
              </p>
            </li>
            <li className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-balance text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                Save 30–90+ minutes per request
              </h3>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600">
                Get your time back without losing your place
              </p>
            </li>
            <li className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-balance text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                Real people holding your spot
              </h3>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600">
                A Line Holder stands in line so you don&apos;t have to
              </p>
            </li>
            <li className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-balance text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                Live updates while you wait
              </h3>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600">
                Know when to head over
              </p>
            </li>
            <li className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-balance text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                Pay only after completion
              </h3>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600">
                Your payment is released after the booking is done
              </p>
            </li>
            <li className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-balance text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                Designed for busy schedules
              </h3>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600">
                Built for modern city life and demand spikes
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-14 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Popular use cases</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Tampa International TSA request</li>
              <li>Amalie Arena concert merch line</li>
              <li>Universal attraction queue handoff</li>
              <li>Nike sneaker release drop line</li>
              <li>DMV office renewal line</li>
              <li>Restaurant walk-in waitlist coverage</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Trust and safety</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Live status tracking and check-ins</li>
              <li>Handoff confirmations</li>
              <li>Photo verification placeholders</li>
              <li>Two-way ratings and issue reporting</li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">FAQ</h3>
            <p className="mt-2 text-sm text-slate-600">
              Customers do not need Stripe accounts to pay. Line holders can use
              Stripe payouts or manual payout methods while category support
              expands across events, retail, services, and travel.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
