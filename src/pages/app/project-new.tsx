import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCustomers } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/actions";
import { money, todayISO } from "@/lib/format";

interface PhaseForm {
  name: string;
  percent: number;
  start: string;
  end: string;
}

const ProjectNew = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: customers } = useCustomers(companyId);

  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [totalValue, setTotalValue] = useState(0);
  const [depositPercent, setDepositPercent] = useState(20);
  const [depositDueDays, setDepositDueDays] = useState(14);
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [phases, setPhases] = useState<PhaseForm[]>([
    { name: "", percent: 50, start: todayISO(), end: "" },
    { name: "", percent: 50, start: "", end: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const updatePhase = (index: number, patch: Partial<PhaseForm>) => {
    setPhases((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  };

  const percentSum = phases.reduce((s, p) => s + (p.percent || 0), 0);

  const create = async () => {
    if (!companyId) return;
    if (!customerId || !name.trim() || totalValue <= 0) {
      toast.error(t("common.required"));
      return;
    }
    if (Math.abs(percentSum - 100) > 0.01) {
      toast.error(t("app.projects.percentError"));
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          company_id: companyId,
          customer_id: customerId,
          name: name.trim(),
          description: description.trim() || null,
          status: "active",
          total_value: totalValue,
          deposit_percent: depositPercent,
          deposit_due_days: depositDueDays,
          start_date: startDate || null,
          end_date: endDate || null,
          currency: "EUR",
        })
        .select()
        .single();
      if (error) throw error;

      const cleanPhases = phases.filter((p) => p.name.trim());
      if (cleanPhases.length > 0) {
        await supabase.from("project_phases").insert(
          cleanPhases.map((p, i) => ({
            project_id: data.id,
            name: p.name.trim(),
            description: null,
            percent_of_total: p.percent || 0,
            status: "pending",
            planned_start: p.start || null,
            planned_end: p.end || null,
            sort_order: i + 1,
          })),
        );
      }

      await logAudit({
        companyId,
        action: "project.created",
        entity: "projects",
        entityId: data.id,
        details: { name },
      });
      toast.success(t("app.projects.created"));
      navigate(`/app/projects/${data.id}`);
    } catch {
      toast.error(t("auth.genericError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.projects.newTitle")}
        actions={
          <Button asChild variant="ghost">
            <Link to="/app/projects">
              <ArrowLeft className="h-4 w-4" />
              {t("common.back")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("app.projects.details")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("common.customer")} *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.name")} *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("common.description")}</Label>
                <Textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("app.projects.phases")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {phases.map((phase, i) => (
                <div key={i} className="grid grid-cols-[1fr_90px_140px_36px] gap-2">
                  <Input
                    placeholder={t("app.projects.phaseName")}
                    value={phase.name}
                    onChange={(e) => updatePhase(i, { name: e.target.value })}
                  />
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={phase.percent}
                      onChange={(e) => updatePhase(i, { percent: Number(e.target.value) })}
                      aria-label={t("app.projects.percent")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <Input
                    type="date"
                    value={phase.start}
                    onChange={(e) => updatePhase(i, { start: e.target.value })}
                    aria-label={t("app.project.start")}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPhases(phases.filter((_, j) => j !== i))}
                    aria-label={t("common.remove")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPhases([...phases, { name: "", percent: 0, start: "", end: "" }])
                  }
                >
                  <Plus className="h-4 w-4" />
                  {t("common.add")}
                </Button>
                <span
                  className={
                    Math.abs(percentSum - 100) > 0.01
                      ? "text-sm font-semibold text-destructive"
                      : "text-sm font-semibold text-primary"
                  }
                >
                  {Math.round(percentSum)}% / 100%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("app.projects.billing")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("app.project.totalValue")} *</Label>
                <Input
                  type="number"
                  min={0}
                  value={totalValue || ""}
                  onChange={(e) => setTotalValue(Number(e.target.value))}
                />
                {totalValue > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("app.quotes.depositHint", {
                      amount: money((totalValue * depositPercent) / 100, lang),
                    })}
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("app.quotes.depositPercent")}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("app.project.depositDueDays")}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={depositDueDays}
                    onChange={(e) => setDepositDueDays(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("app.project.start")}</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("app.project.end")}</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button size="lg" className="w-full" onClick={() => void create()} disabled={saving}>
            {saving ? t("common.loading") : t("app.projects.create")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectNew;
