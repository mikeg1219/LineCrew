import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative flex min-h-[min(90vh,900px)] flex-1 flex-col overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/airport-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
        <header className="relative z-10 border-b border-white/10 bg-black/20">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <span className="text-xl font-bold tracking-tight text-white">
              LineCrew
            </span>
            <Link
              href="/auth"
              className="text-sm text-white/80 transition hover:text-white"
            >
              Sign in
            </Link>
          </div>
        </header>
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6 sm:py-24">
          <h1 className="mb-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Skip airport lines. We&apos;ll hold your place.
          </h1>
          <p className="mb-10 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            Book a real person to stand in line for you at check-in, security, or
            the gate. You show up when it&apos;s your turn.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/auth?intent=customer"
              className="rounded-xl bg-amber-400 px-8 py-4 text-center text-sm font-bold text-black shadow-sm transition hover:bg-amber-300 sm:text-base"
            >
              Book a line holder
            </Link>
            <Link
              href="/auth?intent=waiter"
              className="rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-center text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 sm:text-base"
            >
              Earn by waiting
            </Link>
          </div>
          <div className="mt-10 flex max-w-lg flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/85">
            <span className="inline-flex items-center gap-1.5">
              <span className="text-emerald-400" aria-hidden>
                ✔
              </span>
              Verified waiters
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
            Most jobs accepted in 3–10 minutes
          </p>
        </main>
      </div>

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
              <h3 className="font-semibold text-slate-900">Post your job</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Airport, line type, and what you need—takes a minute.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
                2
              </div>
              <h3 className="font-semibold text-slate-900">We hold your place</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                A Waiter stands in line and keeps you updated.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
                3
              </div>
              <h3 className="font-semibold text-slate-900">You walk up</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Show up when it&apos;s your turn—swap in, done.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-t border-slate-200 bg-slate-50 py-14 sm:py-16"
        aria-labelledby="use-cases-heading"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2
            id="use-cases-heading"
            className="text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
          >
            Use cases
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600 sm:text-base">
            LineCrew helps when time at the airport is tight.
          </p>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Missed connection",
              "Security line",
              "Traveling with kids",
              "Business traveler",
              "Rental car lines",
            ].map((label) => (
              <li
                key={label}
                className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-center text-sm font-medium text-slate-800 shadow-sm"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
