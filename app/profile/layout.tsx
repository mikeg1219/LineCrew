import { signOut } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileForUser } from "@/lib/ensure-profile";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProfileLayout({
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

  await ensureProfileForUser(
    supabase,
    user.id,
    user.user_metadata as Record<string, unknown> | undefined
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const roleLabel =
    profile?.role === "waiter"
      ? "Waiter"
      : profile?.role === "customer"
        ? "Customer"
        : null;

  const dashboardHref =
    profile?.role === "waiter"
      ? "/dashboard/waiter"
      : profile?.role === "customer"
        ? "/dashboard/customer"
        : "/dashboard";

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="text-lg font-semibold tracking-tight text-blue-700 hover:text-blue-800"
            >
              LineCrew
            </Link>
            <span className="hidden text-slate-300 sm:inline" aria-hidden>
              /
            </span>
            <span className="text-sm font-medium text-slate-800">Profile</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={dashboardHref}
              className="font-medium text-blue-700 transition hover:text-blue-800"
            >
              Dashboard
            </Link>
            {roleLabel ? (
              <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800">
                {roleLabel}
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-900">
                Account setup
              </span>
            )}
            <span
              className="max-w-[220px] truncate text-slate-600"
              title={user.email ?? ""}
            >
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
