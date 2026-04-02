/** Minimal HTML escaping for email bodies (text nodes and attributes). */
export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function emailShell(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
}): string {
  const pre = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
${pre}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
      <tr><td style="padding:28px 24px 8px 24px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;line-height:1.3;">${escapeHtml(opts.title)}</p>
      </td></tr>
      <tr><td style="padding:8px 24px 28px 24px;color:#334155;font-size:15px;line-height:1.6;">
        ${opts.bodyHtml}
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#64748b;">LineCrew.ai</p>
  </td></tr>
</table>
</body>
</html>`;
}

export function buttonRow(href: string, label: string): string {
  const safe = escapeHtml(href);
  return `<p style="margin:20px 0 0;">
<a href="${safe}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">${escapeHtml(label)}</a>
</p>`;
}
