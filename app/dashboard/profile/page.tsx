import { ProfileSettingsForm } from "@/app/profile/profile-settings-form";
import { AVATAR_STORAGE_BUCKET, avatarPublicUrlWithBust } from "@/lib/avatar-storage";
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
    .select("role, first_name, full_name, display_name, avatar_url, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  let avatarPublic: string | null = null;
  if (profile?.avatar_url) {
    const { data: pub } = supabase.storage
      .from(AVATAR_STORAGE_BUCKET)
      .getPublicUrl(profile.avatar_url);
    avatarPublic = avatarPublicUrlWithBust(
      pub.publicUrl,
      profile.updated_at ?? null
    );
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

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8">
      <header className="mb-8 sm:mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Account
        </p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {role === "customer"
            ? "Traveler profile & settings"
            : role === "waiter"
              ? "Line Holder profile & settings"
              : "Profile & settings"}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
          {role === "customer"
            ? "Your account, photo, and preferences for line requests and bookings."
            : role === "waiter"
              ? "Your account, photo, and airports for accepting bookings."
              : "Manage how you show up across LineCrew."}
        </p>
      </header>

      <ProfileSettingsForm
        compactAvatar
        heroFallback={{
          display,
          email: user.email ?? null,
          roleLabel,
          initial: display.slice(0, 1).toUpperCase(),
          avatarUrl: avatarPublic,
        }}
      />
    </div>
  );
}
