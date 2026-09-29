// send-document: emails the magic link for a quote or invoice to the customer.
// Called by authenticated business users (verify_jwt = true).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const { documentType, documentId, baseUrl } = await req.json();
    if (!documentType || !documentId) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.company_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "no_company" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const table = documentType === "quote" ? "quotes" : "invoices";
    const { data: doc } = await supabase
      .from(table)
      .select("*, customer(*)")
      .eq("id", documentId)
      .maybeSingle();
    if (!doc || doc.company_id !== profile.company_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const customerEmail: string | null = doc.customer?.email ?? null;
    if (!customerEmail) {
      return new Response(
        JSON.stringify({ ok: false, error: "no_customer_email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Ensure a share link exists.
    let token: string | null = null;
    const { data: existing } = await supabase
      .from("share_links")
      .select("token")
      .eq("document_type", documentType)
      .eq(documentType === "quote" ? "quote_id" : "invoice_id", documentId)
      .maybeSingle();
    if (existing) {
      token = existing.token;
    } else {
      const { data: created } = await supabase
        .from("share_links")
        .insert({
          company_id: profile.company_id,
          document_type: documentType,
          quote_id: documentType === "quote" ? documentId : null,
          invoice_id: documentType === "invoice" ? documentId : null,
          token: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""),
          created_by: user.id,
        })
        .select("token")
        .single();
      token = created?.token ?? null;
    }

    if (!token) {
      return new Response(
        JSON.stringify({ ok: false, error: "link_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const appBase = baseUrl ?? Deno.env.get("APP_BASE_URL") ?? "https://payalarm.app";
    const linkUrl = `${appBase}/i/${token}`;
    const isQuote = documentType === "quote";
    const subject = isQuote
      ? `Your quote ${doc.number} from ${doc.customer.name}`
      : `Your invoice ${doc.number} from ${doc.customer.name}`;
    const html = `
      <p>Hello ${doc.customer.name},</p>
      <p>${isQuote ? "Please review your quote" : "Your invoice is ready"} ${doc.number}:</p>
      <p><a href="${linkUrl}">Open ${isQuote ? "quote" : "invoice"} ${doc.number}</a></p>
      <p>No login required — you can view and pay in one click.</p>
    `;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    let delivered = false;
    if (resendKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Payalarm <noreply@payalarm.app>",
            to: customerEmail,
            subject,
            html,
          }),
        });
        delivered = res.ok;
        if (!res.ok) console.error("Resend error", res.status, await res.text());
      } catch (e) {
        console.error("Resend exception", e);
      }
    }

    await supabase.from("audit_logs").insert({
      company_id: profile.company_id,
      actor_id: user.id,
      actor_role: profile.role,
      action: isQuote ? "quote.sent" : "invoice.sent",
      entity: table,
      entity_id: documentId,
      details: { number: doc.number, via: "email", delivered },
    });

    return new Response(
      JSON.stringify({ ok: true, delivered, link: linkUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-document failed", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
