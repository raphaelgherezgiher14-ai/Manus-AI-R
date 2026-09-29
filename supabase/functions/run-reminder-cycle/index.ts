// run-reminder-cycle: Payalarm automation engine.
// For a company (or all companies when called by an admin), it:
//  - evaluates invoices against reminder configs and issues reminder emails
//  - escalates dunning levels for overdue invoices
//  - marks invoices as overdue when past due date
//  - writes audit log entries and user notifications
//
// Emails are delivered through the Resend API when RESEND_API_KEY is set;
// otherwise the reminder is recorded as "simulated" so the flow still works.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Company {
  id: string;
  name: string;
  currency: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  language: string | null;
}

interface ReminderConfig {
  id: string;
  name: string;
  enabled: boolean;
  days_before_due: number;
  frequency_days: number;
  max_reminders: number;
  subject_en: string | null;
  subject_de: string | null;
  body_en: string | null;
  body_de: string | null;
}

interface DunningRule {
  id: string;
  name: string;
  level: number;
  trigger_days_overdue: number;
  action: string;
  subject_en: string | null;
  subject_de: string | null;
  body_en: string | null;
  body_de: string | null;
  enabled: boolean;
}

interface Invoice {
  id: string;
  number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  total: number;
  amount_paid: number;
  customer_id: string;
}

const interpolate = (
  template: string | null,
  vars: Record<string, string>,
): string => {
  if (!template) return "";
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key) => vars[key] ?? "");
};

const fmtEuro = (amount: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);

const fmtDate = (d: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-GB") : "-";

const APP_BASE = Deno.env.get("APP_BASE_URL") ?? "https://payalarm.app";

async function ensureInvoiceLink(
  client: ReturnType<typeof createClient>,
  companyId: string,
  invoiceId: string,
): Promise<string | null> {
  const { data: existing } = await client
    .from("share_links")
    .select("token")
    .eq("document_type", "invoice")
    .eq("invoice_id", invoiceId)
    .maybeSingle();
  if (existing) return existing.token;
  const { data: created } = await client
    .from("share_links")
    .insert({
      company_id: companyId,
      document_type: "invoice",
      invoice_id: invoiceId,
      quote_id: null,
      token: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""),
    })
    .select("token")
    .single();
  return created?.token ?? null;
}

