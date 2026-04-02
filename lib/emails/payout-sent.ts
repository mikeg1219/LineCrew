import { emailShell, escapeHtml } from "@/lib/emails/html";
import { sendResendEmail } from "@/lib/emails/resend-send";

export type PayoutSentData = {
  waiterEmail: string;
  amount: number;
  destinationLabel: string;
};

export function buildPayoutSentHtml(data: PayoutSentData): string {
  const amt = `$${data.amount.toFixed(2)}`;
  const body = `
<p style="margin:0 0 12px;">Your LineCrew payout is on the way.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">
  <tr><td style="padding:6px 0;color:#64748b;">Amount</td><td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(amt)}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b;">Destination</td><td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(data.destinationLabel)}</td></tr>
</table>
<p style="margin:16px 0 0;font-size:14px;color:#64748b;">Funds typically arrive within 1-3 business days.</p>
`;
  return emailShell({
    title: "Payout on the way",
    preheader: `${amt} · ${data.destinationLabel}`,
    bodyHtml: body,
  });
}

export async function sendPayoutSentEmail(data: PayoutSentData): Promise<void> {
  try {
    await sendResendEmail({
      to: data.waiterEmail,
      subject: `Your payout of $${data.amount.toFixed(2)} is on the way`,
      html: buildPayoutSentHtml(data),
    });
  } catch (e) {
    console.error("[emails] sendPayoutSentEmail", e);
  }
}
