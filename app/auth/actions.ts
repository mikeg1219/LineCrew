"use server";

import { isEmailVerifiedForApp } from "@/lib/auth-email-verified";
import { sendEmailVerificationForNewUser } from "@/lib/email-verification-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/password-reset-crypto";
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

    let userId =
      data.user?.id ?? data.session?.user?.id ?? null;

    if (!userId) {
      try {
        const admin = createAdminClient();
        const { data: uid, error: rpcErr } = await admin.rpc(
          "auth_user_id_by_email",
          { p_email: normalizeEmail(email) }
        );
        if (rpcErr) {
          console.error(
            "[auth] auth_user_id_by_email failed after sign-up:",
            rpcErr.message
          );
        } else if (typeof uid === "string") {
          userId = uid;
        }
      } catch (e) {
        console.error(
          "[auth] Could not resolve user id after sign-up (admin client):",
          e
        );
      }
    }

    let verificationSent = false;
    if (userId) {
      verificationSent = await sendEmailVerificationForNewUser(
        userId,
        email,
        role
      );
      if (!verificationSent) {
        console.error(
          "[auth] Verification email was not sent after sign-up. Check RESEND_API_KEY, RESEND_FROM, SUPABASE_SERVICE_ROLE_KEY, email_verification_tokens table, and server logs above for token insert or Resend errors."
        );
      }
    } else {
      console.error(
        "[auth] Sign-up returned no user id and lookup failed; verification email was not sent. Email:",
        normalizeEmail(email),
        "If Supabase requires email confirmation, ensure the user row exists in auth.users or run auth_user_id_by_email migration."
      );
    }

    revalidatePath("/", "layout");

    const intentQ =
      role === "customer" || role === "waiter"
        ? `&intent=${encodeURIComponent(role)}`
        : "";
    const sendFailedQ =
      userId && !verificationSent ? "&send_failed=1" : "";
    redirect(
      `/auth/verify-email?pending=1&email=${encodeURIComponent(email)}${intentQ}${sendFailedQ}`
    );
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
  const sessionUser = signInData.user;
  if (uid && sessionUser) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email_verified_at")
      .eq("id", uid)
      .maybeSingle();

    if (
      !profileError &&
      profile &&
      !isEmailVerifiedForApp(profile, sessionUser)
    ) {
      redirect(
        `/auth/verify-email?pending=1&email=${encodeURIComponent(email)}`
      );
    }
  }

  await redirectToRoleDashboard(supabase);
  return null;
}
