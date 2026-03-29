import { warnDevIfResendKeyMissing } from "@/lib/resend-dev-warn";

type Payload = {
  to: string;
  verifyUrl: string;
  code: string;
};

export async function sendEmailVerificationEmail({
  to,
  verifyUrl,
  code,
}: Payload) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ?? "LineCrew <onboarding@resend.dev>";

  if (!key) {
    warnDevIfResendKeyMissing("verification emails will not be sent");
    return { ok: false as const, skipped: true };
  }

  const html = `
    <p>Welcome to LineCrew. Please verify your email address to continue.</p>
    <p><a href="${verifyUrl}">Verify your email</a></p>
    <p>Or enter this verification code (expires in 10 minutes):</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
    <p>If you did not create an account, you can ignore this email.</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Verify your LineCrew email",
      html,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return { ok: false as const, error: t };
  }

  return { ok: true as const };
}
