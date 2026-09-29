import { useQueryClient } from "@tanstack/react-query";
import { BellRing, PlayCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useReminderConfigs, useReminders } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/actions";
import { formatDate } from "@/lib/format";
import type { Reminder, ReminderConfig } from "@/types";

interface ConfigForm {
  name: string;
  enabled: boolean;
  days_before_due: number;
  frequency_days: number;
  max_reminders: number;
  subject_en: string;
  subject_de: string;
  body_en: string;
  body_de: string;
}

const emptyForm: ConfigForm = {
  name: "",
  enabled: true,
  days_before_due: 3,
  frequency_days: 7,
  max_reminders: 3,
  subject_en: "Invoice {{number}} is due soon",
  subject_de: "Rechnung {{number}} ist bald fällig",
  body_en: "Hi {{name}}, a friendly reminder that invoice {{number}} of {{amount}} is due on {{due_date}}.",
  body_de: "Hallo {{name}}, eine freundliche Erinnerung, dass Rechnung {{number}} über {{amount}} am {{due_date}} fällig ist.",
};

const Reminders = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: configs } = useReminderConfigs(companyId);
  const { data: reminders } = useReminders(companyId);
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ConfigForm>(emptyForm);
  const [running, setRunning] = useState(false);

  const saveConfig = async () => {
    if (!companyId || !form.name.trim()) return;
    await supabase.from("reminder_configs").insert({
      company_id: companyId,
      name: form.name.trim(),
      enabled: form.enabled,
      days_before_due: form.days_before_due,
      frequency_days: form.frequency_days,
      max_reminders: form.max_reminders,
      subject_en: form.subject_en || null,
      subject_de: form.subject_de || null,
      body_en: form.body_en || null,
      body_de: form.body_de || null,
    });
    toast.success(t("app.reminders.configCreated"));
    setDialogOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["reminder-configs"] });
  };

  const toggleConfig = async (config: ReminderConfig, enabled: boolean) => {
    await supabase
      .from("reminder_configs")
      .update({ enabled })
      .eq("id", config.id);
    await queryClient.invalidateQueries({ queryKey: ["reminder-configs"] });
  };

  const removeConfig = async (config: ReminderConfig) => {
    await supabase.from("reminder_configs").delete().eq("id", config.id);
    await queryClient.invalidateQueries({ queryKey: ["reminder-configs"] });
  };

  const runCycle = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-reminder-cycle", {
        body: {},
      });
      if (error) throw error;
      await logAudit({
        companyId,
        action: "automation.cycle_run",
        details: { result: data?.result },
      });
      toast.success(t("app.reminders.cycleComplete"));
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
    } catch {
      toast.error(t("app.reminders.cycleError"));
    } finally {
      setRunning(false);
    }
  };

  const configColumns: Column<ReminderConfig>[] = [
    {
      key: "name",
      header: t("common.name"),
      cell: (row) => <span className="font-semibold text-foreground">{row.name}</span>,
    },
    {
      key: "schedule",
      header: t("app.reminders.schedule"),
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.days_before_due}d {t("app.reminders.beforeDue")} · {t("app.reminders.every")}{" "}
          {row.frequency_days}d · max {row.max_reminders}
        </span>
      ),
    },
    {
      key: "enabled",
      header: t("common.status"),
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Switch checked={row.enabled} onCheckedChange={(v) => void toggleConfig(row, v)} />
          <StatusBadge status={row.enabled ? "enabled" : "disabled"} />
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("common.delete")}
          onClick={() => void removeConfig(row)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const reminderColumns: Column<Reminder>[] = [
    {
      key: "invoice",
      header: t("common.invoice"),
      cell: (row) => <span className="font-semibold text-primary">{row.invoice?.number ?? "—"}</span>,
    },
    {
      key: "seq",
      header: t("app.reminders.sequence"),
      cell: (row) => <span className="text-muted-foreground">#{row.sequence}</span>,
    },
    {
      key: "date",
      header: t("common.date"),
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.sent_at ?? row.scheduled_date, lang)}</span>,
    },
    {
      key: "delivery",
      header: t("app.reminders.delivery"),
      cell: (row) => (
        <span
          className={
            row.delivery === "email"
              ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
              : "rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-foreground"
          }
        >
          {row.delivery === "email" ? t("common.email") : t("app.reminders.simulated")}
        </span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.reminders.title")}
        subtitle={t("app.reminders.subtitle")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void runCycle()} disabled={running}>
              <PlayCircle className="h-4 w-4" />
              {running ? t("common.loading") : t("app.reminders.runCycle")}
            </Button>
            <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              {t("app.reminders.newConfig")}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("app.reminders.configs")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            keyField="id"
            columns={configColumns}
            data={configs ?? []}
            empty={
              <EmptyState
                icon={BellRing}
                title={t("common.empty")}
                description={t("app.reminders.emptyDesc")}
              />
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("app.reminders.history")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            keyField="id"
            columns={reminderColumns}
            data={reminders ?? []}
            empty={
              <EmptyState icon={BellRing} title={t("common.empty")} description={t("app.reminders.noHistory")} />
            }
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("app.reminders.newConfig")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("common.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t("app.reminders.beforeDue")} (d)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.days_before_due}
                  onChange={(e) => setForm({ ...form, days_before_due: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("app.reminders.frequency")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.frequency_days}
                  onChange={(e) => setForm({ ...form, frequency_days: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("app.reminders.max")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_reminders}
                  onChange={(e) => setForm({ ...form, max_reminders: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
              <Label>{t("common.enabled")}</Label>
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>Subject (EN)</Label>
              <Input value={form.subject_en} onChange={(e) => setForm({ ...form, subject_en: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Subject (DE)</Label>
              <Input value={form.subject_de} onChange={(e) => setForm({ ...form, subject_de: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Body (EN)</Label>
              <Textarea rows={3} value={form.body_en} onChange={(e) => setForm({ ...form, body_en: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Body (DE)</Label>
              <Textarea rows={3} value={form.body_de} onChange={(e) => setForm({ ...form, body_de: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void saveConfig()}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reminders;
