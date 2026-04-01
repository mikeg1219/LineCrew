import { createHash, timingSafeEqual } from "node:crypto";

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