async function sendEmail(
  key: string | undefined,
  to: string,
  subject: string,
  body: string,
): Promise<boolean> {
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Payalarm <noreply@payalarm.app>",
        to,
        subject,
        html: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
      }),
    });
    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend exception", err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    // Who is calling?
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, company_id")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";

    // Determine which companies to process.
    let companyIds: string[] = [];
    if (isAdmin) {
      const { data: companies } = await supabase
        .from("companies")
        .select("id");
      companyIds = (companies ?? []).map((c: Company) => c.id);
    } else if (profile?.company_id) {
      companyIds = [profile.company_id];
    }

    const result: Record<string, unknown> = {
      companies: companyIds.length,
      remindersSent: 0,
      remindersSimulated: 0,
      dunningEscalations: 0,
      invoicesMarkedOverdue: 0,
      skipped: 0,
    };

    const resendKey = Deno.env.get("RESEND_API_KEY");

    for (const companyId of companyIds) {
      const { data: company } = await supabase
        .from("companies")
        .select("id, name, currency")
        .eq("id", companyId)
        .maybeSingle();

      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, email, language");
      const customerMap = new Map<string, Customer>(
        (customers ?? []).map((c: Customer) => [c.id, c]),
      );

      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, number, status, issue_date, due_date, total, amount_paid, customer_id")
        .in("status", ["sent", "overdue"])
        .eq("company_id", companyId);

      const { data: reminderConfigs } = await supabase
        .from("reminder_configs")
        .select("id, name, enabled, days_before_due, frequency_days, max_reminders, subject_en, subject_de, body_en, body_de")
        .eq("company_id", companyId)
        .eq("enabled", true);

      const { data: dunningRules } = await supabase
        .from("dunning_rules")
        .select("id, name, level, trigger_days_overdue, action, subject_en, subject_de, body_en, body_de, enabled")
        .eq("company_id", companyId)
        .eq("enabled", true);

      const { data: existingReminders } = await supabase
        .from("reminders")
        .select("invoice_id, sequence, status")
        .eq("company_id", companyId);
      const sentCountByInvoice = new Map<string, number>();
      for (const r of existingReminders ?? []) {
        const n = sentCountByInvoice.get(r.invoice_id) ?? 0;
        if (r.status === "sent") {
          sentCountByInvoice.set(r.invoice_id, Math.max(n, r.sequence));
        }
      }

      const { data: existingEvents } = await supabase
        .from("dunning_events")
        .select("invoice_id, level")
        .eq("company_id", companyId);
      const maxLevelByInvoice = new Map<string, number>();
      for (const e of existingEvents ?? []) {
        maxLevelByInvoice.set(e.invoice_id, Math.max(maxLevelByInvoice.get(e.invoice_id) ?? 0, e.level));
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString().slice(0, 10);

      for (const inv of (invoices ?? []) as Invoice[]) {
        const customer = customerMap.get(inv.customer_id);
        const lang = customer?.language === "de" ? "de" : "en";
        const dueDate = inv.due_date;
        const due = dueDate ? new Date(`${dueDate}T00:00:00`) : null;
        const daysOverdue = due
          ? Math.floor((today.getTime() - due.getTime()) / 86400000)
          : 0;
        const vars = {
          number: inv.number,
          name: customer?.name ?? "",
          amount: fmtEuro(inv.total),
          due_date: fmtDate(dueDate),
        };

        // Mark overdue.
        if (daysOverdue > 0 && inv.status !== "overdue") {
          await supabase
            .from("invoices")
            .update({ status: "overdue" })
            .eq("id", inv.id);
          result.invoicesMarkedOverdue =
            Number(result.invoicesMarkedOverdue) + 1;
        }

        const sentCount = sentCountByInvoice.get(inv.id) ?? 0;

        // Dunning escalation.
        for (const rule of (dunningRules ?? []) as DunningRule[]) {
          const currentLevel = maxLevelByInvoice.get(inv.id) ?? 0;
          if (daysOverdue >= rule.trigger_days_overdue && rule.level > currentLevel) {
            const subject = lang === "de" ? rule.subject_de : rule.subject_en;
            const body = lang === "de" ? rule.body_de : rule.body_en;
            const link = await ensureInvoiceLink(supabase, companyId, inv.id);
            const linkUrl = link ? `\n\n${APP_BASE}/i/${link}` : "";
            const delivered = await sendEmail(
              resendKey,
              customer?.email ?? "",
              interpolate(subject, vars),
              interpolate(body, vars) + linkUrl,
            );
            await supabase.from("dunning_events").insert({
              company_id: companyId,
              invoice_id: inv.id,
              rule_id: rule.id,
              level: rule.level,
              action_taken: `${rule.name} (${daysOverdue} days overdue)`,
            });
            await supabase.from("audit_logs").insert({
              company_id: companyId,
              actor_id: user.id,
              actor_role: profile?.role ?? "system",
              action: "dunning.escalated",
              entity: "invoices",
              entity_id: inv.id,
              details: { number: inv.number, level: rule.level, delivered },
            });
            result.dunningEscalations =
              Number(result.dunningEscalations) + 1;
          }
        }

        // Reminder scheduling.
        for (const cfg of (reminderConfigs ?? []) as ReminderConfig[]) {
          if (daysOverdue > 0) {
            // Post-due reminders at each frequency_days interval.
            if (daysOverdue % cfg.frequency_days !== 0) continue;
            const nextSeq = sentCount + 1;
            if (nextSeq > cfg.max_reminders) continue;
            const subject =
              lang === "de" ? cfg.subject_de : cfg.subject_en;
            const body = lang === "de" ? cfg.body_de : cfg.body_en;
            const link = await ensureInvoiceLink(supabase, companyId, inv.id);
            const linkUrl = link ? `\n\n${APP_BASE}/i/${link}` : "";
            const delivered = await sendEmail(
              resendKey,
              customer?.email ?? "",
              interpolate(subject, vars),
              interpolate(body, vars) + linkUrl,
            );
            await supabase.from("reminders").insert({
              company_id: companyId,
              invoice_id: inv.id,
              sequence: nextSeq,
              scheduled_date: todayISO,
              channel: "email",
              status: "sent",
              sent_at: new Date().toISOString(),
              delivery: delivered ? "email" : "simulated",
            });
            if (delivered) {
              result.remindersSent = Number(result.remindersSent) + 1;
            } else {
              result.remindersSimulated =
                Number(result.remindersSimulated) + 1;
            }
            await supabase.from("audit_logs").insert({
              company_id: companyId,
              actor_id: user.id,
              actor_role: profile?.role ?? "system",
              action: "reminder.sent",
              entity: "reminders",
              entity_id: inv.id,
              details: { number: inv.number, sequence: nextSeq, delivered },
            });
            break; // one reminder per invoice per cycle
          } else if (due) {
            // Pre-due reminder: send first sequence when within days_before_due.
            const daysToDue = Math.ceil(
              (due.getTime() - today.getTime()) / 86400000,
            );
            if (daysToDue <= cfg.days_before_due && daysToDue >= 0 && sentCount === 0) {
              const subject =
                lang === "de" ? cfg.subject_de : cfg.subject_en;
              const body = lang === "de" ? cfg.body_de : cfg.body_en;
              const link = await ensureInvoiceLink(supabase, companyId, inv.id);
              const linkUrl = link ? `\n\n${APP_BASE}/i/${link}` : "";
              const delivered = await sendEmail(
                resendKey,
                customer?.email ?? "",
                interpolate(subject, vars),
                interpolate(body, vars) + linkUrl,
              );
              await supabase.from("reminders").insert({
                company_id: companyId,
                invoice_id: inv.id,
                sequence: 1,
                scheduled_date: todayISO,
                channel: "email",
                status: "sent",
                sent_at: new Date().toISOString(),
                delivery: delivered ? "email" : "simulated",
              });
              if (delivered) {
                result.remindersSent = Number(result.remindersSent) + 1;
              } else {
                result.remindersSimulated =
                  Number(result.remindersSimulated) + 1;
              }
              await supabase.from("audit_logs").insert({
                company_id: companyId,
                actor_id: user.id,
                actor_role: profile?.role ?? "system",
                action: "reminder.sent",
                entity: "reminders",
                entity_id: inv.id,
                details: { number: inv.number, sequence: 1, delivered },
              });
              break;
            }
          }
        }
      }

      // Notify business users about overdue invoices.
      const { data: overdueInvoices } = await supabase
        .from("invoices")
        .select("number")
        .eq("company_id", companyId)
        .eq("status", "overdue");
      if ((overdueInvoices ?? []).length > 0) {
        const { data: businessUsers } = await supabase
          .from("profiles")
          .select("id")
          .eq("company_id", companyId)
          .eq("role", "business");
        for (const u of businessUsers ?? []) {
          await supabase.from("notifications").insert({
            user_id: u.id,
            title_en: "Overdue invoices need attention",
            title_de: "Überfällige Rechnungen benötigen Beachtung",
            body_en: `${overdueInvoices!.length} invoice(s) are currently overdue.`,
            body_de: `${overdueInvoices!.length} Rechnung(en) sind derzeit überfällig.`,
            type: "dunning",
            read: false,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("run-reminder-cycle failed", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
