"use server";

import {
  completePasswordReset,
  requestPasswordResetFlow,
  validateResetCode,
  validateResetToken,
} from "@/lib/password-reset-service";

export type ResetPasswordState =
  | { error: string }
  | {
      success: true;
      message: string;
    }
  | null;

export async function requestPasswordResetAction(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Email is required." };
  }

  const intentRaw = formData.get("intent");
  const intentSegment =
    intentRaw === "customer" || intentRaw === "waiter"
      ? `&intent=${intentRaw}`
      : "";

  try {
    await requestPasswordResetFlow(email, intentSegment);
  } catch {
    // generic response — no enumeration
  }

  return {
    success: true,
    message:
      "If an account exists for that email, a reset email has been sent.",
  };
}

export type CompleteResetPasswordState =
  | { error: string }
  | { success: true }
  | null;

export async function completePasswordResetAction(
  _prev: CompleteResetPasswordState,
  formData: FormData
): Promise<CompleteResetPasswordState> {
  const token = String(formData.get("token") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  let userId: string;

  if (token) {
    const v = await validateResetToken(token);
    if (!v.ok) {
      if (v.reason === "expired") {
        return {
          error:
            "This reset link has expired. Request a new password reset from sign in.",
        };
      }
      return {
        error:
          "This reset link is invalid or has already been used. Request a new reset email.",
      };
    }
    userId = v.userId;
  } else {
    if (!email) {
      return { error: "Email is required when using a verification code." };
    }
    const v = await validateResetCode(email, code);
    if (!v.ok) {
      if (v.reason === "expired") {
        return {
          error:
            "Verification code has expired. Request a new password reset from sign in.",
        };
      }
      return {
        error: "Invalid email or verification code.",
      };
    }
    userId = v.userId;
  }

  const result = await completePasswordReset(userId, password);
  if (!result.ok) {
    return { error: result.error };
  }

  return { success: true };
}
