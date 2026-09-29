import { BarChart3, CircleDollarSign, Percent, Timer, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
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
import { useCustomers, useInvoices, usePayments } from "@/hooks/use-company-data";
import { money } from "@/lib/format";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const Cashflow = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: invoices } = useInvoices(companyId);
  const { data: payments } = usePayments(companyId);
  const { data: customers } = useCustomers(companyId);

  const outstanding = (invoices ?? [])
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + i.total - i.amount_paid, 0);

  const collected12m = (payments ?? []).reduce((s, p) => s + p.amount, 0);
  const dso = collected12m > 0 ? ((outstanding / collected12m) * 365).toFixed(0) : "0";

  const overdueTotal = (invoices ?? [])
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + i.total - i.amount_paid, 0);
  const overduePct = outstanding > 0 ? Math.round((overdueTotal / outstanding) * 100) : 0;

  const now = new Date();
  const months: { label: string; invoiced: number; collected: number }[] = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { month: "short" }).format(d);
    months.push({
      label,
      invoiced: (invoices ?? []).filter((i) => (i.issue_date ?? "").startsWith(key)).reduce((s, i) => s + i.total, 0),
      collected: (payments ?? []).filter((p) => (p.paid_at ?? p.created_at).startsWith(key)).reduce((s, p) => s + p.amount, 0),
    });
  }

  const byCustomer = (customers ?? []).map((c) => {
    const open = (invoices ?? []).filter(
      (i) => i.customer_id === c.id && (i.status === "sent" || i.status === "overdue"),
    );
    const balance = open.reduce((s, i) => s + i.total - i.amount_paid, 0);
    const overdue = open.filter((i) => i.status === "overdue").reduce((s, i) => s + i.total - i.amount_paid, 0);
    return { customer: c.name, balance, overdue };
  }).sort((a, b) => b.balance - a.balance);

  const aging = [
    { name: t("common.sent"), value: (invoices ?? []).filter((i) => i.status === "sent").reduce((s, i) => s + i.total - i.amount_paid, 0) },
    { name: "1–30d", value: (invoices ?? []).filter((i) => i.status === "overdue").reduce((s, i) => s + i.total - i.amount_paid, 0) },
    { name: "31–60d", value: 0 },
    { name: "60d+", value: 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.cashflow.title")}
        subtitle={t("app.cashflow.subtitle")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("app.cashflow.ar")} value={money(outstanding, lang)} icon={Wallet} tone="primary" />
        <StatCard label={t("app.cashflow.collected12")} value={money(collected12m, lang)} icon={CircleDollarSign} tone="info" />
        <StatCard label={t("app.cashflow.dso")} value={`${dso} ${t("common.days")}`} icon={Timer} tone="neutral" />
        <StatCard label={t("app.cashflow.overdueShare")} value={`${overduePct}%`} icon={Percent} tone="danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("app.dashboard.cashflow")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={months} margin={{ left: -10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => money(Number(value), lang)}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, background: "hsl(var(--card))" }}
                />
                <Legend />
                <Bar dataKey="invoiced" name={t("app.dashboard.invoiced")} radius={[4, 4, 0, 0]} fill="hsl(var(--admin))" />
                <Bar dataKey="collected" name={t("app.dashboard.collected")} radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("app.dashboard.aging")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={aging} margin={{ left: -10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => money(Number(value), lang)}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, background: "hsl(var(--card))" }}
                />
                <Area type="monotone" dataKey="value" name={t("app.dashboard.outstanding")} stroke="hsl(var(--primary))" strokeWidth={2} fill="hsl(var(--primary)/0.15)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            {t("app.cashflow.byCustomer")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.customer")}</TableHead>
                <TableHead className="text-right">{t("app.dashboard.outstanding")}</TableHead>
                <TableHead className="text-right">{t("common.overdue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCustomer.map((row) => (
                <TableRow key={row.customer}>
                  <TableCell className="font-medium text-foreground">{row.customer}</TableCell>
                  <TableCell className="text-right font-semibold">{money(row.balance, lang)}</TableCell>
                  <TableCell className="text-right text-destructive">{money(row.overdue, lang)}</TableCell>
                </TableRow>
              ))}
              {byCustomer.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    {t("common.noData")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cashflow;
