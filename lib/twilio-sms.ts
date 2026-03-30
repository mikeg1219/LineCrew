export type SendSmsResult =
  | { ok: true; sid?: string }
  | { ok: false; skipped: true }
  | { ok: false; error: string };

/**
 * Send SMS via Twilio. No-op if Twilio is not configured or phone missing.
 * Never logs destination numbers in success paths beyond Twilio’s API.
 */
export async function sendSms(
  toE164: string | null | undefined,
  body: string
): Promise<SendSmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!sid || !token || !from || !toE164?.trim()) {
    console.warn(
      "[sms] skipped — missing TWILIO_* env or phone:",
      toE164 ? "(set)" : "(empty)"
    );
    return { ok: false, skipped: true };
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams();
  params.set("To", toE164.trim());
  params.set("From", from);
  params.set("Body", body);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const t = await res.text();
    console.error("[sms] Twilio error:", res.status, t);
    return { ok: false, error: t };
  }

  try {
    const json = (await res.json()) as { sid?: string };
    return { ok: true, sid: json.sid };
  } catch {
    return { ok: true };
  }
}
