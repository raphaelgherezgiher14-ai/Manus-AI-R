// create-invoice-checkout: creates a Stripe Checkout session for a single
// invoice, reached through a magic link (token). Anon callers are accepted;
// access is gated by the share-link token, not by a user session.

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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, baseUrl } = await req.json();
    if (!token) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: link } = await supabase
      .from("share_links")
      .select("token, document_type, invoice_id")
      .eq("token", token)
      .maybeSingle();

    if (!link || link.document_type !== "invoice" || !link.invoice_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_link" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, number, total, amount_paid, status, currency")
      .eq("id", link.invoice_id)
      .maybeSingle();

    if (!invoice) {
      return new Response(
        JSON.stringify({ ok: false, error: "not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const inv = invoice as InvoiceRow;
    if (inv.status === "paid") {
      return new Response(
        JSON.stringify({ ok: false, error: "already_paid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const amountCents = Math.round((inv.total - inv.amount_paid) * 100);
    const successUrl = `${baseUrl ?? ""}/i/${token}?pay=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl ?? ""}/i/${token}`;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "stripe_not_configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", successUrl);
    form.set("cancel_url", cancelUrl);
    form.set("client_reference_id", inv.id);
    form.set("metadata[invoice_id]", inv.id);
    form.set("metadata[token]", token);
    form.set("line_items[0][quantity]", "1");
    form.set("line_items[0][price_data][currency]", inv.currency.toLowerCase());
    form.set("line_items[0][price_data][product_data][name]", `Payalarm ${inv.number}`);
    form.set("line_items[0][price_data][product_data][description]", inv.number);
    form.set("line_items[0][price_data][unit_amount]", String(amountCents));

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Stripe checkout error", res.status, data);
      return new Response(
        JSON.stringify({ ok: false, error: "stripe_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, url: data.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-invoice-checkout failed", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
