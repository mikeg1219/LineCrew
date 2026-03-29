import { createHash, randomBytes, randomInt } from "crypto";

function getPepper(): string {
  const p =
    process.env.PASSWORD_RESET_SECRET?.trim() ??
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    "";
  if (!p) {
    throw new Error(
      "PASSWORD_RESET_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set for password reset."
    );
  }
  return p;
}

export function hashEmailForRateLimit(normalizedEmail: string): string {
  return createHash("sha256")
    .update(`${getPepper()}:rate:${normalizedEmail}`)
    .digest("hex");
}

export function hashResetToken(plainToken: string): string {
  return createHash("sha256")
    .update(`${getPepper()}:token:${plainToken}`)
    .digest("hex");
}

export function hashResetCode(
  codeDigits: string,
  userId: string
): string {
  return createHash("sha256")
    .update(`${getPepper()}:code:${userId}:${codeDigits}`)
    .digest("hex");
}

export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateSixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashEmailVerificationToken(plainToken: string): string {
  return createHash("sha256")
    .update(`${getPepper()}:evt:${plainToken}`)
    .digest("hex");
}

export function hashEmailVerificationCode(
  codeDigits: string,
  userId: string
): string {
  return createHash("sha256")
    .update(`${getPepper()}:evc:${userId}:${codeDigits}`)
    .digest("hex");
}

export function hashEmailVerificationRateLimit(normalizedEmail: string): string {
  return createHash("sha256")
    .update(`${getPepper()}:evrate:${normalizedEmail}`)
    .digest("hex");
}
