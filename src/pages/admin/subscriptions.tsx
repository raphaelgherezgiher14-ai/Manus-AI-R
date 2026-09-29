import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, money } from "@/lib/format";
import type { Company, Subscription } from "@/types";

const AdminSubscriptions = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*, company(*)")
        .order("created_at", { ascending: false });
      return (data ?? []) as (Subscription & { company?: Company })[];
    },
  });

  const total = (data ?? []).filter((s) => s.status === "active").reduce(
    (sum, s) => sum + (s.plan === "business" ? 79 : 39),
    0,
  );

  const columns: Column<Subscription & { company?: Company }>[] = [
    {
      key: "company",
      header: t("common.company"),
      cell: (r) => <span className="font-medium text-foreground">{r.company?.name ?? "—"}</span>,
    },
    {
      key: "plan",
      header: t("common.plan"),
      cell: (r) => (
        <span className="font-semibold">
          {r.plan === "business" ? t("landing.pricing.biz.name") : t("landing.pricing.pro.name")}
        </span>
      ),
    },
    {
      key: "price",
      header: t("common.month"),
      cell: (r) => <span>{money(r.plan === "business" ? 79 : 39, lang)}</span>,
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "period",
      header: t("admin.subscriptions.period"),
      cell: (r) => (
        <span className="text-muted-foreground">
          {formatDate(r.period_start, lang)} — {formatDate(r.period_end, lang)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.subscriptions.title")} subtitle={t("admin.subscriptions.subtitle")} />

      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-muted-foreground">{t("admin.subscriptions.mrr")}</p>
            <p className="text-2xl font-bold text-primary">{money(total, lang)}</p>
          </div>
          <CreditCard className="h-8 w-8 text-muted-foreground/40" />
        </CardContent>
      </Card>

      <DataTable
        keyField="id"
        columns={columns}
        data={data ?? []}
        loading={isLoading}
        empty={<EmptyState icon={CreditCard} title={t("common.empty")} />}
      />
    </div>
  );
};

export default AdminSubscriptions;
