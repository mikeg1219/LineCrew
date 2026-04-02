import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OnboardingVerifyEmailPage({ searchParams }: Props) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      if (v[0]) params.set(k, v[0]);
    } else if (typeof v === "string") {
      params.set(k, v);
    }
  });
  redirect(`/onboarding/verify${params.toString() ? `?${params.toString()}` : ""}`);
}
