"use server";

import {
  resendEmailVerificationFlow,
  verifyEmailWithCode,
} from "@/lib/email-verification-service";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type ResendVerificationState =
  | { error: string }
  | {
      success: true;
      message: string;
    }
  | null;

export async function resendVerificationEmailAction(
  _prev: ResendVerificationState,
  formData: FormData
): Promise<ResendVerificationState> {
  const email = String(formData.get("email") ?? "").trim();
  const roleRaw = formData.get("role");
  const role: UserRole =
    roleRaw === "waiter" || roleRaw === "customer" ? roleRaw : "customer";

  if (!email) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const fromSession = user?.email?.trim();
    if (!fromSession) {
      return { error: "Email is required." };
    }
    const result = await resendEmailVerificationFlow(fromSession, role);
    if (!result.ok) {
      return { error: result.error };
    }
    return {
      success: true,
      message:
        "If your account still needs verification, we sent another email.",
    };
  }

  const result = await resendEmailVerificationFlow(email, role);
  if (!result.ok) {
    return { error: result.error };
  }

  return {
    success: true,
    message:
      "If your account still needs verification, we sent another email.",
  };
}

export type ConfirmVerificationCodeState =
  | { error: string }
  | { success: true }
  | null;

export async function confirmVerificationCodeAction(
  _prev: ConfirmVerificationCodeState,
  formData: FormData
): Promise<ConfirmVerificationCodeState> {
  const email = String(formData.get("email") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();

  if (!email || !code) {
    return { error: "Email and verification code are required." };
  }

  const result = await verifyEmailWithCode(email, code);

  if (!result.ok) {
    if (result.reason === "expired") {
      return {
        error:
          "Verification code has expired. Use resend or request a new link from sign up.",
      };
    }
    if (result.reason === "already_verified") {
      return {
        error: "This account is already verified. You can sign in.",
      };
    }
    return { error: "Invalid email or verification code." };
  }

  return { success: true };
}
