import { type NextRequest } from "next/server";

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set.
 * The `x-vercel-cron: 1` header is also set by Vercel for scheduled invocations.
 */
export function verifyCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Bearer ") && auth.slice(7) === secret) {
      return true;
    }
  }
  if (request.headers.get("x-vercel-cron") === "1") {
    return true;
  }
  return false;
}
