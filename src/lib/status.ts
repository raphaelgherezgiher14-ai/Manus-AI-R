// Maps domain status values to i18n keys and badge tone.
export const STATUS_KEYS: Record<string, string> = {
  draft: "common.draft",
  sent: "common.sent",
  accepted: "common.accepted",
  declined: "common.declined",
  expired: "common.expired",
  paid: "common.paid",
  overdue: "common.overdue",
  canceled: "common.canceled",
  active: "common.active",
  archived: "common.inactive",
  suspended: "common.disabled",
  completed: "common.completed",
  "on_hold": "common.onHold",
  pending: "common.pending",
  in_progress: "common.inProgress",
  scheduled: "common.scheduled",
  succeeded: "common.paid",
  failed: "common.failed",
  trialing: "common.trial",
  past_due: "common.pastDue",
  enabled: "common.enabled",
  disabled: "common.disabled",
};

// Static keys for dynamic-looking entity types (keeps t() args literals).
export const INVOICE_TYPE_KEYS: Record<string, string> = {
  deposit: "invoice.type.deposit",
  progress: "invoice.type.progress",
  final: "invoice.type.final",
};

export const PAYMENT_METHOD_KEYS: Record<string, string> = {
  card: "common.card",
  sepa: "common.sepa",
  bank_transfer: "common.bankTransfer",
};

// Semantic token-based badge tones.
export type BadgeTone =
  | "success"
  | "info"
  | "danger"
  | "neutral"
  | "warning";

export const STATUS_TONES: Record<string, BadgeTone> = {
  draft: "neutral",
  scheduled: "neutral",
  sent: "info",
  pending: "info",
  in_progress: "info",
  accepted: "success",
  paid: "success",
  succeeded: "success",
  completed: "success",
  active: "success",
  enabled: "success",
  declined: "danger",
  expired: "danger",
  overdue: "danger",
  failed: "danger",
  canceled: "neutral",
  archived: "neutral",
  suspended: "danger",
  disabled: "neutral",
  "on_hold": "neutral",
  trialing: "warning",
  past_due: "danger",
};

export const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-primary/10 text-primary border-primary/20",
  info: "bg-admin/10 text-admin border-admin/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  neutral: "bg-muted text-muted-foreground border-border",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
};

export function statusTone(status: string): BadgeTone {
  return STATUS_TONES[status] ?? "neutral";
}
