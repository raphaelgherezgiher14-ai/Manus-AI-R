import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, money } from "@/lib/format";
import { INVOICE_TYPE_KEYS } from "@/lib/status";
import type { Invoice } from "@/types";

type Company = { name: string | null };

const AdminInvoiceManagement = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("*, company(*)")
        .order("created_at", { ascending: false });
      return (data ?? []) as (Invoice & { company?: Company })[];
    },
  });

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of invoices ?? []) {
      if (i.company_id && i.company?.name) map.set(i.company_id, i.company.name);
    }
    return Array.from(map.entries());
  }, [invoices]);

  const filtered = (invoices ?? []).filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (typeFilter !== "all" && i.type !== typeFilter) return false;
    if (companyFilter !== "all" && i.company_id !== companyFilter) return false;
    return true;
  });

  const exportCsv = () => {
    const header = [
      t("common.number"),
      t("common.company"),
      t("common.customer"),
      t("invoice.type.progress"),
      t("common.issueDate"),
      t("common.dueDate"),
      t("common.amount"),
      t("common.status"),
    ];
    const rows = filtered.map((i) => [
      i.number,
      i.company?.name ?? "",
      String(i.customer_id),
      t(INVOICE_TYPE_KEYS[i.type] ?? i.type),
      i.issue_date,
      i.due_date ?? "",
      String(i.total),
      i.status,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payalarm-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("admin.consoleLabel")}
        title={t("admin.invoiceMgmt.title")}
        subtitle={t("admin.invoiceMgmt.subtitle")}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" />
            {t("common.export")}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="draft">{t("common.draft")}</SelectItem>
            <SelectItem value="sent">{t("common.sent")}</SelectItem>
            <SelectItem value="paid">{t("common.paid")}</SelectItem>
            <SelectItem value="overdue">{t("common.overdue")}</SelectItem>
            <SelectItem value="canceled">{t("common.canceled")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="deposit">{t("invoice.type.deposit")}</SelectItem>
            <SelectItem value="progress">{t("invoice.type.progress")}</SelectItem>
            <SelectItem value="final">{t("invoice.type.final")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="lg:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {companyOptions.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                {t("common.empty")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5">{t("common.number")}</th>
                    <th className="px-3 py-2.5">{t("common.company")}</th>
                    <th className="px-3 py-2.5">{t("common.invoice")}</th>
                    <th className="px-3 py-2.5">{t("common.issueDate")}</th>
                    <th className="px-3 py-2.5">{t("common.dueDate")}</th>
                    <th className="px-3 py-2.5 text-right">{t("common.amount")}</th>
                    <th className="px-3 py-2.5">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/40">
                      <td className="px-3 py-2.5 font-semibold text-primary">{inv.number}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {inv.company?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {t(INVOICE_TYPE_KEYS[inv.type] ?? inv.type)}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {formatDate(inv.issue_date, lang)}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {formatDate(inv.due_date, lang)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold">
                        {money(inv.total - inv.amount_paid, lang)}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvoiceManagement;
