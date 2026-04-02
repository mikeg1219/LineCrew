import { AuthenticatedAppHeader } from "@/components/authenticated-app-header";
import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { AVATAR_STORAGE_BUCKET, avatarPublicUrlWithBust } from "@/lib/avatar-storage";
import { needsOnboardingRedirect } from "@/lib/onboarding-progress";
import { createClient } from "@/lib/supabase/server";
import {
  ensureProfileForUser,
  syncEmailVerifiedFromAuth,
} from "@/lib/ensure-profile";
import { getBookingDraftCookie } from "@/lib/booking-draft-cookie";
import { profileResolvedLabel } from "@/lib/profile-display-name";
import { redirect } from "next/navigation";

/**
 * Shared shell for `/dashboard/*` and `/profile` — slate gradient page bg + app header.
 */
export async function AuthenticatedAppShell({
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
  await syncEmailVerifiedFromAuth(supabase, user);

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!isEmailVerifiedForApp(profileErr ? null : profile, user)) {
    const q = new URLSearchParams({ pending: "1" });
    if (user.email) q.set("email", user.email);
    redirect(`/onboarding/verify?${q.toString()}`);
  }

  const onboardingRedirect = needsOnboardingRedirect(profile ?? null, user);
  if (onboardingRedirect) {
    const q = new URLSearchParams({ pending: "1" });
    if (user.email) q.set("email", user.email);
    redirect(`${onboardingRedirect}?${q.toString()}`);
  }

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

  const displayName = profileResolvedLabel(
    profile ?? null,
    user.email,
    user.user_metadata as Record<string, unknown> | undefined
  );

  const role =
    profile?.role === "waiter" || profile?.role === "customer"
      ? profile.role
      : null;

  let hasBookingDraft = false;
  if (role === "customer") {
    const draft = await getBookingDraftCookie();
    hasBookingDraft = draft != null;
  }

  return (
    <div className="linecrew-bg-dashboard flex min-h-full flex-col">
      <AuthenticatedAppHeader
        email={user.email ?? null}
        role={role}
        avatarUrl={avatarPublic}
        displayName={displayName}
        hasBookingDraft={hasBookingDraft}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
