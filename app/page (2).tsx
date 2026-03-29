import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">

      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/airport-bg.jpg')" }}
      />

      {/* Dark overlay - gradient from bottom-heavy dark to lighter top */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />

      {/* Subtle gold tint overlay for warmth */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-amber-900/20" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span
              className="text-xl font-bold tracking-tight text-white"
              style={{ fontFamily: "'Georgia', serif", letterSpacing: "-0.5px" }}
            >
              SaveMySpot
            </span>
            <span className="hidden sm:inline-block text-xs font-medium uppercase tracking-widest text-amber-400/80 ml-2 border border-amber-400/30 px-2 py-0.5 rounded">
              Beta
            </span>
          </div>
          <Link
            href="/auth"
            className="text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">

        {/* Eyebrow label */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Airport Security Line Marketplace
          </span>
        </div>

        {/* Main headline */}
        <h1
          className="max-w-3xl text-5xl font-bold text-white sm:text-6xl md:text-7xl leading-none mb-6"
          style={{ fontFamily: "'Georgia', serif", letterSpacing: "-2px" }}
        >
          Skip the wait.
          <br />
          <span className="text-amber-400">Someone&apos;s</span>
          <br />
          already in line.
        </h1>

        {/* Subheadline */}
        <p className="mb-10 max-w-xl text-lg text-white/70 leading-relaxed">
          Book a <span className="text-white font-medium">Waiter</span> to hold your spot
          in airport security lines. Show up when it&apos;s your turn — skip the stress.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-md justify-center">
          <Link
            href="/auth?intent=customer"
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-amber-400 px-8 py-4 text-base font-bold text-black shadow-lg shadow-amber-400/20 transition hover:bg-amber-300 hover:shadow-amber-300/30"
          >
            I need a Waiter
          </Link>
          <Link
            href="/auth?intent=waiter"
            className="flex-1 inline-flex items-center justify-center rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 hover:border-white/50"
          >
            Earn as a Waiter
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-white/40 text-sm">
          <span>✈ ATL · DFW · DEN · ORD · LAX</span>
          <span className="hidden sm:inline">·</span>
          <span>JFK · LAS · MCO · CLT · SEA</span>
        </div>
      </main>

      {/* Stats bar */}
      <div className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-5 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-amber-400" style={{ fontFamily: "'Georgia', serif" }}>47 min</div>
            <div className="text-xs text-white/40 uppercase tracking-wider mt-0.5">Avg ATL wait today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400" style={{ fontFamily: "'Georgia', serif" }}>$10+</div>
            <div className="text-xs text-white/40 uppercase tracking-wider mt-0.5">Starting price</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400" style={{ fontFamily: "'Georgia', serif" }}>10</div>
            <div className="text-xs text-white/40 uppercase tracking-wider mt-0.5">Major airports</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-4 text-center text-xs text-white/30">
        © {new Date().getFullYear()} SaveMySpot · 20% platform fee per booking
      </footer>

    </div>
  );
}
