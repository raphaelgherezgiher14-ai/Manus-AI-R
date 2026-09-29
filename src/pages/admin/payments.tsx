import { useQuery } from "@tanstack/react-query";
import { Download, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, money } from "@/lib/format";

interface SubscriptionPayment {
  id: string;
  company_id: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  stripe_session_id: string | null;
  paid_at: string;
  created_at: string;
}

const AdminPayments = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-subscription-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_payments")
        .select("*")
        .order("paid_at", { ascending: false });
      return (data ?? []) as SubscriptionPayment[];
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const companyName = (id: string) => companies?.find((c) => c.id === id)?.name ?? "—";
  const total = (payments ?? []).reduce((s, p) => s + p.amount, 0);

  const exportCsv = () => {
    const header = [
      t("common.date"),
      t("common.company"),
      t("common.plan"),
      t("common.amount"),
      t("common.status"),
    ];
    const rows = (payments ?? []).map((p) => [
      p.paid_at,
      companyName(p.company_id),
      p.plan,
      String(p.amount),
      p.status,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payalarm-subscription-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("admin.consoleLabel")}
        title={t("admin.payments.title")}
        subtitle={t("admin.payments.subtitle")}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={(payments ?? []).length === 0}>
            <Download className="h-4 w-4" />
            {t("common.export")}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">{t("admin.payments.total")}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{money(total, lang)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : (payments ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <Receipt className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                {t("admin.payments.empty")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("admin.payments.emptyDesc")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5">{t("common.date")}</th>
                    <th className="px-3 py-2.5">{t("common.company")}</th>
                    <th className="px-3 py-2.5">{t("common.plan")}</th>
                    <th className="px-3 py-2.5 text-right">{t("common.amount")}</th>
                    <th className="px-3 py-2.5">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(payments ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-border/40">
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {formatDate(p.paid_at, lang)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        {companyName(p.company_id)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="capitalize text-muted-foreground">
                          {p.plan === "professional"
                            ? t("landing.pricing.pro.name")
                            : t("landing.pricing.biz.name")}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold">
                        {money(p.amount, lang, p.currency)}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={p.status} />
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

export default AdminPayments;
