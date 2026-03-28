import { ADMIN_EMAIL } from "@/lib/admin-config";

/** Optional Resend API — set RESEND_API_KEY in production. */
export async function sendAdminEmail(subject: string, html: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim() ?? "LineCrew <onboarding@resend.dev>";

  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — admin notification skipped:", subject);
    return { ok: false as const, skipped: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [ADMIN_EMAIL],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("[email] Resend error:", res.status, t);
    return { ok: false as const, error: t };
  }

  return { ok: true as const };
}
