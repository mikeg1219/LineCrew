import { OnboardingProgress } from "@/app/onboarding/_components/onboarding-progress";
import { CenteredGradientCardShell } from "@/components/centered-gradient-card-shell";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

type OnboardingIndexProps = {
  searchParams: Promise<{ role?: string | string[] }>;
};

function RoleCard({
  href,
  title,
  description,
  buttonLabel,
  dark,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  buttonLabel: string;
  dark?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5 shadow-sm">
      <div className="mb-4">{icon}</div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
      <Link
        href={href}
        className={`mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold ${
          dark
            ? "bg-slate-900 text-white hover:bg-slate-800"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {buttonLabel}
      </Link>
    </div>
  );
}

export default async function OnboardingIndexPage({
  searchParams,
}: OnboardingIndexProps) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.role) ? sp.role[0] : sp.role;
  if (raw === "customer" || raw === "waiter") {
    redirect(`/onboarding/account?role=${encodeURIComponent(raw)}`);
  }

  return (
    <CenteredGradientCardShell>
      <div>
        <div className="mb-5 flex justify-center">
          <Image
            src="/linecrew-logo.png"
            alt="LineCrew.ai"
            width={170}
            height={52}
            className="h-10 w-auto"
            priority
          />
        </div>
        <OnboardingProgress currentStep={1} title="Create account" />
        <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
          How will you use LineCrew?
        </h1>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <RoleCard
            href="/onboarding/account?role=customer"
            title="I need a Line Holder"
            description="Book someone to hold your spot at airports, concerts, and more."
            buttonLabel="Sign up as Customer"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-10 w-10 text-blue-700"
                aria-hidden
              >
                <circle cx="7" cy="6.5" r="2.5" />
                <path d="M4.5 14c.5-2 1.7-3 2.5-3s2 .9 2.5 3" />
                <circle cx="15.5" cy="8" r="2.2" />
                <path d="M13.8 14.2c.4-1.6 1.4-2.5 1.9-2.5.7 0 1.7.7 2.3 2.5" />
                <path d="M4 18h16" />
              </svg>
            }
          />
          <RoleCard
            href="/onboarding/account?role=waiter"
            title="I want to earn money"
            description="Hold spots in line and get paid after each completed booking."
            buttonLabel="Sign up as Line Holder"
            dark
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-10 w-10 text-slate-800"
                aria-hidden
              >
                <circle cx="12" cy="5.8" r="2.6" />
                <path d="M12 9v5.2M9 21l3-6 3 6M8.5 12.8h7" />
              </svg>
            }
          />
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/auth" className="font-medium text-blue-700 hover:text-blue-800">
            Sign in
          </Link>
        </p>
      </div>
    </CenteredGradientCardShell>
  );
}
