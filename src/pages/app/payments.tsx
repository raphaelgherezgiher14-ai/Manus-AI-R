import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleDollarSign, CreditCard } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { usePayments } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, applyPaymentToInvoice } from "@/lib/actions";
import { formatDate, money } from "@/lib/format";
import type { Payment } from "@/types";

const Payments = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: payments, isLoading } = usePayments(companyId);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const total = (payments ?? []).reduce((s, p) => s + p.amount, 0);
  const now = new Date();
  const thisMonth = (payments ?? []).filter((p) => {
    const d = new Date(p.paid_at ?? p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const pending = (payments ?? []).filter((p) => p.status === "pending");

  const confirmPayment = async (payment: Payment) => {
    setBusy(true);
    try {
      await applyPaymentToInvoice(payment.invoice_id, payment.amount);
      await supabase
        .from("payments")
        .update({ status: "succeeded", paid_at: new Date().toISOString() })
        .eq("id", payment.id);
      await logAudit({
        companyId,
        action: "payment.confirmed",
        entity: "payments",
        entityId: payment.id,
        details: { amount: payment.amount },
      });
      toast.success(t("app.payments.confirmed"));
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Payment>[] = [
    {
      key: "invoice",
      header: t("common.invoice"),
      cell: (row) => (
        <span className="font-semibold text-primary">{row.invoice?.number ?? "—"}</span>
      ),
    },
    {
      key: "customer",
      header: t("common.customer"),
      cell: (row) => <span className="text-foreground/80">{row.customer?.name ?? "—"}</span>,
    },
    {
      key: "method",
      header: t("common.method"),
      cell: (row) => (
        <span className="capitalize text-muted-foreground">
          {t(METHOD_KEY[row.method] ?? "common.card")}
        </span>
      ),
    },
    {
      key: "amount",
      header: t("common.amount"),
      cell: (row) => <span className="font-semibold">{money(row.amount, lang)}</span>,
    },
    {
      key: "date",
      header: t("common.date"),
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.paid_at, lang)}</span>,
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        row.status === "pending" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void confirmPayment(row)}
            disabled={busy}
          >
            <CheckCircle2 className="h-4 w-4" />
            {t("app.payments.confirm")}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.payments.title")}
        subtitle={t("app.payments.subtitle")}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t("app.payments.total")}
          value={money(total, lang)}
          icon={CircleDollarSign}
          tone="primary"
        />
        <StatCard
          label={t("app.dashboard.collectedMonth")}
          value={money(thisMonth.reduce((s, p) => s + p.amount, 0), lang)}
          icon={CreditCard}
          tone="info"
        />
        <StatCard
          label={t("app.payments.pending")}
          value={String(pending.length)}
          hint={money(pending.reduce((s, p) => s + p.amount, 0), lang)}
          icon={CircleDollarSign}
          tone="danger"
        />
      </div>

      <DataTable
        keyField="id"
        columns={columns}
        data={payments ?? []}
        loading={isLoading}
        empty={<EmptyState icon={CreditCard} title={t("common.empty")} description={t("app.payments.emptyDesc")} />}
      />
    </div>
  );
};

const METHOD_KEY: Record<string, string> = {
  card: "common.card",
  sepa: "common.sepa",
  bank_transfer: "common.bankTransfer",
};

export default Payments;

