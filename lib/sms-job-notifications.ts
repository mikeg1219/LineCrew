import { appBaseUrl } from "@/lib/app-url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSms } from "@/lib/twilio-sms";

const SMS_SOFT_MAX = 160;

/** Keeps SMS segments predictable when airport/terminal names are long. */
function clipLabel(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)) + "…";
}

/** Prefer full copy; tighten airport label until the message fits one segment. */
function fitWithAirportLine(
  airport: string,
  build: (a: string) => string,
  maxLens: number[]
): string {
  for (const m of maxLens) {
    const a = clipLabel(airport, m);
    const msg = build(a);
    if (msg.length <= SMS_SOFT_MAX) return msg;
  }
  const a = clipLabel(airport, 6);
  const msg = build(a);
  return msg.length <= SMS_SOFT_MAX ? msg : msg.slice(0, SMS_SOFT_MAX);
}

/** Never throws — Twilio/network errors are logged only. */
export async function safeSendSms(
  toE164: string | null | undefined,
  body: string
): Promise<void> {
  try {
    await sendSms(toE164, body);
  } catch (e) {
    console.error("[sms] safeSendSms failed:", e);
  }
}

export async function getProfilePhone(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", userId)
    .maybeSingle();
  return data?.phone?.trim() || null;
}

function hostForSms(): string {
  return appBaseUrl().replace(/^https:\/\//i, "").replace(/\/$/, "");
}

export function smsCustomerBookingAccepted(airport: string, jobId: string): string {
  const h = hostForSms();
  const url = `${h}/dashboard/customer/jobs/${jobId}`;
  const line = (a: string) =>
    `Your Line Holder accepted your booking at ${a}. Track: ${url}`;
  for (const m of [20, 14, 10, 6]) {
    const msg = line(clipLabel(airport, m));
    if (msg.length <= SMS_SOFT_MAX) return msg;
  }
  const fallback = `Your Line Holder accepted your booking. Track: ${url}`;
  if (fallback.length <= SMS_SOFT_MAX) return fallback;
  return `Booking accepted. Track: ${url}`.slice(0, SMS_SOFT_MAX);
}

export function smsCustomerNearFront(airport: string): string {
  return fitWithAirportLine(
    airport,
    (a) =>
      `Your Line Holder is near the front of the line at ${a}. Start heading over!`,
    [24, 18, 12, 8]
  );
}

export function smsCustomerReadyForHandoff(terminal: string): string {
  const t = clipLabel(terminal.trim() || "the gate", 22);
  let msg = `Your Line Holder is ready! Head to ${t} now to swap in.`;
  if (msg.length <= SMS_SOFT_MAX) return msg;
  msg = `Your Line Holder is ready! Head to ${clipLabel(terminal.trim() || "the gate", 14)} to swap in.`;
  return msg.length <= SMS_SOFT_MAX ? msg : msg.slice(0, SMS_SOFT_MAX);
}

export function smsCustomerBookingComplete(): string {
  return "Your LineCrew booking is complete. Thanks for using LineCrew!";
}

export function smsWaiterNewJobAtAirport(
  amountUsd: number,
  airport: string
): string {
  const h = hostForSms();
  const amt = amountUsd % 1 === 0 ? String(amountUsd) : amountUsd.toFixed(2);
  const url = `${h}/dashboard/waiter/browse-jobs`;
  return fitWithAirportLine(
    airport,
    (a) => `New $${amt} booking at ${a}. Accept now: ${url}`,
    [16, 12, 8, 6]
  );
}

export function smsWaiterPayoutProcessing(amountUsd: number): string {
  const amt = amountUsd % 1 === 0 ? String(amountUsd) : amountUsd.toFixed(2);
  return `Booking complete! Your payout of $${amt} is being processed.`;
}
