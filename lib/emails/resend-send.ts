export type SendResult =
  | { ok: true }
  | { ok: false; skipped: true }
  | { ok: false; error: string };

/**
 * Low-level Resend send. Uses same env as admin notifications.
 */
export async function sendResendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim() ?? "LineCrew <onboarding@resend.dev>";

  if (!key) {
    console.warn("[emails] RESEND_API_KEY not set — skipped:", opts.subject);
    return { ok: false, skipped: true };
  }

  const toList = Array.isArray(opts.to) ? opts.to : [opts.to];
  const filtered = toList.map((t) => t.trim()).filter(Boolean);
  if (filtered.length === 0) {
    return { ok: false, skipped: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: filtered,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("[emails] Resend error:", res.status, t);
    return { ok: false, error: t };
  }

  return { ok: true };
}
