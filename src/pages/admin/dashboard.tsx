import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  UserPlus,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { EChart } from "@/components/shared/echart";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Company, Profile, Subscription } from "@/types";

const PLAN_PRICES: Record<string, number> = { professional: 39, business: 79 };

interface Kpi {
  label: string;
  value: string;
  delta: number | null;
  hint: string;
  icon: typeof Building2;
}

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";

  const { data: companies } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*");
      return (data ?? []) as Company[];
    },
  });
  const { data: subscriptions } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("*");
      return (data ?? []) as Subscription[];
    },
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return (data ?? []) as Profile[];
    },
  });

  const now = new Date();
  const thisMonthKey = now.toISOString().slice(0, 7);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = prevDate.toISOString().slice(0, 7);

  const activeSubscriptions = (subscriptions ?? []).filter((s) => s.status === "active");
  const mrr = activeSubscriptions.reduce(
    (sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0),
    0,
  );
  const prevMrr = (subscriptions ?? [])
    .filter((s) => s.status === "active" && (s.created_at ?? "").slice(0, 7) <= prevMonthKey)
    .reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0);

  const activeCompanies = (companies ?? []).filter((c) => c.status === "active").length;
  const companiesCreatedPrev = (companies ?? []).filter(
    (c) => (c.created_at ?? "").slice(0, 7) === prevMonthKey,
  ).length;
  const companiesCreatedThis = (companies ?? []).filter(
    (c) => (c.created_at ?? "").slice(0, 7) === thisMonthKey,
  ).length;

  const signups30d = (users ?? []).filter(
    (u) => new Date(u.created_at) >= new Date(Date.now() - 30 * 86400000),
  ).length;
  const signupsPrev30d = (users ?? []).filter((u) => {
    const d = new Date(u.created_at);
    return d >= new Date(Date.now() - 60 * 86400000) && d < new Date(Date.now() - 30 * 86400000);
  }).length;

  const canceledCount = (subscriptions ?? []).filter(
    (s) => s.status === "canceled" && (s.created_at ?? "").slice(0, 7) === thisMonthKey,
  ).length;
  const churnRate = activeCompanies + canceledCount > 0
    ? (canceledCount / (activeCompanies + canceledCount)) * 100
    : 0;
  const prevCanceled = (subscriptions ?? []).filter(
    (s) => s.status === "canceled" && (s.created_at ?? "").slice(0, 7) === prevMonthKey,
  ).length;
  const prevChurn = activeCompanies + prevCanceled > 0
    ? (prevCanceled / (activeCompanies + prevCanceled)) * 100
    : 0;

  const pct = (cur: number, prev: number): number | null =>
    prev === 0 ? null : ((cur - prev) / Math.abs(prev)) * 100;

  const kpis: Kpi[] = [
    {
      label: t("admin.dashboard.companies"),
      value: String(activeCompanies),
      delta: pct(companiesCreatedThis, companiesCreatedPrev),
      hint: `${t("admin.dashboard.newSignups")}: ${companiesCreatedThis}`,
      icon: Building2,
    },
    {
      label: t("admin.dashboard.mrr"),
      value: money(mrr, lang),
      delta: pct(mrr, prevMrr),
      hint: `${activeSubscriptions.length} ${t("common.subscriptions").toLowerCase()}`,
      icon: CircleDollarSign,
    },
    {
      label: t("admin.dashboard.signups30"),
      value: String(signups30d),
      delta: pct(signups30d, signupsPrev30d),
      hint: t("admin.dashboard.signups30Hint"),
      icon: UserPlus,
    },
    {
      label: t("admin.dashboard.churn"),
      value: `${churnRate.toFixed(1)} %`,
      delta: pct(churnRate, prevChurn),
      hint: `${canceledCount} ${t("admin.dashboard.canceled").toLowerCase()}`,
      icon: Users,
    },
  ];

  // MRR last 12 months (bar, 60%) + plan split (donut, 40%)
  const mrrMonths = (() => {
    const map: { label: string; mrr: number }[] = [];
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const key = d.toISOString().slice(0, 7);
      map.push({
        label: new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", {
          month: "short",
        }).format(d),
        mrr: (subscriptions ?? [])
          .filter((s) => s.status === "active" && (s.created_at ?? "").slice(0, 7) <= key)
          .reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0),
      });
    }
    return map;
  })();

  const planData = ["trial", "professional", "business"].map((plan) => ({
    name:
      plan === "trial"
        ? t("landing.pricing.free.name")
        : plan === "professional"
          ? t("landing.pricing.pro.name")
          : t("landing.pricing.biz.name"),
    value: (companies ?? []).filter((c) => c.plan === plan).length,
  }));

  const chartTextColor = "hsl(var(--muted-foreground))";
  const chartBorderColor = "hsl(var(--border))";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("admin.consoleLabel")}
        title={t("admin.dashboard.title")}
        subtitle={t("admin.dashboard.subtitle")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                    {kpi.value}
                  </p>
                  {kpi.delta !== null && kpi.delta !== 0 ? (
                    <p
                      className={cn(
                        "mt-1 flex items-center gap-1 text-xs font-medium",
                        kpi.delta > 0 ? "text-primary" : "text-destructive",
                      )}
                    >
                      {kpi.delta > 0 ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                      {kpi.delta > 0 ? "+" : ""}
                      {kpi.delta.toFixed(1)} %
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">—</p>
                  )}
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {kpi.hint}
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-admin/15 text-admin">
                  <kpi.icon className="h-5 w-5" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.dashboard.mrr12")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EChart
              height={280}
              option={{
                tooltip: {
                  trigger: "axis",
                  valueFormatter: (v) => money(Number(v), lang),
                  backgroundColor: "hsl(var(--card))",
                  borderColor: chartBorderColor,
                  textStyle: { color: "hsl(var(--foreground))", fontSize: 12 },
                },
                grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
                xAxis: {
                  type: "category",
                  data: mrrMonths.map((m) => m.label),
                  axisLine: { lineStyle: { color: chartBorderColor } },
                  axisTick: { show: false },
                  axisLabel: { color: chartTextColor, fontSize: 11 },
                },
                yAxis: {
                  type: "value",
                  axisLine: { show: false },
                  axisTick: { show: false },
                  splitLine: { lineStyle: { color: chartBorderColor } },
                  axisLabel: { color: chartTextColor, fontSize: 11 },
                },
                series: [
                  {
                    name: t("admin.dashboard.mrr"),
                    type: "bar",
                    data: mrrMonths.map((m) => m.mrr),
                    itemStyle: { color: "hsl(var(--primary))", borderRadius: [6, 6, 0, 0] },
                    barMaxWidth: 28,
                  },
                ],
              }}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.dashboard.planSplit")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EChart
              height={280}
              option={{
                tooltip: {
                  trigger: "item",
                  backgroundColor: "hsl(var(--card))",
                  borderColor: chartBorderColor,
                  textStyle: { color: "hsl(var(--foreground))", fontSize: 12 },
                },
                legend: {
                  bottom: 0,
                  textStyle: { color: chartTextColor, fontSize: 12 },
                },
                series: [
                  {
                    name: t("common.companies"),
                    type: "pie",
                    radius: ["52%", "74%"],
                    center: ["50%", "44%"],
                    avoidLabelOverlap: true,
                    itemStyle: { borderRadius: 6, borderColor: "hsl(var(--card))", borderWidth: 2 },
                    label: { show: false },
                    emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold", color: "hsl(var(--foreground))" } },
                    data: planData.map((p, i) => ({
                      ...p,
                      itemStyle: {
                        color:
                          i === 0
                            ? "hsl(var(--muted-foreground)/0.4)"
                            : i === 1
                              ? "hsl(var(--primary))"
                              : "hsl(var(--admin))",
                      },
                    })),
                  },
                ],
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
