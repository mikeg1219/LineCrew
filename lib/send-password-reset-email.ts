type Payload = {
  to: string;
  resetUrl: string;
  code: string;
};

export async function sendPasswordResetEmail({ to, resetUrl, code }: Payload) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ?? "LineCrew <onboarding@resend.dev>";

  if (!key) {
    return { ok: false as const, skipped: true };
  }

  const html = `
    <p>We received a request to reset your LineCrew password.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>Or enter this verification code (expires in 10 minutes):</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
    <p>If you did not request this, you can ignore this email.</p>
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
      subject: "Reset your LineCrew password",
      html,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return { ok: false as const, error: t };
  }

  return { ok: true as const };
}
