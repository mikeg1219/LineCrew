import { ProfileSettingsForm } from "@/app/profile/profile-settings-form";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileForUser } from "@/lib/ensure-profile";
import { redirect } from "next/navigation";

export default async function DashboardProfilePage() {
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
    .select("role, first_name, full_name, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  let avatarPublic: string | null = null;
  if (profile?.avatar_url) {
    const { data: pub } = supabase.storage
      .from("avatars")
      .getPublicUrl(profile.avatar_url);
    avatarPublic = pub.publicUrl;
  }

  const display =
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    profile?.first_name?.trim() ||
    user.email?.split("@")[0] ||
    "Account";

  const role = profile?.role;
  const roleLabel =
    role === "waiter"
      ? "Line Holder"
      : role === "customer"
        ? "Customer"
        : "Account";

  const initial = display.slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8">
      <header className="mb-8 sm:mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Account
        </p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Profile &amp; settings
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
          Manage how you show up across LineCrew.
        </p>
      </header>

      <section className="relative mb-10 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/90 to-blue-50/40 p-6 shadow-sm ring-1 ring-slate-900/5 sm:p-10">
        <div
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-blue-400/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-indigo-400/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-8 text-center sm:flex-row sm:items-center sm:text-left">
          <div className="relative shrink-0">
            <span
              className="absolute -inset-1 rounded-full bg-gradient-to-br from-blue-500/25 via-transparent to-indigo-500/20 blur-md"
              aria-hidden
            />
            {avatarPublic ? (
              <img
                src={avatarPublic}
                alt=""
                className="relative size-28 rounded-full object-cover shadow-xl ring-4 ring-white sm:size-32"
              />
            ) : (
              <div className="relative flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-3xl font-bold text-white shadow-xl ring-4 ring-white sm:size-32 sm:text-4xl">
                {initial}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {display}
            </p>
            {user.email ? (
              <p className="mt-2 truncate text-sm text-slate-600">{user.email}</p>
            ) : null}
            <p className="mt-4 flex justify-center sm:justify-start">
              <span className="inline-flex rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-blue-900 shadow-sm ring-1 ring-blue-200/80">
                {roleLabel}
              </span>
            </p>
          </div>
        </div>
      </section>

      <ProfileSettingsForm compactAvatar />
    </div>
  );
}
