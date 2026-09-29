import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { daysFromToday, formatDate, money } from "@/lib/format";
import { INVOICE_TYPE_KEYS } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/types";

type ViewMode = "month" | "week";

const AdminDeadlineCalendar = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const [mode, setMode] = useState<ViewMode>("month");
  const [monthOffset, setMonthOffset] = useState(0);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["admin-invoices-deadlines"],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("*, company(*)")
        .in("status", ["sent", "overdue"]);
      return (data ?? []) as (Invoice & { company?: { name: string | null } })[];
    },
  });

  const now = new Date();
  const anchor = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const anchorLabel = new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", {
    month: "long",
    year: "numeric",
  }).format(anchor);

  const upcoming = (invoices ?? [])
    .filter((i) => {
      const d = daysFromToday(i.due_date);
      return d !== null;
    })
    .sort((a, b) => daysFromToday(a.due_date)! - daysFromToday(b.due_date)!);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (mode === "week" ? 0 : 0));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const inMonth = upcoming.filter((i) => {
    const d = new Date(`${i.due_date}T00:00:00`);
    return d.getMonth() === anchor.getMonth() && d.getFullYear() === anchor.getFullYear();
  });
  const inWeek = upcoming.filter((i) => {
    const d = new Date(`${i.due_date}T00:00:00`);
    return d >= weekStart && d <= weekEnd;
  });
  const visible = mode === "month" ? inMonth : inWeek;

  const totalOverdue = (invoices ?? [])
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + i.total - i.amount_paid, 0);
  const dueSoon = upcoming.filter((i) => {
    const d = daysFromToday(i.due_date);
    return d !== null && d >= 0 && d <= 14;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("admin.consoleLabel")}
        title={t("admin.calendar.title")}
        subtitle={t("admin.calendar.subtitle")}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={mode === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("month")}
          >
            {t("admin.calendar.month")}
          </Button>
          <Button
            variant={mode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("week")}
          >
            {t("admin.calendar.week")}
          </Button>
        </div>
        {mode === "month" ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setMonthOffset((o) => o - 1)}>
              {t("common.back")}
            </Button>
            <span className="text-sm font-semibold text-foreground">{anchorLabel}</span>
            <Button variant="outline" size="sm" onClick={() => setMonthOffset((o) => o + 1)}>
              {t("common.next")}
            </Button>
          </div>
        ) : (
          <span className="text-sm font-semibold text-foreground">
            {formatDate(weekStart.toISOString(), lang)} – {formatDate(weekEnd.toISOString(), lang)}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("admin.calendar.dueSoon")}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{dueSoon.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("common.overdue")}</p>
            <p className="mt-2 text-2xl font-bold text-destructive">{money(totalOverdue, lang)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("admin.calendar.visibleCount")}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{visible.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            {mode === "month" ? anchorLabel : t("admin.calendar.week")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
              <CalendarDays className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                {t("admin.calendar.empty")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("admin.calendar.emptyDesc")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5">{t("common.dueDate")}</th>
                    <th className="px-3 py-2.5">{t("common.invoice")}</th>
                    <th className="px-3 py-2.5">{t("common.company")}</th>
                    <th className="px-3 py-2.5">{t("common.customer")}</th>
                    <th className="px-3 py-2.5 text-right">{t("common.amount")}</th>
                    <th className="px-3 py-2.5">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((inv) => {
                    const d = daysFromToday(inv.due_date);
                    return (
                      <tr key={inv.id} className="border-b border-border/40">
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "font-medium",
                              d !== null && d < 0
                                ? "text-destructive"
                                : d !== null && d <= 3
                                  ? "text-admin"
                                  : "text-foreground",
                            )}
                          >
                            {formatDate(inv.due_date, lang)}
                          </span>
                          {d !== null && d < 0 ? (
                            <span className="ml-1 text-xs text-destructive">({-d}d)</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-primary">{inv.number}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {inv.company?.name ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {t(INVOICE_TYPE_KEYS[inv.type] ?? inv.type)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold">
                          {money(inv.total - inv.amount_paid, lang)}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={inv.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDeadlineCalendar;
