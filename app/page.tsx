import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/airport-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
      <header className="relative z-10 border-b border-white/10 bg-black/20">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-xl font-bold text-white">SaveMySpot</span>
          <Link href="/auth" className="text-sm text-white/80 hover:text-white">Sign in</Link>
        </div>
      </header>
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-white mb-6">
          Skip the wait.<br />
          <span className="text-amber-400">Someone&apos;s already in line.</span>
        </h1>
        <p className="mb-10 max-w-xl text-lg text-white/70">
          Book a Waiter to hold your spot in airport security lines.
        </p>
        <div className="flex gap-4">
          <Link href="/auth?intent=customer" className="rounded-xl bg-amber-400 px-8 py-4 font-bold text-black">
            I need a Waiter
          </Link>
          <Link href="/auth?intent=waiter" className="rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-white">
            Earn as a Waiter
          </Link>
        </div>
      </main>
    </div>
  );
}
