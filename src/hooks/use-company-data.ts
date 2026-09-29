import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type {
  AuditLog,
  Company,
  Customer,
  Doc,
  DunningEvent,
  DunningRule,
  Integration,
  Invoice,
  Message,
  Payment,
  PaymentMethod,
  Profile,
  Project,
  ProjectPhase,
  Quote,
  Reminder,
  ReminderConfig,
  RoleDef,
  Subscription,
} from "@/types";

async function list<T>(
  table: string,
  companyId?: string,
  select = "*",
): Promise<T[]> {
  let query = supabase.from(table).select(select);
  if (companyId) query = query.eq("company_id", companyId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

export function useCustomers(companyId?: string | null) {
  return useQuery({
    queryKey: ["customers", companyId],
    queryFn: () => list<Customer>("customers", companyId ?? undefined),
    enabled: !!companyId,
  });
}

export function useProjects(companyId?: string | null) {
  return useQuery({
    queryKey: ["projects", companyId],
    queryFn: () =>
      list<Project & { customer?: Customer }>(
        "projects",
        companyId ?? undefined,
        "*, customer(*)",
      ),
    enabled: !!companyId,
  });
}

export function useQuotes(companyId?: string | null) {
  return useQuery({
    queryKey: ["quotes", companyId],
    queryFn: () =>
      list<Quote & { customer?: Customer }>(
        "quotes",
        companyId ?? undefined,
        "*, customer(*)",
      ),
    enabled: !!companyId,
  });
}

export function useInvoices(companyId?: string | null) {
  return useQuery({
    queryKey: ["invoices", companyId],
    queryFn: () =>
      list<Invoice & { customer?: Customer; project?: Project }>(
        "invoices",
        companyId ?? undefined,
        "*, customer(*), project(*)",
      ),
    enabled: !!companyId,
  });
}

export function usePayments(companyId?: string | null) {
  return useQuery({
    queryKey: ["payments", companyId],
    queryFn: () =>
      list<Payment & { invoice?: Invoice; customer?: Customer }>(
        "payments",
        companyId ?? undefined,
        "*, invoice(*), customer(*)",
      ),
    enabled: !!companyId,
  });
}

export function useReminderConfigs(companyId?: string | null) {
  return useQuery({
    queryKey: ["reminder-configs", companyId],
    queryFn: () =>
      list<ReminderConfig>("reminder_configs", companyId ?? undefined),
    enabled: !!companyId,
  });
}

export function useReminders(companyId?: string | null) {
  return useQuery({
    queryKey: ["reminders", companyId],
    queryFn: () =>
      list<Reminder & { invoice?: Invoice }>(
        "reminders",
        companyId ?? undefined,
        "*, invoice(*)",
      ),
    enabled: !!companyId,
  });
}

export function useDunningRules(companyId?: string | null) {
  return useQuery({
    queryKey: ["dunning-rules", companyId],
    queryFn: () => list<DunningRule>("dunning_rules", companyId ?? undefined),
    enabled: !!companyId,
  });
}

export function useDunningEvents(companyId?: string | null) {
  return useQuery({
    queryKey: ["dunning-events", companyId],
    queryFn: () =>
      list<DunningEvent & { invoice?: Invoice }>(
        "dunning_events",
        companyId ?? undefined,
        "*, invoice(*)",
      ),
    enabled: !!companyId,
  });
}

export function useMessages(companyId?: string | null) {
  return useQuery({
    queryKey: ["messages", companyId],
    queryFn: () => list<Message>("messages", companyId ?? undefined),
    enabled: !!companyId,
  });
}

export function useDocuments(companyId?: string | null) {
  return useQuery({
    queryKey: ["documents", companyId],
    queryFn: () => list<Doc>("documents", companyId ?? undefined),
    enabled: !!companyId,
  });
}

export function usePaymentMethods(companyId?: string | null) {
  return useQuery({
    queryKey: ["payment-methods", companyId],
    queryFn: () => list<PaymentMethod>("payment_methods", companyId ?? undefined),
    enabled: !!companyId,
  });
}

export function useIntegrations(companyId?: string | null) {
  return useQuery({
    queryKey: ["integrations", companyId],
    queryFn: () => list<Integration>("integrations", companyId ?? undefined),
    enabled: !!companyId,
  });
}

export function useSubscription(companyId?: string | null) {
  return useQuery({
    queryKey: ["subscription", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as Subscription) ?? null;
    },
    enabled: !!companyId,
  });
}

export function useCompany(companyId?: string | null) {
  return useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();
      return (data as Company) ?? null;
    },
    enabled: !!companyId,
  });
}

