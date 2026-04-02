import "server-only";

/** Max lengths aligned with security hardening (go-live). */
export const MAX_PROFILE_BIO_CHARS = 500;
export const MAX_JOB_DESCRIPTION_CHARS = 1000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function trimStr(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).trim();
}

/** Pragmatic email check before auth / DB (not RFC-complete). */
export function isValidEmail(email: string): boolean {
  const e = email.trim();
  if (e.length < 3 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** Returns normalized lowercase UUID or null if invalid. */
export function parseUuidParam(raw: unknown): string | null {
  const s = trimStr(raw);
  if (!s || !UUID_RE.test(s)) return null;
  return s.toLowerCase();
}

export function parseJobIdFromFormData(formData: FormData): string | null {
  return parseUuidParam(formData.get("jobId"));
}

export function parseRequestIdFromFormData(formData: FormData): string | null {
  return parseUuidParam(formData.get("requestId"));
}

export function clipToMaxLength(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

/**
 * Validates USD amounts used in bookings / payouts. `min` defaults to a small epsilon (> 0).
 */
export function validatePositiveUsdAmount(
  n: unknown,
  opts?: { min?: number; fieldLabel?: string }
): { ok: true; value: number } | { ok: false; error: string } {
  const fieldLabel = opts?.fieldLabel ?? "Amount";
  const min = opts?.min ?? Number.EPSILON * 2;
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x) || x <= 0) {
    return { ok: false, error: `${fieldLabel} must be a positive number.` };
  }
  if (x < min) {
    return {
      ok: false,
      error: `${fieldLabel} must be at least ${min}.`,
    };
  }
  return { ok: true, value: x };
}
