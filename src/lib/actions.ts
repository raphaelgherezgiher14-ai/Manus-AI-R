import { supabase } from "@/integrations/supabase/client";

/**
 * Insert an audit log entry on behalf of the current user (RLS: company member).
 */
export async function logAudit(input: {
  companyId: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  await supabase.from("audit_logs").insert({
    company_id: input.companyId,
    actor_id: user.id,
    actor_role: profile?.role ?? "business",
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId,
    details: input.details ?? {},
  });
}

/** Next sequential document number, e.g. Q-2026-006 / INV-2026-0009. */
export async function nextDocumentNumber(
  table: "quotes" | "invoices",
  companyId: string,
): Promise<string> {
  const prefix = table === "quotes" ? "Q" : "INV";
  const { data } = await supabase
    .from(table)
    .select("number")
    .eq("company_id", companyId)
    .order("number", { ascending: false })
    .limit(1);
  const last = (data?.[0]?.number as string | undefined) ?? "";
  const year = new Date().getFullYear();
  const match = last.match(/(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

/**
 * Applies a confirmed payment to its invoice: raises `amount_paid` and marks the
 * invoice `paid` once the balance is settled. Partial payments keep the current
 * status. Returns the resulting status (or null when the invoice is gone).
 *
 * Shared by the payments list and the invoice detail page so both behave the same.
 */
export async function applyPaymentToInvoice(
  invoiceId: string,
  amount: number,
): Promise<string | null> {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("total, amount_paid, status")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) return null;

  const newPaid = Math.round((invoice.amount_paid + amount) * 100) / 100;
  const settled = Math.abs(newPaid - invoice.total) < 0.01;
  const newStatus = settled ? "paid" : invoice.status;

  await supabase
    .from("invoices")
    .update({ amount_paid: newPaid, status: newStatus })
    .eq("id", invoiceId);

  return newStatus;
}
