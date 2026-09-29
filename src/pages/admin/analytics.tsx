import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/format";
import type { Invoice, Payment, Profile } from "@/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AdminAnalytics = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";

  const { data: payments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*");
      return (data ?? []) as Payment[];
    },
  });
  const { data: invoices } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*");
      return (data ?? []) as Invoice[];
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
  const signupsByMonth = () => {
    const map: Record<string, number> = {};
    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = 0;
    }
    for (const u of users ?? []) {
      const key = u.created_at.slice(0, 7);
      if (map[key] !== undefined) map[key] += 1;
    }
    return Object.entries(map).map(([key, count]) => ({
      label: new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { month: "short" }).format(
        new Date(`${key}-01T00:00:00`),
      ),
      count,
    }));
  };

  const STATUS_KEY: Record<string, string> = {
    draft: "common.draft",
    sent: "common.sent",
    paid: "common.paid",
    overdue: "common.overdue",
    canceled: "common.canceled",
  };
  const invoiceStatus = ["draft", "sent", "paid", "overdue", "canceled"].map((status) => ({
    name: t(STATUS_KEY[status] ?? status),
    value: (invoices ?? []).filter((i) => i.status === status).length,
  }));
  const COLORS = ["hsl(var(--muted-foreground))", "hsl(var(--admin))", "hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.analytics.title")} subtitle={t("admin.analytics.subtitle")} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.analytics.signups")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={signupsByMonth()} margin={{ left: -10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, background: "hsl(var(--card))" }} />
                <Bar dataKey="count" name={t("admin.dashboard.users")} radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.analytics.invoiceStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={invoiceStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {invoiceStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, background: "hsl(var(--card))" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
