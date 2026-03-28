import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-slate-50 via-white to-blue-50/40">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            LineCrew
          </span>
          <Link
            href="/auth"
            className="text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-blue-700">
          Airport line marketplace
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Skip the wait. Someone&apos;s already in line.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
          LineCrew connects <span className="font-medium text-slate-800">Customers</span>{" "}
          who need a place in airport lines with{" "}
          <span className="font-medium text-slate-800">Waiters</span> who wait on their
          behalf. Post a job, match with a Waiter, and get through faster — the platform
          takes a small fee on each completed booking.
        </p>

        <div className="mt-10 flex w-full max-w-md flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/auth?intent=customer"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            I need a Waiter
          </Link>
          <Link
            href="/auth?intent=waiter"
            className="inline-flex flex-1 items-center justify-center rounded-xl border-2 border-blue-600 bg-white px-6 py-3.5 text-base font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
          >
            I want to be a Waiter
          </Link>
        </div>

        <p className="mt-12 text-sm text-slate-500">
          LineCrew keeps a 20% platform fee on each transaction.
        </p>
      </main>

      <footer className="border-t border-slate-200/80 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} LineCrew
      </footer>
    </div>
  );
}
