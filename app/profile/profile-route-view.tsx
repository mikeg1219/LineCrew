import { ProfileSettingsForm } from "@/app/profile/profile-settings-form";
import { AVATAR_STORAGE_BUCKET, avatarPublicUrlWithBust } from "@/lib/avatar-storage";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileForUser } from "@/lib/ensure-profile";
import { profileResolvedLabel } from "@/lib/profile-display-name";
import { redirect } from "next/navigation";

/**
 * Shared profile settings UI for `/dashboard/profile` and `/profile` (same compact layout).
 */
export default async function ProfileRouteView({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp =
    (await (searchParams ?? Promise.resolve({}))) as Record<
      string,
      string | string[] | undefined
    >;
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

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const connectRaw = sp.connect;
  const connect = Array.isArray(connectRaw) ? connectRaw[0] : connectRaw;
  const stripeSyncForce = connect === "return" || connect === "refresh";
  const profileRequiredRaw = sp.profile_required;
  const profileRequiredGate =
    (Array.isArray(profileRequiredRaw)
      ? profileRequiredRaw[0]
      : profileRequiredRaw) === "1";

  const profile = profileRow;

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

  const display = profileResolvedLabel(
    profile ?? null,
    user.email,
    user.user_metadata as Record<string, unknown> | undefined
  );

  const role = profile?.role;
  const roleLabel =
    role === "waiter"
      ? "Line Holder"
      : role === "customer"
        ? "Customer"
        : "Account";

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8">
      {profileRequiredGate ? (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm leading-relaxed text-amber-950 shadow-sm"
          role="status"
        >
          <span className="font-semibold">Almost there.</span> Save your first
          name, display name, and phone number below to unlock bookings and
          booking tools on your dashboard.
        </div>
      ) : null}
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
              ? "Your account, photo, service areas, and settings for accepting bookings."
              : "Manage how you show up across LineCrew."}
        </p>
      </header>

      <ProfileSettingsForm
        compactAvatar
        stripeSyncForce={stripeSyncForce}
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
