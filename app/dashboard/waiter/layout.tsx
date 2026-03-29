import { createClient } from "@/lib/supabase/server";
import { isWaiterProfileComplete } from "@/lib/waiter-profile-complete";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function WaiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, first_name, avatar_url, phone, bio, serving_airports, onboarding_completed, email_verified_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "customer") {
    redirect("/dashboard/customer");
  }

  const showBanner =
    profile?.role === "waiter" &&
    !isWaiterProfileComplete(profile);

  return (
    <>
      {showBanner && (
        <div
          className="border-b border-amber-200/90 bg-gradient-to-r from-amber-50 to-amber-50/80 shadow-sm"
          role="status"
        >
          <div className="mx-auto max-w-5xl border-l-4 border-amber-500 px-4 py-3 sm:py-3.5">
            <p className="text-sm leading-relaxed text-amber-950">
              <span className="font-semibold text-amber-900">
                Complete onboarding to accept jobs
              </span>
              <span className="text-amber-950/95">
                {" "}
                — Add your first name, profile photo, phone, short bio, at least
                one airport you serve, and verify your email. This helps
                travelers trust you.
              </span>
            </p>
            <p className="mt-2 text-center sm:text-left">
              <Link
                href="/profile"
                className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
              >
                Finish profile
              </Link>
            </p>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
