import { appBaseUrl } from "@/lib/app-url";
import { buttonRow, emailShell, escapeHtml } from "@/lib/emails/html";
import { sendResendEmail } from "@/lib/emails/resend-send";

export type BookingConfirmedData = {
  jobId: string;
  customerEmail: string;
  airport: string;
  terminal: string;
  lineType: string;
  offeredPrice: number;
};

export function buildBookingConfirmedHtml(data: BookingConfirmedData): string {
  const trackUrl = `${appBaseUrl()}/dashboard/customer/jobs/${data.jobId}`;
  const price = `$${data.offeredPrice.toFixed(2)}`;
  const body = `
<p style="margin:0 0 12px;">Your payment went through and your booking is live.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">
  <tr><td style="padding:6px 0;color:#64748b;">Airport</td><td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(data.airport)}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b;">Terminal</td><td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(data.terminal)}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b;">Line type</td><td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(data.lineType)}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b;">Offered price</td><td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(price)}</td></tr>
</table>
<p style="margin:16px 0 0;">We&apos;re finding you a Line Holder. Most bookings are accepted in 3-10 minutes.</p>
${buttonRow(trackUrl, "Track your booking")}
`;
  return emailShell({
    title: "Booking confirmed!",
    preheader: `Confirmed · ${data.airport} · ${price}`,
    bodyHtml: body,
  });
}

export async function sendBookingConfirmedEmail(data: BookingConfirmedData): Promise<void> {
  try {
    await sendResendEmail({
      to: data.customerEmail,
      subject: "Your LineCrew booking is confirmed ✓",
      html: buildBookingConfirmedHtml(data),
    });
  } catch (e) {
    console.error("[emails] sendBookingConfirmedEmail", e);
  }
}
