// stripe-webhook: the authoritative source for marking invoices as paid.
//
// Receives Stripe events (checkout.session.completed, payment_intent.succeeded),
// verifies the Stripe-Signature header with STRIPE_WEBHOOK_SECRET, is idempotent
// (skips invoices that are already paid or payments already recorded), and logs
// every failure visibly so nothing disappears silently.
//
// The frontend return URL no longer marks invoices as paid — only this webhook
// does. verify_jwt = false (set in supabase/config.toml).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRow {
  id: string;
  number: string;
  total: number;
  amount_paid: number;
  status: string;
  currency: string;
  company_id: string;
  customer_id: string;
}

async function verifySignature(
  payload: string,
  sigHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!sigHeader || !secret) return false;
  const items = new Map<string, string>();
  for (const part of sigHeader.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key && value) items.set(key.trim(), value.trim());
  }
  const timestamp = items.get("t");
  const signature = items.get("v1");
  if (!timestamp || !signature) return false;

  // Reject signatures older than 5 minutes.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(Number(timestamp)) || ageSeconds > 300) {
    console.error("[stripe-webhook] signature timestamp too old", timestamp, ageSeconds);
    return false;
  }

  try {
    const key = new TextEncoder().encode(secret);
    const message = new TextEncoder().encode(`${timestamp}.${payload}`);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, message);
    const hex = [...new Uint8Array(sig)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (hex.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) {
      diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  } catch (err) {
    console.error("[stripe-webhook] signature verification error", err);
    return false;
  }
}

async function markInvoicePaid(
  supabase: ReturnType<typeof createClient>,
  invoiceId: string,
  reference: string,
  amount: number,
): Promise<{ handled: boolean; message: string }> {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, number, total, amount_paid, status, currency, company_id, customer_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) {
    return { handled: true, message: `invoice ${invoiceId} not found — ignoring` };
  }
  const inv = invoice as InvoiceRow;

  // Idempotency: never double-settle.
  if (inv.status === "paid") {
    return { handled: true, message: `invoice ${inv.number} already paid — skipping` };
  }
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("reference", reference)
    .eq("invoice_id", inv.id)
    .maybeSingle();
  if (existing) {
    return { handled: true, message: `payment ${reference} already recorded — skipping` };
  }

  const settleAmount = Math.min(amount, inv.total - inv.amount_paid);

  await supabase.from("payments").insert({
    company_id: inv.company_id,
    customer_id: inv.customer_id,
    invoice_id: inv.id,
    amount: settleAmount,
    method: "card",
    status: "succeeded",
    paid_at: new Date().toISOString(),
    reference,
  });

  await supabase
    .from("invoices")
    .update({ amount_paid: inv.total, status: "paid" })
    .eq("id", inv.id);

  await supabase.from("audit_logs").insert({
    company_id: inv.company_id,
    actor_id: null,
    actor_role: "system",
    action: "payment.webhook_confirmed",
    entity: "invoices",
    entity_id: inv.id,
    details: { number: inv.number, amount: settleAmount, reference },
  });

  const { data: businessUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("company_id", inv.company_id)
    .eq("role", "business");
  for (const u of businessUsers ?? []) {
    await supabase.from("notifications").insert({
      user_id: u.id,
      title_en: "Payment received",
      title_de: "Zahlung eingegangen",
      body_en: `Payment of ${settleAmount} EUR confirmed for ${inv.number} (Stripe).`,
      body_de: `Zahlung über ${settleAmount} EUR für ${inv.number} bestätigt (Stripe).`,
      type: "payment",
      read: false,
    });
  }

  return { handled: true, message: `invoice ${inv.number} marked as paid` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.text();
    const sigHeader = req.headers.get("stripe-signature");
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!secret) {
      console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ ok: false, error: "webhook_secret_missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const valid = await verifySignature(payload, sigHeader, secret);
    if (!valid) {
      console.error("[stripe-webhook] invalid signature");
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const event = JSON.parse(payload);
    console.log(
      `[stripe-webhook] event ${event.id} type=${event.type} received`,
    );

    if (
      event.type !== "checkout.session.completed" &&
      event.type !== "payment_intent.succeeded"
    ) {
      return new Response(JSON.stringify({ ok: true, ignored: event.type }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const object = event.data?.object ?? {};
    // For checkout.session.completed only settle when Stripe reports the
    // payment as actually paid.
    if (event.type === "checkout.session.completed" && object.payment_status !== "paid") {
      console.log(`[stripe-webhook] session ${object.id} not paid — ignoring`);
      return new Response(JSON.stringify({ ok: true, ignored: "not_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoiceId: string | undefined =
      object.metadata?.invoice_id ?? object.client_reference_id ?? undefined;
    const reference: string = object.id ?? event.id;
    const amountCents: number | undefined = object.amount_total ?? object.amount;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Plan checkout (subscription payment to Payalarm) — recorded separately.
    // client_reference_id carries the company id in that flow, so return early.
    if (object.metadata?.source === "plan_checkout") {
      const companyId: string | undefined =
        object.metadata?.company_id ?? object.client_reference_id ?? undefined;
      const plan = object.metadata?.plan ?? "professional";
      if (companyId && event.type === "checkout.session.completed" && object.payment_status === "paid") {
        const { data: existingPay } = await supabase
          .from("subscription_payments")
          .select("id")
          .eq("stripe_session_id", object.id)
          .maybeSingle();
        if (!existingPay) {
          await supabase.from("subscription_payments").insert({
            company_id: companyId,
            plan,
            amount: (amountCents ?? 0) / 100,
            currency: (object.currency ?? "eur").toUpperCase(),
            status: "succeeded",
            stripe_session_id: object.id,
            paid_at: new Date().toISOString(),
          });
          console.log(`[stripe-webhook] event ${event.id}: plan payment ${plan} recorded for ${companyId}`);
        }
      }
      return new Response(JSON.stringify({ ok: true, handled: "plan_checkout" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!invoiceId) {
      console.error(
        `[stripe-webhook] event ${event.id}: no invoice_id in metadata/client_reference_id`,
        JSON.stringify(object.metadata ?? {}),
      );
      return new Response(JSON.stringify({ ok: true, ignored: "no_invoice_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await markInvoicePaid(
      supabase,
      invoiceId,
      reference,
      (amountCents ?? 0) / 100,
    );
    console.log(`[stripe-webhook] event ${event.id}: ${result.message}`);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // 500 so Stripe retries the event.
    console.error("[stripe-webhook] processing failed", err);
    return new Response(
      JSON.stringify({ ok: false, error: "processing_failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
