import { useQuery } from "@tanstack/react-query";
import {
  AlarmClock,
  ArrowRight,
  BellRing,
  CircleDollarSign,
  FileText,
  Plus,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import {
  useCustomers,
  useInvoices,
  usePayments,
  useReminders,
} from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { emailDocumentLink } from "@/hooks/use-magic-link";
import { formatDate, money } from "@/lib/format";
import { INVOICE_TYPE_KEYS } from "@/lib/status";
import type { DunningRule, Invoice } from "@/types";
import { toast } from "sonner";

const AppDashboard = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const firstName =
    (profile?.full_name ?? "").split(" ")[0] ||
    profile?.email?.split("@")[0] ||
    "";

  const { data: invoices, isLoading } = useInvoices(companyId);
  const { data: payments } = usePayments(companyId);
  const { data: customers } = useCustomers(companyId);
  const { data: reminders } = useReminders(companyId);

  const { data: dunningRules } = useQuery({
    queryKey: ["dunning-rules", companyId],
    queryFn: async () => {
      if (!companyId) return [] as DunningRule[];
      const { data } = await supabase
        .from("dunning_rules")
        .select("*")
        .eq("company_id", companyId)
        .eq("enabled", true)
        .order("level", { ascending: true });
      return (data ?? []) as DunningRule[];
    },
    enabled: !!companyId,
  });

  const remind = async (invoiceId: string) => {
    const res = await emailDocumentLink("invoice", invoiceId);
    if (!res.ok) {
      toast.error(t(res.error ?? "link.emailError"));
      return;
    }
    toast.success(res.delivered ? t("link.emailSent") : t("link.emailSimulated"));
  };

  // --- KPIs (real DB values) ---
  const open = (invoices ?? []).filter(
    (i) => i.status === "sent" || i.status === "overdue",
  );
  const outstanding = open.reduce((s, i) => s + i.total - i.amount_paid, 0);
  const overdue = (invoices ?? []).filter((i) => i.status === "overdue");
  const overdueTotal = overdue.reduce((s, i) => s + i.total - i.amount_paid, 0);

  const now = new Date();
  const thisMonth = (payments ?? []).filter((p) => {
    const d = new Date(p.paid_at ?? p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const collectedThisMonth = (thisMonth ?? []).reduce((s, p) => s + p.amount, 0);

  const nextScheduled = (reminders ?? [])
    .filter((r) => r.status === "scheduled" && r.scheduled_date)
    .sort(
      (a, b) =>
        new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime(),
    )[0];
  const nextReminderDays =
    nextScheduled && nextScheduled.scheduled_date
      ? Math.max(
          0,
          Math.round(
            (new Date(`${nextScheduled.scheduled_date}T00:00:00`).getTime() -
              now.getTime()) /
              86400000,
          ),
        )
      : null;

  // --- 12-week chart: receivables development & DSO ---
  const weekData = (() => {
    const points: { label: string; offen: number; dso: number }[] = [];
    for (let w = 11; w >= 0; w--) {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const startISO = start.toISOString().slice(0, 10);
      const endISO = end.toISOString().slice(0, 10);
      const weekOpen = (invoices ?? [])
        .filter(
          (i) =>
            (i.status === "sent" || i.status === "overdue") &&
            (i.issue_date ?? "") >= startISO &&
            (i.issue_date ?? "") <= endISO,
        )
        .reduce((s, i) => s + i.total - i.amount_paid, 0);
      const weekCollected = (payments ?? [])
        .filter((p) => (p.paid_at ?? p.created_at).slice(0, 10) >= startISO)
        .reduce((s, p) => s + p.amount, 0);
      const receivable = Math.max(weekOpen - weekCollected, 0);
      const dso = weekCollected > 0
        ? Math.round((receivable / Math.max(weekCollected, 1)) * 7)
        : 0;
      points.push({
        label: new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", {
          day: "2-digit",
          month: "2-digit",
        }).format(end),
        offen: receivable,
        dso,
      });
    }
    return points;
  })();

  const openColumns = (invoices ?? [])
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .slice(0, 5);

  const kpiCards = [
    {
      label: t("app.dashboard.outstanding"),
      value: money(outstanding, lang),
      hint: `${open.length} ${t("common.invoices").toLowerCase()}`,
      icon: Wallet,
      accent: true,
    },
    {
      label: t("app.dashboard.overdue"),
      value: money(overdueTotal, lang),
      hint: `${overdue.length} ${t("common.invoices").toLowerCase()}`,
      icon: TriangleAlert,
      accent: false,
    },
    {
      label: t("app.dashboard.collectedMonth"),
      value: money(collectedThisMonth, lang),
      hint: `${(thisMonth ?? []).length} ${t("common.payments").toLowerCase()}`,
      icon: CircleDollarSign,
      accent: false,
    },
    {
      label: t("app.dashboard.nextReminder"),
      value: nextReminderDays === null ? "—" : `${nextReminderDays} ${t("common.days")}`,
      hint: nextScheduled
        ? `${nextScheduled.invoice?.number ?? ""} · ${formatDate(nextScheduled.scheduled_date, lang)}`
        : t("app.dashboard.noScheduled"),
      icon: AlarmClock,
      accent: false,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("app.dashboard.welcomeBack")}
        title={t("app.dashboard.greeting", { name: firstName })}
        subtitle={t("app.dashboard.subtitle")}
        actions={
          <Button asChild>
            <Link to="/app/invoices">
              <FileText className="h-4 w-4" />
              {t("app.dashboard.viewInvoices")}
            </Link>
          </Button>
        }
      />

      {/* KPI cards — first card primary #10B981 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card
            key={kpi.label}
            className={
              kpi.accent
                ? "border-primary bg-primary text-foreground"
                : undefined
            }
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={
                      kpi.accent
                        ? "truncate text-sm font-medium text-primary-foreground/70"
                        : "truncate text-sm text-muted-foreground"
                    }
                  >
                    {kpi.label}
                  </p>
                  <p
                    className={
                      kpi.accent
                        ? "mt-2 text-2xl font-bold tracking-tight"
                        : "mt-2 text-2xl font-bold tracking-tight text-foreground"
                    }
                  >
                    {kpi.value}
                  </p>
                  {kpi.hint ? (
                    <p
                      className={
                        kpi.accent
                          ? "mt-1 truncate text-xs text-primary-foreground/60"
                          : "mt-1 truncate text-xs text-muted-foreground"
                      }
                    >
                      {kpi.hint}
                    </p>
                  ) : null}
                </div>
                <span
                  className={
                    kpi.accent
                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground/15"
                      : "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  }
                >
                  <kpi.icon className="h-5 w-5" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 65/35 split: open invoices / next reminder */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{t("app.dashboard.openInvoices")}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/invoices">
                {t("common.viewAll")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {openColumns.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-center">
                <Wallet className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  {t("app.dashboard.noOpen")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("app.dashboard.noOpenDesc")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>{t("common.number")}</TableHead>
                      <TableHead>{t("common.customer")}</TableHead>
                      <TableHead>{t("common.dueDate")}</TableHead>
                      <TableHead className="text-right">{t("common.amount")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openColumns.map((row: Invoice) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Link
                            to={`/app/invoices/${row.id}`}
                            className="font-semibold text-primary hover:underline"
                          >
                            {row.number}
                          </Link>
                        </TableCell>
                        <TableCell className="text-foreground/80">
                          {row.customer?.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(row.due_date, lang)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {money(row.total - row.amount_paid, lang)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void remind(row.id)}
                          >
                            <BellRing className="h-3.5 w-3.5" />
                            {t("app.dashboard.remind")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {t("app.dashboard.nextAutoReminder")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextScheduled ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-primary/10 p-4">
                  <p className="text-xs font-medium text-primary">
                    {t("app.dashboard.nextReminder")}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {nextReminderDays} {t("common.days")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(nextScheduled.scheduled_date, lang)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("common.invoice")}
                    </span>
                    <Link
                      to={`/app/invoices/${nextScheduled.invoice_id}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {nextScheduled.invoice?.number ?? "—"}
                    </Link>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("app.dashboard.sequence")}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {t("app.dashboard.level", { level: nextScheduled.sequence })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("app.dashboard.nextReminderDesc")}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-center">
                <AlarmClock className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  {t("app.dashboard.noReminders")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("app.dashboard.noRemindersDesc")}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link to="/app/reminders">
                    <Plus className="h-4 w-4" />
                    {t("app.reminders.title")}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full-width 12-week chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("app.dashboard.receivables12w")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={weekData} margin={{ left: -10, right: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value, name) => [
                  money(Number(value), lang),
                  name === "offen"
                    ? t("app.dashboard.outstanding")
                    : t("app.dashboard.dso"),
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                  background: "hsl(var(--card))",
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="offen"
                name="offen"
                radius={[6, 6, 0, 0]}
                fill="hsl(var(--primary))"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="dso"
                name="dso"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppDashboard;
