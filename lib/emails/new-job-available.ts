import { appBaseUrl } from "@/lib/app-url";
import { buttonRow, emailShell, escapeHtml } from "@/lib/emails/html";
import { sendResendEmail } from "@/lib/emails/resend-send";

export type NewJobAvailableData = {
  waiterEmail: string;
  jobId: string;
  airport: string;
  terminal: string;
  lineType: string;
  offeredPrice: number;
};

export function buildNewJobAvailableHtml(data: NewJobAvailableData): string {
  const browseUrl = `${appBaseUrl()}/dashboard/waiter/browse-jobs`;
  const price = `$${data.offeredPrice.toFixed(2)}`;
  const body = `
<p style="margin:0 0 12px;">A new paid booking matches airports you serve.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">
  <tr><td style="padding:6px 0;color:#64748b;">Airport</td><td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(data.airport)}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b;">Terminal</td><td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(data.terminal)}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b;">Line type</td><td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(data.lineType)}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b;">Offered price</td><td style="padding:6px 0;font-weight:600;color:#0f172a;">${escapeHtml(price)}</td></tr>
</table>
${buttonRow(browseUrl, "View and accept")}
`;
  return emailShell({
    title: "New booking available near you",
    preheader: `${price} · ${data.airport}`,
    bodyHtml: body,
  });
}

export function newJobAvailableSubject(data: Pick<NewJobAvailableData, "airport" | "offeredPrice">): string {
  const price = `$${data.offeredPrice.toFixed(2)}`;
  return `New ${price} booking at ${data.airport}`;
}

export async function sendNewJobAvailableEmail(data: NewJobAvailableData): Promise<void> {
  try {
    await sendResendEmail({
      to: data.waiterEmail,
      subject: newJobAvailableSubject(data),
      html: buildNewJobAvailableHtml(data),
    });
  } catch (e) {
    console.error("[emails] sendNewJobAvailableEmail", e);
  }
}
