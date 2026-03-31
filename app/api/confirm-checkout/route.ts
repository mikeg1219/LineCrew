import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return NextResponse.json({ ok: false, pending: true, reason: "unpaid" });
  }

  const piRef = session.payment_intent;
  const piId = typeof piRef === "string" ? piRef : piRef?.id ?? null;
  if (!piId) {
    return NextResponse.json({ error: "No payment intent" }, { status: 400 });
  }

  const pi = await stripe.paymentIntents.retrieve(piId);
  const md = pi.metadata ?? {};

  if (md.customer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient() ?? supabase;

  const { data: existing } = await admin
    .from("jobs")
    .select("id")
    .eq("stripe_payment_intent_id", piId)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({ ok: true, jobId: existing.id });
  }

  const offered = parseFloat(md.offered_price ?? "");
  const overageRate = parseFloat(md.overage_rate ?? "10");

  if (
    Number.isNaN(offered) || offered < 10 ||
    !md.airport || !md.terminal || !md.line_type || !md.estimated_wait
  ) {
    return NextResponse.json({ ok: false, pending: true });
  }

  const { data: newJob, error } = await admin
    .from("jobs")
    .insert({
      customer_id: md.customer_id,
      customer_email: md.customer_email || null,
      airport: md.airport,
      terminal: md.terminal,
      line_type: md.line_type,
      description: md.description ?? "",
      offered_price: offered,
      overage_rate: overageRate,
      overage_agreed: md.overage_agreed === "true",
      estimated_wait: md.estimated_wait,
      status: "open",
      stripe_payment_intent_id: piId,
    })
    .select("id")
    .single();

  if (error?.code === "23505") {
    const { data: dup } = await admin
      .from("jobs")
      .select("id")
      .eq("stripe_payment_intent_id", piId)
      .maybeSingle();
    return NextResponse.json({ ok: true, jobId: dup?.id });
  }

  if (error) {
    const isRlsOrPermission =
      error.code === "42501" ||
      error.code === "PGRST301" ||
      /permission|policy|rls/i.test(error.message ?? "");
    if (isRlsOrPermission) {
      return NextResponse.json(
        {
          error:
            "Could not save booking after payment. Configure SUPABASE_SERVICE_ROLE_KEY (webhook/confirm insert) or restore jobs insert policy for authenticated customers.",
          code: error.code ?? null,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: error.message, code: error.code ?? null },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, jobId: newJob.id });
}