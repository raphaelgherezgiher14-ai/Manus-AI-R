import { useQueryClient } from "@tanstack/react-query";
import { FileText, Mail, Plus, XCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useInvoices } from "@/hooks/use-company-data";
import { emailDocumentLink } from "@/hooks/use-magic-link";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/actions";
import { daysFromToday, formatDate, money } from "@/lib/format";
import { INVOICE_TYPE_KEYS } from "@/lib/status";
import type { Invoice } from "@/types";

const Invoices = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: invoices, isLoading } = useInvoices(companyId);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("open");
  const [search, setSearch] = useState("");

  const openInv = (invoices ?? []).filter(
    (i) => i.status === "draft" || i.status === "sent" || i.status === "overdue",
  );
  const paidInv = (invoices ?? []).filter((i) => i.status === "paid" || i.status === "canceled");
  const visible = (tab === "open" ? openInv : paidInv).filter((i) => {
    const ql = i.number.toLowerCase() + " " + (i.customer?.name ?? "").toLowerCase();
    return ql.includes(search.toLowerCase());
  });

  const remind = async (invoice: Invoice) => {
    const res = await emailDocumentLink("invoice", invoice.id);
    toast.success(res.delivered ? t("link.emailSent") : t("link.emailSimulated"));
  };

  const cancel = async (invoice: Invoice) => {
    if (!companyId) return;
    await supabase
      .from("invoices")
      .update({ status: "canceled" })
      .eq("id", invoice.id);
    await logAudit({
      companyId,
      action: "invoice.canceled",
      entity: "invoices",
      entityId: invoice.id,
      details: { number: invoice.number },
    });
    toast.success(t("app.invoices.canceled"));
    await queryClient.invalidateQueries({ queryKey: ["invoices"] });
  };

  const columns: Column<Invoice>[] = [
    {
      key: "number",
      header: t("common.number"),
      cell: (row) => (
        <Link to={`/app/invoices/${row.id}`} className="font-semibold text-primary hover:underline">
          {row.number}
        </Link>
      ),
    },
    {
      key: "customer",
      header: t("common.customer"),
      cell: (row) => <span className="text-foreground/80">{row.customer?.name}</span>,
    },
    {
      key: "type",
      header: t("common.invoice"),
      cell: (row) => (
        <span className="text-muted-foreground">{t(INVOICE_TYPE_KEYS[row.type] ?? row.type)}</span>
      ),
    },
    {
      key: "due",
      header: t("common.dueDate"),
      cell: (row) => {
        const d = daysFromToday(row.due_date);
        return (
          <span className={d !== null && d < 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
            {formatDate(row.due_date, lang)}
            {d !== null && d < 0 ? ` (${-d}d)` : ""}
          </span>
        );
      },
    },
    {
      key: "amount",
      header: t("common.amount"),
      cell: (row) => (
        <div className="text-right">
          <p className="font-semibold">{money(row.total - row.amount_paid, lang)}</p>
          {row.amount_paid > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("common.paid")}: {money(row.amount_paid, lang)}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === "sent" || row.status === "overdue" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void remind(row)}
            >
              <Mail className="h-3.5 w-3.5" />
              {t("app.invoices.remind")}
            </Button>
          ) : null}
          {row.status === "draft" || row.status === "sent" || row.status === "overdue" ? (
            <ConfirmDialog
              title={t("app.invoices.cancelTitle")}
              description={t("app.invoices.cancelDesc", { number: row.number })}
              confirmLabel={t("app.invoices.cancel")}
              trigger={
                <Button variant="ghost" size="icon" aria-label={t("app.invoices.cancel")}>
                  <XCircle className="h-4 w-4" />
                </Button>
              }
              onConfirm={() => cancel(row)}
            />
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.invoices.title")}
        subtitle={t("app.invoices.subtitle")}
        actions={
          <Button asChild>
            <Link to="/app/quotes/new">
              <Plus className="h-4 w-4" />
              {t("app.invoices.new")}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="open">{t("app.invoices.open")}</TabsTrigger>
            <TabsTrigger value="paid">{t("app.invoices.settled")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="w-full max-w-sm">
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        keyField="id"
        columns={columns}
        data={visible}
        loading={isLoading}
        empty={
          <EmptyState
            icon={FileText}
            title={t("common.empty")}
            description={
              tab === "open"
                ? t("app.invoices.emptyOpen")
                : t("app.invoices.emptyPaid")
            }
            action={
              tab === "open" ? (
                <Button asChild>
                  <Link to="/app/quotes/new">{t("app.quotes.new")}</Link>
                </Button>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
};

export default Invoices;
