import "server-only";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "lc_booking_draft_v1";
/** Signed draft + browser cookie max-age (30 minutes). */
const MAX_AGE_SEC = 30 * 60;

function signingSecret(): string {
  const fromEnv =
    process.env.BOOKING_DRAFT_SECRET?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") {
    return "dev-only-booking-draft-secret-change-me";
  }
  throw new Error(
    "Set BOOKING_DRAFT_SECRET (or STRIPE_SECRET_KEY) to sign booking drafts."
  );
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

function base64Json(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

function fromBase64Json<T>(raw: string): T | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export type BookingDraftV1 = {
  v: 1;
  airport: string;
  terminal: string;
  booking_category: string;
  venue_location: string;
  event_queue_name: string;
  line_type: string;
  /** User-entered notes only (form prefill). */
  description_notes?: string;
  /** Full job description for Stripe metadata / job row. */
  description: string;
  urgency_type: string;
  urgency_schedule: string;
  airline: string;
  flight_number: string;
  exact_location: string;
  payment_method_code: string;
  offered_price: number;
  overage_rate: number;
  estimated_wait: string;
  overage_agreed: boolean;
  category_disclaimer_version: string;
  createdAt: number;
};

type SignedEnvelope = { p: string; s: string };

export async function setBookingDraftCookie(draft: Omit<BookingDraftV1, "v" | "createdAt">): Promise<void> {
  const payload: BookingDraftV1 = {
    v: 1,
    ...draft,
    createdAt: Date.now(),
  };
  const p = base64Json(payload);
  const s = sign(p);
  const jar = await cookies();
  jar.set(COOKIE_NAME, base64Json({ p, s } satisfies SignedEnvelope), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function getBookingDraftCookie(): Promise<BookingDraftV1 | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const env = fromBase64Json<SignedEnvelope>(raw);
  if (!env?.p || !env.s) return null;
  const expected = sign(env.p);
  const a = Buffer.from(env.s);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const draft = fromBase64Json<BookingDraftV1>(env.p);
  if (!draft || draft.v !== 1) return null;
  if (Date.now() - draft.createdAt > MAX_AGE_SEC * 1000) return null;
  return draft;
}

export async function clearBookingDraftCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
