import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function hashHandoffSecret(value: string): string {
  return sha256(value).toString("hex");
}

export function verifyHandoffSecret(
  provided: string,
  expectedHash: string | null | undefined
): boolean {
  if (!provided || !expectedHash) return false;
  const a = sha256(provided);
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildHandoffConfidenceScore(args: {
  method: "qr" | "code";
  distanceMeters: number;
  tokenFresh: boolean;
  hasBothReadySignals: boolean;
}): number {
  let score = 40;
  score += args.method === "qr" ? 20 : 10;
  score += args.tokenFresh ? 15 : 0;
  score += args.hasBothReadySignals ? 10 : 0;
  if (args.distanceMeters <= 10) score += 15;
  else if (args.distanceMeters <= 30) score += 10;
  else if (args.distanceMeters <= 60) score += 5;
  return Math.max(0, Math.min(100, score));
}

function getSigningSecret(): string {
  return (
    process.env.HANDOFF_SIGNING_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    process.env.STRIPE_SECRET_KEY ||
    "linecrew-handoff-dev-secret"
  );
}

function hmac(input: string): string {
  return createHmac("sha256", getSigningSecret()).update(input, "utf8").digest("hex");
}

export function generateHandoffNonce(): string {
  return randomBytes(8).toString("hex");
}

export function createSignedHandoffPayload(args: {
  jobId: string;
  nonce: string;
  expiresAtIso: string;
}): string {
  const body = `v1|${args.jobId}|${args.nonce}|${args.expiresAtIso}`;
  const sig = hmac(body);
  return `${body}|${sig}`;
}

export function verifySignedHandoffPayload(
  payload: string
): { ok: true; jobId: string; nonce: string; expiresAtIso: string } | { ok: false } {
  const parts = payload.split("|");
  if (parts.length !== 5) return { ok: false };
  const [version, jobId, nonce, expiresAtIso, sig] = parts;
  if (version !== "v1" || !jobId || !nonce || !expiresAtIso || !sig) return { ok: false };
  const body = `${version}|${jobId}|${nonce}|${expiresAtIso}`;
  const expected = hmac(body);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return { ok: false };
  if (!timingSafeEqual(a, b)) return { ok: false };
  return { ok: true, jobId, nonce, expiresAtIso };
}
