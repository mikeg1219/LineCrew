import { emailShell, escapeHtml } from "@/lib/emails/html";
import { sendResendEmail } from "@/lib/emails/resend-send";

export type BookingCompletedData = {
  customerEmail: string;
  airport: string;
  lineType: string;
  amountCharged: number;
};

export function buildBookingCompletedHtml(data: BookingCompletedData): string {
  const amt = `$${data.amountCharged.toFixed(2)}`;
  const body = `
<p style="margin:0 0 12px;">Your LineCrew booking is finished and payment has been settled.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">
  <tr><td style="padding:6px 0;color:#64748b;">Airport</td><td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(data.airport)}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b;">Line type</td><td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(data.lineType)}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b;">Amount</td><td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(amt)}</td></tr>
</table>
<p style="margin:16px 0 0;">Thank you for using LineCrew.</p>
`;
  return emailShell({
    title: "Booking complete!",
    preheader: `Complete · ${data.airport} · ${amt}`,
    bodyHtml: body,
  });
}

export async function sendBookingCompletedEmail(data: BookingCompletedData): Promise<void> {
  try {
    await sendResendEmail({
      to: data.customerEmail,
      subject: "Your LineCrew booking is complete",
      html: buildBookingCompletedHtml(data),
    });
  } catch (e) {
    console.error("[emails] sendBookingCompletedEmail", e);
  }
}
