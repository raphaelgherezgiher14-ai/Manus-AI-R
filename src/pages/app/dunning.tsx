import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useDunningEvents, useDunningRules } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import type { DunningEvent, DunningRule } from "@/types";

const LEVEL_TONE = (level: number) =>
  level === 1
    ? "bg-warning/15 text-warning-foreground"
    : level === 2
      ? "bg-admin/10 text-admin"
      : "bg-destructive/10 text-destructive";

const Dunning = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: rules } = useDunningRules(companyId);
  const { data: events } = useDunningEvents(companyId);
  const queryClient = useQueryClient();

  const toggleRule = async (rule: DunningRule, enabled: boolean) => {
    await supabase.from("dunning_rules").update({ enabled }).eq("id", rule.id);
    await queryClient.invalidateQueries({ queryKey: ["dunning-rules"] });
  };

  const removeRule = async (rule: DunningRule) => {
    await supabase.from("dunning_rules").delete().eq("id", rule.id);
    toast.success(t("app.dunning.ruleDeleted"));
    await queryClient.invalidateQueries({ queryKey: ["dunning-rules"] });
  };

  const ruleColumns: Column<DunningRule>[] = [
    {
      key: "level",
      header: t("app.dunning.level"),
      cell: (row) => (
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${LEVEL_TONE(row.level)}`}>
          {row.level}
        </span>
      ),
    },
    {
      key: "name",
      header: t("common.name"),
      cell: (row) => <span className="font-semibold text-foreground">{row.name}</span>,
    },
    {
      key: "trigger",
      header: t("app.dunning.trigger"),
      cell: (row) => (
        <span className="text-muted-foreground">{t("app.dunning.afterDays", { days: row.trigger_days_overdue })}</span>
      ),
    },
    {
      key: "action",
      header: t("app.dunning.action"),
      cell: (row) => (
        <span className="capitalize text-muted-foreground">
          {t(ACTION_KEY[row.action] ?? "common.email")}
        </span>
      ),
    },
    {
      key: "enabled",
      header: t("common.status"),
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Switch checked={row.enabled} onCheckedChange={(v) => void toggleRule(row, v)} />
          <StatusBadge status={row.enabled ? "enabled" : "disabled"} />
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <Button variant="ghost" size="icon" aria-label={t("common.delete")} onClick={() => void removeRule(row)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const eventColumns: Column<DunningEvent>[] = [
    {
      key: "invoice",
      header: t("common.invoice"),
      cell: (row) => <span className="font-semibold text-primary">{row.invoice?.number ?? "—"}</span>,
    },
    {
      key: "level",
      header: t("app.dunning.level"),
      cell: (row) => (
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${LEVEL_TONE(row.level)}`}>
          {row.level}
        </span>
      ),
    },
    {
      key: "action",
      header: t("app.dunning.action"),
      cell: (row) => <span className="text-foreground/80">{row.action_taken}</span>,
    },
    {
      key: "date",
      header: t("common.date"),
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.created_at, lang)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.dunning.title")}
        subtitle={t("app.dunning.subtitle")}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("app.dunning.rules")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            keyField="id"
            columns={ruleColumns}
            data={(rules ?? []).slice().sort((a, b) => a.level - b.level)}
            empty={
              <EmptyState
                icon={ShieldAlert}
                title={t("common.empty")}
                description={t("app.dunning.noRules")}
              />
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("app.dunning.events")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            keyField="id"
            columns={eventColumns}
            data={events ?? []}
            empty={
              <EmptyState icon={ShieldAlert} title={t("common.empty")} description={t("app.dunning.noEvents")} />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};

const ACTION_KEY: Record<string, string> = {
  email_reminder: "app.dunning.actionReminder",
  escalation_notice: "app.dunning.actionEscalation",
  final_notice: "app.dunning.actionFinal",
};

export default Dunning;