export function useAuditLogs(companyId?: string | null) {
  return useQuery({
    queryKey: ["audit", companyId],
    queryFn: () =>
      list<AuditLog & { actor?: Profile }>(
        "audit_logs",
        companyId ?? undefined,
        "*, actor:profiles!actor_id(*)",
      ),
    enabled: !!companyId,
  });
}

export function useRoles(companyId?: string | null) {
  return useQuery({
    queryKey: ["roles", companyId ?? "system"],
    queryFn: async () => {
      const { data } = await supabase
        .from("roles")
        .select("*")
        .or(`company_id.is.null${companyId ? `,company_id.eq.${companyId}` : ""}`)
        .order("name");
      return (data ?? []) as RoleDef[];
    },
  });
}

export function usePhases(projectId?: string) {
  return useQuery({
    queryKey: ["phases", projectId],
    queryFn: async () => {
      if (!projectId) return [] as ProjectPhase[];
      const { data, error } = await supabase
        .from("project_phases")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ProjectPhase[];
    },
    enabled: !!projectId,
  });
}

export function useMembers(companyId?: string | null) {
  return useQuery({
    queryKey: ["members", companyId],
    queryFn: async () => {
      if (!companyId) return [] as Profile[];
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", companyId);
      return (data ?? []) as Profile[];
    },
    enabled: !!companyId,
  });
}

/** The customer row linked to the currently signed-in user's email. */
export function useMyCustomer(email?: string | null) {
  return useQuery({
    queryKey: ["my-customer", email],
    queryFn: async () => {
      if (!email) return null;
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      return (data as Customer) ?? null;
    },
    enabled: !!email,
  });
}

/** Customer-scoped rows for the portal. */
export function useCustomerInvoices(customerId?: string | null) {
  return useQuery({
    queryKey: ["customer-invoices", customerId],
    queryFn: async () => {
      if (!customerId) return [] as Invoice[];
      const { data } = await supabase
        .from("invoices")
        .select("*, project(*)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Invoice[];
    },
    enabled: !!customerId,
  });
}

export function useCustomerQuotes(customerId?: string | null) {
  return useQuery({
    queryKey: ["customer-quotes", customerId],
    queryFn: async () => {
      if (!customerId) return [] as Quote[];
      const { data } = await supabase
        .from("quotes")
        .select("*, project(*)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Quote[];
    },
    enabled: !!customerId,
  });
}

export function useCustomerProjects(customerId?: string | null) {
  return useQuery({
    queryKey: ["customer-projects", customerId],
    queryFn: async () => {
      if (!customerId) return [] as Project[];
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Project[];
    },
    enabled: !!customerId,
  });
}

export function useCustomerPayments(customerId?: string | null) {
  return useQuery({
    queryKey: ["customer-payments", customerId],
    queryFn: async () => {
      if (!customerId) return [] as Payment[];
      const { data } = await supabase
        .from("payments")
        .select("*, invoice(*)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Payment[];
    },
    enabled: !!customerId,
  });
}

export function useCustomerMessages(customerId?: string | null) {
  return useQuery({
    queryKey: ["customer-messages", customerId],
    queryFn: async () => {
      if (!customerId) return [] as Message[];
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true });
      return (data ?? []) as Message[];
    },
    enabled: !!customerId,
  });
}

export function useCustomerDocuments(customerId?: string | null) {
  return useQuery({
    queryKey: ["customer-documents", customerId],
    queryFn: async () => {
      if (!customerId) return [] as Doc[];
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Doc[];
    },
    enabled: !!customerId,
  });
}

/** Phase progress per project (customer view). */
export function useCustomerPhaseProgress(customerId?: string | null) {
  return useQuery({
    queryKey: ["customer-phases", customerId],
    queryFn: async () => {
      if (!customerId) return {} as Record<string, number>;
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("customer_id", customerId);
      const ids = (projects ?? []).map((p) => p.id);
      if (ids.length === 0) return {};
      const { data } = await supabase
        .from("project_phases")
        .select("project_id, percent_of_total, status")
        .in("project_id", ids);
      const map: Record<string, number> = {};
      for (const phase of data ?? []) {
        if (phase.status === "completed") {
          map[phase.project_id] = (map[phase.project_id] ?? 0) + phase.percent_of_total;
        }
      }
      return map;
    },
    enabled: !!customerId,
  });
}
