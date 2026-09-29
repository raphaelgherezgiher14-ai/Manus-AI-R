// admin-ai-analyst: answers natural-language questions about the platform using
// real data from the database. Admin-only (verify_jwt = true). The question and
// a compact data snapshot are sent to Gemini (google/gemini-3.6-flash), the
// answer streams back as SSE.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-session-id",
};

const AI_API_TOKEN = Deno.env.get("AI_API_TOKEN_14eec724a034");
const MODEL = "google/gemini-3.6-flash";

interface Snapshot {
  companies: unknown[];
  subscriptions: unknown[];
  profiles: unknown[];
  invoices: unknown[];
  payments: unknown[];
  invoiceItems: unknown[];
}

async function loadSnapshot(
  supabase: ReturnType<typeof createClient>,
): Promise<Snapshot> {
  const [companies, subscriptions, profiles, invoices, payments, invoiceItems] =
    await Promise.all([
      supabase.from("companies").select("id, name, plan, status, vat_status, trial_ends_at, created_at"),
      supabase.from("subscriptions").select("company_id, plan, status, period_start, period_end, created_at"),
      supabase.from("profiles").select("id, role, created_at"),
      supabase.from("invoices").select("id, company_id, number, type, status, total, net_total, vat_amount, amount_paid, issue_date, due_date, created_at"),
      supabase.from("payments").select("id, company_id, amount, method, status, paid_at, created_at"),
      supabase.from("invoice_items").select("id, invoice_id, description, quantity, unit_price, amount"),
    ]);
  return {
    companies: companies.data ?? [],
    subscriptions: subscriptions.data ?? [],
    profiles: profiles.data ?? [],
    invoices: invoices.data ?? [],
    payments: payments.data ?? [],
    invoiceItems: invoiceItems.data ?? [],
  };
}

function buildSystemPrompt(snapshot: Snapshot): string {
  const compact = JSON.stringify(snapshot).slice(0, 60000);
  return [
    "You are Payalarm's internal data analyst. You answer in the language of the question (German or English).",
    "You are given a JSON snapshot of real platform data: companies, subscriptions, user profiles, invoices, payments and invoice line items.",
    "Answer the admin's question clearly and concisely using ONLY the provided data. Never invent numbers.",
    "When useful, compute aggregates (MRR from active subscriptions: professional=39, business=79; churn; signups; overdue amounts; totals).",
    "Use short paragraphs or bullet lists. Point out noteworthy trends or risks you actually see in the data.",
    "If the data does not contain the answer, say so honestly.",
    "Data snapshot:",
    compact,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!AI_API_TOKEN) {
      throw new Error("AI_API_TOKEN is not configured");
    }
    const { question } = await req.json();
    if (!question || typeof question !== "string" || !question.trim()) {
      throw new Error("question is required");
    }

    // Authorization: only signed-in admins may read platform-wide data.
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: { code: 401, message: "Authentication required.", status: "UNAUTHENTICATED" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: { code: 403, message: "Admin access required.", status: "PERMISSION_DENIED" } }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const snapshot = await loadSnapshot(supabase);
    const systemInstruction = buildSystemPrompt(snapshot);

    const upstreamSessionID =
      req.headers.get("X-Session-ID")?.trim() || crypto.randomUUID();

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: question.trim() }],
        },
      ],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature: 0.3 },
    };

    const response = await fetch(
      `https://api.enter.pro/code/api/ai/v1beta/models/${MODEL}:streamGenerateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": AI_API_TOKEN,
          "Content-Type": "application/json",
          "X-Session-ID": upstreamSessionID,
          "X-Enter-Project-ID": "14eec724a03446a2aeb6e144a52871ad",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = "AI service error";
      let errorStatus = "api_error";
      const dataMatch = text.match(/data: (.+)/);
      if (dataMatch) {
        try {
          const errorData = JSON.parse(dataMatch[1]);
          errorMessage = errorData.error?.message || errorMessage;
          errorStatus = errorData.error?.status || errorStatus;
        } catch {
          /* use defaults */
        }
      } else {
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error?.message || errorMessage;
          errorStatus = errorData.error?.status || errorStatus;
        } catch {
          /* use defaults */
        }
      }
      const errorSSE = `data: ${JSON.stringify({
        error: { code: response.status, message: errorMessage, status: errorStatus },
      })}\n\n`;
      return new Response(errorSSE, {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const errorSSE = `data: ${JSON.stringify({
      error: { code: 500, message: String(error?.message ?? error), status: "INTERNAL" },
    })}\n\n`;
    return new Response(errorSSE, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  }
});
