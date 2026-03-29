import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateResetToken,
  generateSixDigitCode,
  hashEmailForRateLimit,
  hashResetCode,
  hashResetToken,
  normalizeEmail,
} from "@/lib/password-reset-crypto";
import { sendPasswordResetEmail } from "@/lib/send-password-reset-email";

const TOKEN_MS = 20 * 60 * 1000;
const CODE_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_EMAIL_PER_HOUR = 5;

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export async function requestPasswordResetFlow(
  rawEmail: string,
  intentSegment: string
): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!email || !email.includes("@")) {
    return;
  }

  const emailHash = hashEmailForRateLimit(email);
  const admin = createAdminClient();
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const { count, error: countErr } = await admin
    .from("password_reset_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("email_hash", emailHash)
    .gte("created_at", hourAgo.toISOString());

  if (countErr) {
    return;
  }

  if ((count ?? 0) >= MAX_REQUESTS_PER_EMAIL_PER_HOUR) {
    return;
  }

  await admin.from("password_reset_rate_limits").insert({
    email_hash: emailHash,
  });

  const { data: userId, error: rpcErr } = await admin.rpc(
    "auth_user_id_by_email",
    { p_email: email }
  );

  if (rpcErr || userId == null || typeof userId !== "string") {
    return;
  }

  const plainToken = generateResetToken();
  const plainCode = generateSixDigitCode();
  const tokenHash = hashResetToken(plainToken);
  const codeHash = hashResetCode(plainCode, userId);

  const expiresAt = new Date(now.getTime() + TOKEN_MS);
  const codeExpiresAt = new Date(now.getTime() + CODE_MS);

  await admin
    .from("password_reset_tokens")
    .delete()
    .eq("user_id", userId)
    .is("used_at", null);

  const { error: insErr } = await admin.from("password_reset_tokens").insert({
    user_id: userId,
    token_hash: tokenHash,
    code_hash: codeHash,
    expires_at: expiresAt.toISOString(),
    code_expires_at: codeExpiresAt.toISOString(),
  });

  if (insErr) {
    return;
  }

  const base = appBaseUrl();
  const resetUrl = `${base}/auth/reset-password?token=${encodeURIComponent(plainToken)}${intentSegment}`;

  const sendResult = await sendPasswordResetEmail({
    to: email,
    resetUrl,
    code: plainCode,
  });

  if (!sendResult.ok) {
    await admin.from("password_reset_tokens").delete().eq("token_hash", tokenHash);
  }
}

export type ValidateTokenResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" };

export async function validateResetToken(
  plainToken: string
): Promise<ValidateTokenResult> {
  if (!plainToken) {
    return { ok: false, reason: "invalid" };
  }
  const tokenHash = hashResetToken(plainToken);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("password_reset_tokens")
    .select("user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "invalid" };
  }
  if (data.used_at) {
    return { ok: false, reason: "invalid" };
  }
  if (new Date(data.expires_at) < new Date()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, userId: data.user_id };
}

export type ValidateCodeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" };

export async function validateResetCode(
  email: string,
  codeDigits: string
): Promise<ValidateCodeResult> {
  const normalized = normalizeEmail(email);
  const digits = codeDigits.replace(/\D/g, "").slice(0, 6);
  if (digits.length !== 6) {
    return { ok: false, reason: "invalid" };
  }

  const admin = createAdminClient();
  const { data: userId, error: rpcErr } = await admin.rpc(
    "auth_user_id_by_email",
    { p_email: normalized }
  );

  if (rpcErr || userId == null || typeof userId !== "string") {
    return { ok: false, reason: "invalid" };
  }

  const codeHash = hashResetCode(digits, userId);

  const { data, error } = await admin
    .from("password_reset_tokens")
    .select("user_id, code_expires_at, used_at")
    .eq("user_id", userId)
    .eq("code_hash", codeHash)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "invalid" };
  }
  if (new Date(data.code_expires_at) < new Date()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, userId: data.user_id };
}

export async function completePasswordReset(
  userId: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const admin = createAdminClient();
  const { error: updAuth } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (updAuth) {
    return { ok: false, error: updAuth.message };
  }

  const now = new Date().toISOString();
  await admin
    .from("password_reset_tokens")
    .update({ used_at: now })
    .eq("user_id", userId)
    .is("used_at", null);

  return { ok: true };
}
