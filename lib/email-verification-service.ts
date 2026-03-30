import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateResetToken,
  generateSixDigitCode,
  hashEmailVerificationCode,
  hashEmailVerificationRateLimit,
  hashEmailVerificationToken,
  normalizeEmail,
} from "@/lib/password-reset-crypto";
import { sendEmailVerificationEmail } from "@/lib/send-email-verification-email";
import type { UserRole } from "@/lib/types";

const LINK_MS = 24 * 60 * 60 * 1000;
const CODE_MS = 10 * 60 * 1000;
const MAX_RESENDS_PER_EMAIL_PER_HOUR = 5;

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function intentQuery(role: UserRole): string {
  return role === "customer" || role === "waiter"
    ? `&intent=${encodeURIComponent(role)}`
    : "";
}

async function markUserEmailVerified(userId: string): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin
    .from("profiles")
    .update({ email_verified_at: now })
    .eq("id", userId);
  await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  await admin
    .from("email_verification_tokens")
    .update({ used_at: now })
    .eq("user_id", userId)
    .is("used_at", null);
}

export async function sendEmailVerificationForNewUser(
  userId: string,
  email: string,
  role: UserRole
): Promise<boolean> {
  try {
    const normalized = normalizeEmail(email);
    const admin = createAdminClient();
    const now = new Date();
    const plainToken = generateResetToken();
    const plainCode = generateSixDigitCode();
    const tokenHash = hashEmailVerificationToken(plainToken);
    const codeHash = hashEmailVerificationCode(plainCode, userId);
    const expiresAt = new Date(now.getTime() + LINK_MS);
    const codeExpiresAt = new Date(now.getTime() + CODE_MS);

    await admin
      .from("email_verification_tokens")
      .delete()
      .eq("user_id", userId)
      .is("used_at", null);

    const { error: insErr } = await admin
      .from("email_verification_tokens")
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        code_hash: codeHash,
        expires_at: expiresAt.toISOString(),
        code_expires_at: codeExpiresAt.toISOString(),
      });

    if (insErr) {
      console.error(
        "[email verification] Token insert failed:",
        insErr.message,
        insErr.code ?? ""
      );
      return false;
    }

    const base = appBaseUrl();
    const verifyUrl = `${base}/auth/verify-email?token=${encodeURIComponent(plainToken)}${intentQuery(role)}&email=${encodeURIComponent(normalized)}`;

    const sendResult = await sendEmailVerificationEmail({
      to: normalized,
      verifyUrl,
      code: plainCode,
    });

    if (!sendResult.ok) {
      if ("skipped" in sendResult && sendResult.skipped) {
        console.error(
          "[email verification] Email not sent: RESEND_API_KEY is not set."
        );
      } else if ("error" in sendResult) {
        console.error(
          "[email verification] Resend API error:",
          sendResult.error
        );
      }
      await admin
        .from("email_verification_tokens")
        .delete()
        .eq("token_hash", tokenHash);
      return false;
    }
    return true;
  } catch (e) {
    console.error(
      "[email verification] sendEmailVerificationForNewUser failed:",
      e
    );
    return false;
  }
}

export type ResendEmailVerificationResult =
  | { ok: true }
  | { ok: false; error: string };

export async function resendEmailVerificationFlow(
  rawEmail: string,
  role: UserRole
): Promise<ResendEmailVerificationResult> {
  const email = normalizeEmail(rawEmail);
  if (!email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      ok: false,
      error:
        "We couldn’t send the verification email right now. Please try again.",
    };
  }

  const emailHash = hashEmailVerificationRateLimit(email);
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const { count, error: countErr } = await admin
    .from("email_verification_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("email_hash", emailHash)
    .gte("created_at", hourAgo.toISOString());

  if (countErr) {
    return {
      ok: false,
      error:
        "We couldn’t send the verification email right now. Please try again.",
    };
  }

  if ((count ?? 0) >= MAX_RESENDS_PER_EMAIL_PER_HOUR) {
    return {
      ok: false,
      error: "Too many resend attempts. Try again in about an hour.",
    };
  }

  await admin.from("email_verification_rate_limits").insert({
    email_hash: emailHash,
  });

  const { data: userId, error: rpcErr } = await admin.rpc(
    "auth_user_id_by_email",
    { p_email: email }
  );

  if (rpcErr || userId == null || typeof userId !== "string") {
    return {
      ok: false,
      error:
        "We couldn’t find that account. Check the email or sign up again.",
    };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email_verified_at")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.email_verified_at) {
    return { ok: true };
  }

  const sent = await sendEmailVerificationForNewUser(userId, email, role);
  if (!sent) {
    return {
      ok: false,
      error:
        "We couldn’t send the verification email right now. Please try again.",
    };
  }
  return { ok: true };
}

export type VerifyTokenResult =
  | { ok: true }
  | {
      ok: false;
      reason: "invalid" | "expired" | "already_verified";
    };

export async function verifyEmailTokenFromLink(
  plainToken: string
): Promise<VerifyTokenResult> {
  if (!plainToken) {
    return { ok: false, reason: "invalid" };
  }

  const tokenHash = hashEmailVerificationToken(plainToken);
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("email_verification_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, reason: "invalid" };
  }
  if (row.used_at) {
    return { ok: false, reason: "invalid" };
  }
  if (new Date(row.expires_at) < new Date()) {
    return { ok: false, reason: "expired" };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email_verified_at")
    .eq("id", row.user_id)
    .maybeSingle();

  if (profile?.email_verified_at) {
    return { ok: false, reason: "already_verified" };
  }

  await markUserEmailVerified(row.user_id);
  return { ok: true };
}

export type VerifyCodeResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "already_verified" };

export async function verifyEmailWithCode(
  rawEmail: string,
  codeDigits: string
): Promise<VerifyCodeResult> {
  const email = normalizeEmail(rawEmail);
  const digits = codeDigits.replace(/\D/g, "").slice(0, 6);
  if (digits.length !== 6) {
    return { ok: false, reason: "invalid" };
  }

  const admin = createAdminClient();
  const { data: userId, error: rpcErr } = await admin.rpc(
    "auth_user_id_by_email",
    { p_email: email }
  );

  if (rpcErr || userId == null || typeof userId !== "string") {
    return { ok: false, reason: "invalid" };
  }

  const codeHash = hashEmailVerificationCode(digits, userId);

  const { data: profile } = await admin
    .from("profiles")
    .select("email_verified_at")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.email_verified_at) {
    return { ok: false, reason: "already_verified" };
  }

  const { data: row, error } = await admin
    .from("email_verification_tokens")
    .select("user_id, code_expires_at, used_at")
    .eq("user_id", userId)
    .eq("code_hash", codeHash)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, reason: "invalid" };
  }
  if (new Date(row.code_expires_at) < new Date()) {
    return { ok: false, reason: "expired" };
  }

  await markUserEmailVerified(row.user_id);
  return { ok: true };
}
