import { isCustomerProfileComplete } from "@/lib/customer-profile-complete";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CustomerLayout({
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
      "role, first_name, display_name, full_name, phone, profile_completed"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "waiter") {
    redirect("/dashboard/waiter");
  }

  const showBanner =
    profile?.role === "customer" && !isCustomerProfileComplete(profile);

  return (
    <>
      {showBanner && (
        <div className="border-b border-slate-200/90 bg-slate-50/95">
          <div className="mx-auto max-w-5xl px-4 py-2.5 sm:py-3">
            <p className="text-center text-sm leading-relaxed text-slate-700">
              <span className="font-medium text-slate-800">
                Complete your profile
              </span>{" "}
              so Line Holders can recognize you and reach you reliably. Add your
              name and phone in{" "}
              <Link
                href="/profile"
                className="font-semibold text-blue-700 underline decoration-blue-700/30 underline-offset-2 transition hover:text-blue-800"
              >
                Profile settings
              </Link>
              .
            </p>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
