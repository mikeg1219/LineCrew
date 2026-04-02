import { appBaseUrl } from "@/lib/app-url";
import { buttonRow, emailShell, escapeHtml } from "@/lib/emails/html";
import { sendResendEmail } from "@/lib/emails/resend-send";

export type LineHolderAssignedData = {
  jobId: string;
  customerEmail: string;
  airport: string;
  terminal: string;
  lineHolderName: string;
  serviceAreasLabel: string;
};

export function buildLineHolderAssignedHtml(data: LineHolderAssignedData): string {
  const trackUrl = `${appBaseUrl()}/dashboard/customer/jobs/${data.jobId}`;
  const body = `
<p style="margin:0 0 12px;">A Line Holder has accepted your booking and is getting in position to hold your spot.</p>
<p style="margin:0 0 8px;"><strong style="color:#0f172a;">${escapeHtml(data.lineHolderName)}</strong></p>
<p style="margin:0 0 12px;font-size:14px;color:#64748b;">Service areas: ${escapeHtml(data.serviceAreasLabel)}</p>
<p style="margin:0 0 16px;">They&apos;re heading to <strong>${escapeHtml(data.airport)}</strong> — <strong>${escapeHtml(data.terminal)}</strong> now.</p>
${buttonRow(trackUrl, "Track in real time")}
`;
  return emailShell({
    title: "Line Holder accepted your booking",
    preheader: `${data.airport} · ${data.lineHolderName}`,
    bodyHtml: body,
  });
}

export async function sendLineHolderAssignedEmail(data: LineHolderAssignedData): Promise<void> {
  try {
    await sendResendEmail({
      to: data.customerEmail,
      subject: "Your Line Holder is on the way!",
      html: buildLineHolderAssignedHtml(data),
    });
  } catch (e) {
    console.error("[emails] sendLineHolderAssignedEmail", e);
  }
}
