export type Role = "business" | "customer" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  company_id: string | null;
  language: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  vat_id: string | null;
  currency: string;
  logo_url: string | null;
  plan: "trial" | "professional" | "business";
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  status: "active" | "suspended";
  vat_status: "kleinunternehmer" | "regelbesteuert";
  default_vat_rate: 7 | 19;
  tax_number: string | null;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_id: string | null;
  language: "en" | "de";
  status: "active" | "archived";
  created_at: string;
}

export type ProjectStatus = "quote" | "active" | "on_hold" | "completed";

export interface Project {
  id: string;
  company_id: string;
  customer_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  total_value: number;
  deposit_percent: number;
  deposit_due_days: number;
  start_date: string | null;
  end_date: string | null;
  currency: string;
  created_at: string;
  customer?: Customer;
}

export type PhaseStatus = "pending" | "in_progress" | "completed";

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  percent_of_total: number;
  status: PhaseStatus;
  planned_start: string | null;
  planned_end: string | null;
  sort_order: number;
  created_at: string;
}

export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "expired";

export interface Quote {
  id: string;
  company_id: string;
  customer_id: string;
  project_id: string | null;
  number: string;
  title: string;
  status: QuoteStatus;
  issue_date: string;
  valid_until: string | null;
  deposit_percent: number;
  notes: string | null;
  total: number;
  net_total: number;
  vat_amount: number;
  vat_rate: number | null;
  currency: string;
  pdf_url: string | null;
  created_at: string;
  customer?: Customer;
  project?: Project;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order: number;
}

export type InvoiceType = "deposit" | "progress" | "final";
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "canceled";

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  project_id: string | null;
  quote_id: string | null;
  phase_id: string | null;
  number: string;
  type: InvoiceType;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  service_date: string | null;
  total: number;
  net_total: number;
  vat_amount: number;
  vat_rate: number | null;
  amount_paid: number;
  currency: string;
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
  customer?: Customer;
  project?: Project;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order: number;
}

export interface Payment {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_id: string;
  amount: number;
  method: "card" | "sepa" | "bank_transfer";
  status: "succeeded" | "pending" | "failed";
  paid_at: string | null;
  reference: string | null;
  created_at: string;
  invoice?: Invoice;
  customer?: Customer;
}

export interface ReminderConfig {
  id: string;
  company_id: string;
  name: string;
  enabled: boolean;
  days_before_due: number;
  frequency_days: number;
  max_reminders: number;
  subject_en: string | null;
  subject_de: string | null;
  body_en: string | null;
  body_de: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  company_id: string;
  invoice_id: string;
  sequence: number;
  scheduled_date: string | null;
  channel: string;
  status: "scheduled" | "sent" | "skipped" | "failed";
  sent_at: string | null;
  delivery: "email" | "simulated";
  created_at: string;
  invoice?: Invoice;
}

export interface DunningRule {
  id: string;
  company_id: string;
  name: string;
  level: number;
  trigger_days_overdue: number;
  action: "email_reminder" | "escalation_notice" | "final_notice";
  subject_en: string | null;
  subject_de: string | null;
  body_en: string | null;
  body_de: string | null;
  enabled: boolean;
  created_at: string;
}

export interface DunningEvent {
  id: string;
  company_id: string;
  invoice_id: string;
  rule_id: string | null;
  level: number;
  action_taken: string;
  created_at: string;
  invoice?: Invoice;
}

export interface Message {
  id: string;
  company_id: string;
  customer_id: string;
  project_id: string | null;
  sender_id: string | null;
  sender_role: "business" | "customer";
  content: string;
  created_at: string;
}

export interface Doc {
  id: string;
  company_id: string;
  customer_id: string | null;
  project_id: string | null;
  name: string;
  kind: "contract" | "brief" | "report" | "other";
  url: string | null;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  company_id: string;
  name: string;
  kind: "card" | "sepa" | "bank_transfer";
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

export interface Integration {
  id: string;
  company_id: string;
  name: string;
  kind: "email" | "accounting" | "crm";
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan: "professional" | "business";
  status: "trialing" | "active" | "canceled" | "past_due";
  trial_start: string | null;
  trial_end: string | null;
  period_start: string | null;
  period_end: string | null;
  stripe_session_id: string | null;
  created_at: string;
}

export interface RoleDef {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
  created_at: string;
}

export interface Setting {
  id: string;
  company_id: string | null;
  key: string;
  value: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  company_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  actor?: Profile;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title_en: string;
  title_de: string;
  body_en: string | null;
  body_de: string | null;
  type: "info" | "payment" | "reminder" | "dunning" | "system";
  read: boolean;
  created_at: string;
}

export interface ShareLink {
  id: string;
  company_id: string;
  document_type: "quote" | "invoice";
  quote_id: string | null;
  invoice_id: string | null;
  token: string;
  created_by: string | null;
  created_at: string;
}

/* ---- Public magic-link document (returned by get_document_by_token) ---- */

export interface PublicVat {
  vat_status: "kleinunternehmer" | "regelbesteuert";
  vat_rate: number | null;
  net_total: number;
  vat_amount: number;
  gross_total: number;
}

export interface PublicDeposit {
  number: string;
  net_total: number;
  vat_amount: number;
  total: number;
  status: string;
}

export interface PublicPaymentInfo {
  method: string;
  status: string;
  amount: number;
  paid_at: string | null;
}

export interface PublicPayOptions {
  card_enabled: boolean;
  sepa_enabled: boolean;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
}

export interface PublicDocument {
  document_type: "quote" | "invoice";
  invoice?: Invoice & { items: InvoiceItem[] };
  quote?: Quote & { items: QuoteItem[] };
  customer?: Customer;
  company?: Company;
  vat?: PublicVat;
  deposits?: PublicDeposit[];
  payments?: PublicPaymentInfo[];
  pay_options?: PublicPayOptions;
}
