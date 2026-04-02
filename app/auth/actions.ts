"use server";

import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { isAdminEmail } from "@/lib/admin-config";
import { needsOnboardingRedirect } from "@/lib/onboarding-progress";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

async function redirectToRoleDashboard(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  if (user.email && isAdminEmail(user.email)) {
    redirect("/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const onboardingRedirect = needsOnboardingRedirect(profile ?? null, user);
  if (onboardingRedirect) {
    const q = new URLSearchParams({ pending: "1" });
    if (user.email) q.set("email", user.email);
    redirect(`${onboardingRedirect}?${q.toString()}`);
  }

  if (profile?.role === "customer" || profile?.role === "waiter") {
    redirect(`/dashboard/${profile.role}`);
  }

  redirect("/dashboard");
}

export type AuthActionState = { error: string } | null;

export async function authAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Email and password are required.",
    };
  }

  const supabase = await createClient();

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Invalid email or password" };
  }

  const sessionUser = signInData.user;
  const uid = sessionUser?.id;
  if (!uid || !sessionUser) {
    return { error: "Invalid email or password" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  if (profileError) {
    console.error("[auth] profile fetch on sign-in:", profileError.message);
  }

  if (!isEmailVerifiedForApp(profileError ? null : profile, sessionUser)) {
    await supabase.auth.signOut();
    return { error: "Please verify your email before signing in" };
  }

  revalidatePath("/", "layout");

  if (sessionUser.email && isAdminEmail(sessionUser.email)) {
    redirect("/admin");
  }

  const onboardingRedirect = needsOnboardingRedirect(
    profile ?? null,
    sessionUser
  );
  if (onboardingRedirect) {
    const q = new URLSearchParams({ pending: "1" });
    if (sessionUser.email) q.set("email", sessionUser.email);
    redirect(`${onboardingRedirect}?${q.toString()}`);
  }

  await redirectToRoleDashboard(supabase);
  return null;
}
