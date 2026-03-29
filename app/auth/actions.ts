"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmailVerificationForNewUser } from "@/lib/email-verification-service";
import type { UserRole } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

async function redirectToRoleDashboard(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "customer" || profile?.role === "waiter") {
    redirect(`/dashboard/${profile.role}`);
  }

  redirect("/dashboard");
}

export type AuthActionState =
  | { error: string; mode: "signin" | "signup" }
  | {
      mode: "signup";
      step: "verify";
      email: string;
      role: UserRole;
    }
  | null;

export async function authAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const mode = formData.get("mode");
  const authMode: "signin" | "signup" =
    mode === "signup" ? "signup" : "signin";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Email and password are required.",
      mode: authMode,
    };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    const confirm = String(formData.get("confirm_password") ?? "");
    if (password !== confirm) {
      return {
        error: "Passwords do not match.",
        mode: authMode,
      };
    }

    const roleRaw = formData.get("role");
    const role: UserRole =
      roleRaw === "waiter" || roleRaw === "customer" ? roleRaw : "customer";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
      },
    });

    if (error) {
      return { error: error.message, mode: authMode };
    }

    const userId = data.user?.id;

    if (userId) {
      try {
        await sendEmailVerificationForNewUser(userId, email, role);
      } catch {
        // non-fatal; user may retry resend
      }
    }

    revalidatePath("/", "layout");

    if (data.session) {
      const intentQ =
        role === "customer" || role === "waiter"
          ? `&intent=${encodeURIComponent(role)}`
          : "";
      redirect(`/auth/verify-email?pending=1${intentQ}`);
    }

    return {
      mode: "signup",
      step: "verify",
      email,
      role,
    };
  }

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message, mode: authMode };
  }

  revalidatePath("/", "layout");

  const uid = signInData.user?.id;
  if (uid) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email_verified_at")
      .eq("id", uid)
      .maybeSingle();

    if (
      !profileError &&
      profile &&
      !profile.email_verified_at
    ) {
      redirect("/auth/verify-email?pending=1");
    }
  }

  await redirectToRoleDashboard(supabase);
  return null;
}
