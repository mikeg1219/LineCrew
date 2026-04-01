import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

/**
 * Claim a Stripe webhook event for processing. Returns false if this event id
 * was already claimed (duplicate delivery — respond 200 and skip work).
 */
export async function tryClaimStripeWebhookEvent(
  admin: SupabaseClient,
  event: Stripe.Event
): Promise<boolean> {
  const { error } = await admin.from("processed_stripe_events").insert({
    id: event.id,
    event_type: event.type,
    api_version: event.api_version ?? null,
    livemode: event.livemode ?? false,
    created_at_stripe: new Date(event.created * 1000).toISOString(),
  });

  if (error?.code === "23505") {
    return false;
  }
  if (error) {
    throw new Error(
      `[stripe-processed-events] claim failed: ${error.message} (${error.code})`
    );
  }
  return true;
}

export async function markStripeWebhookEventProcessed(
  admin: SupabaseClient,
  eventId: string
): Promise<void> {
  const { error } = await admin
    .from("processed_stripe_events")
    .update({ processed_at: new Date().toISOString(), processing_error: null })
    .eq("id", eventId);

  if (error) {
    console.error("[stripe-processed-events] mark processed failed:", error.message);
  }
}

/** Release claim so Stripe retries after a 5xx (Stripe will redeliver). */
export async function releaseStripeWebhookEventClaim(
  admin: SupabaseClient,
  eventId: string,
  err: unknown
): Promise<void> {
  const msg =
    err instanceof Error ? err.message.slice(0, 2000) : String(err).slice(0, 2000);
  const { error } = await admin.from("processed_stripe_events").delete().eq("id", eventId);
  if (error) {
    console.error(
      "[stripe-processed-events] release claim failed:",
      error.message,
      "event:",
      eventId
    );
  }
  if (process.env.NODE_ENV === "development") {
    console.warn("[stripe-processed-events] released claim for retry:", eventId, msg);
  }
}
