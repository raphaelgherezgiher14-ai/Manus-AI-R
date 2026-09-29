import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  FolderKanban,
  PlayCircle,
  PlusCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useCompany, usePhases } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, nextDocumentNumber } from "@/lib/actions";
import {
  addDaysISO,
  formatDate,
  grossFromNet,
  money,
  netFromGross,
  todayISO,
} from "@/lib/format";
import { INVOICE_TYPE_KEYS } from "@/lib/status";
import type { Invoice, Project, ProjectPhase } from "@/types";

const ProjectDetail = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: company } = useCompany(companyId);
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*, customer(*)")
        .eq("id", id!)
        .maybeSingle();
      return (data as Project & { customer?: Project["customer"] }) ?? null;
    },
    enabled: !!id,
  });

  const { data: phases } = usePhases(id);

  const { data: invoices } = useQuery({
    queryKey: ["project-invoices", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("project_id", id!)
        .order("created_at", { ascending: true });
      return (data ?? []) as Invoice[];
    },
    enabled: !!id,
  });

  const invoiced = (invoices ?? []).reduce((s, i) => s + i.total, 0);
  const remaining = project ? Math.max(project.total_value - invoiced, 0) : 0;
  const completedPercent =
    (phases ?? []).filter((p) => p.status === "completed").reduce((s, p) => s + p.percent_of_total, 0) +
    (project?.deposit_percent ?? 0);

  const setPhaseStatus = async (phase: ProjectPhase, status: ProjectPhase["status"]) => {
    if (!project || !companyId) return;
    const isSmall = company?.vat_status === "kleinunternehmer";
    const rate = isSmall ? null : (company?.default_vat_rate ?? 19);
    await supabase
      .from("project_phases")
      .update({ status })
      .eq("id", phase.id);

    if (status === "completed") {
      // Auto-issue a progress invoice for this phase if none exists yet.
      const exists = (invoices ?? []).some((i) => i.phase_id === phase.id);
      if (!exists) {
        const number = await nextDocumentNumber("invoices", companyId);
        const projectNet = netFromGross(project.total_value, rate).net;
        const phaseNet =
          Math.round((projectNet * phase.percent_of_total) / 100 * 100) / 100;
        const { vat: phaseVat, gross: phaseGross } = grossFromNet(phaseNet, rate);
        const { data: inv } = await supabase
          .from("invoices")
          .insert({
            company_id: companyId,
            customer_id: project.customer_id,
            project_id: project.id,
            phase_id: phase.id,
            number,
            type: "progress",
            status: "sent",
            issue_date: todayISO(),
            service_date: todayISO(),
            due_date: addDaysISO(todayISO(), project.deposit_due_days),
            total: phaseGross,
            net_total: phaseNet,
            vat_amount: phaseVat,
            vat_rate: rate,
            amount_paid: 0,
            currency: project.currency,
            notes: `${t("app.project.phaseInvoice")}: ${phase.name}`,
          })
          .select()
          .single();
        if (inv) {
          await supabase.from("invoice_items").insert({
            invoice_id: inv.id,
            description: `${phase.name} (${phase.percent_of_total}%)`,
            quantity: 1,
            unit_price: phaseNet,
            amount: phaseNet,
            sort_order: 1,
          });
        }
        await logAudit({
          companyId,
          action: "invoice.created",
          entity: "invoices",
          entityId: inv?.id,
          details: { number, type: "progress", phase: phase.name },
        });
        toast.success(t("app.project.progressInvoice"));
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["project-invoices", id] });
    await queryClient.invalidateQueries({ queryKey: ["phases", id] });
  };

  const completeProject = async () => {
    if (!project || !companyId) return;
    const isSmall = company?.vat_status === "kleinunternehmer";
    const rate = isSmall ? null : (company?.default_vat_rate ?? 19);
    const allDone = (phases ?? []).every((p) => p.status === "completed");
    if (!allDone) {
      toast.error(t("app.project.allPhasesRequired"));
      return;
    }
    if (remaining <= 0) {
      await supabase.from("projects").update({ status: "completed" }).eq("id", project.id);
      toast.success(t("app.project.completed"));
      await queryClient.invalidateQueries({ queryKey: ["project", id] });
      return;
    }
    const projectNet = netFromGross(project.total_value, rate).net;
    const invoicedNet = (invoices ?? []).reduce((s, i) => s + i.net_total, 0);
    const remainingNet = Math.max(
      Math.round((projectNet - invoicedNet) * 100) / 100,
      0,
    );
    const number = await nextDocumentNumber("invoices", companyId);
    const { vat: finalVat, gross: finalGross } = grossFromNet(remainingNet, rate);
    const { data: inv } = await supabase
      .from("invoices")
      .insert({
        company_id: companyId,
        customer_id: project.customer_id,
        project_id: project.id,
        number,
        type: "final",
        status: "sent",
        issue_date: todayISO(),
        service_date: todayISO(),
        due_date: addDaysISO(todayISO(), project.deposit_due_days),
        total: finalGross,
        net_total: remainingNet,
        vat_amount: finalVat,
        vat_rate: rate,
        amount_paid: 0,
        currency: project.currency,
        notes: t("app.project.finalInvoiceNotes"),
      })
      .select()
      .single();
    if (inv) {
      await supabase.from("invoice_items").insert({
        invoice_id: inv.id,
        description: t("invoice.type.final"),
        quantity: 1,
        unit_price: remainingNet,
        amount: remainingNet,
        sort_order: 1,
      });
    }
    await supabase.from("projects").update({ status: "completed" }).eq("id", project.id);
    await logAudit({
      companyId,
      action: "invoice.created",
      entity: "invoices",
      entityId: inv?.id,
      details: { number, type: "final" },
    });
    toast.success(t("app.project.finalCreated"));
    await queryClient.invalidateQueries({ queryKey: ["project", id] });
    await queryClient.invalidateQueries({ queryKey: ["project-invoices", id] });
  };

  if (!project) {
    return <PageHeader title={t("common.loading")} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        subtitle={`${project.customer?.name} · ${money(project.total_value, lang)}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link to="/app/projects">
                <ArrowLeft className="h-4 w-4" />
                {t("common.back")}
              </Link>
            </Button>
            {project.status !== "completed" ? (
              <Button onClick={() => void completeProject()}>
                <CheckCircle2 className="h-4 w-4" />
                {t("app.project.complete")}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={project.status} />
        <span className="text-sm text-muted-foreground">
          {formatDate(project.start_date, lang)} — {formatDate(project.end_date, lang)}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("app.dashboard.outstanding")}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{money(remaining, lang)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("app.project.invoiced")}</p>
            <p className="mt-1 text-2xl font-bold text-admin">{money(invoiced, lang)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t("app.project.depositDue")}</p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {project.deposit_percent}% · {project.deposit_due_days} {t("common.days")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">
            {t("app.projects.phases")}{" "}
            <span className="text-muted-foreground">({completedPercent.toFixed(0)}%)</span>
          </CardTitle>
          <Progress value={Math.min(completedPercent, 100)} className="w-40" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("app.project.phaseName")}</TableHead>
                <TableHead className="text-right">{t("app.project.percent")}</TableHead>
                <TableHead>{t("app.project.period")}</TableHead>
                <TableHead className="w-44">{t("common.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(phases ?? []).map((phase) => (
                <TableRow key={phase.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">{phase.name}</p>
                    {phase.description ? (
                      <p className="text-xs text-muted-foreground">{phase.description}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {phase.percent_of_total}%
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(phase.planned_start, lang)} — {formatDate(phase.planned_end, lang)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={phase.status}
                      onValueChange={(v) =>
                        void setPhaseStatus(phase, v as ProjectPhase["status"])
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          <span className="flex items-center gap-2">
                            <PlayCircle className="h-3.5 w-3.5" />
                            {t("common.pending")}
                          </span>
                        </SelectItem>
                        <SelectItem value="in_progress">{t("common.inProgress")}</SelectItem>
                        <SelectItem value="completed">{t("common.completed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {(phases ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {t("common.noData")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">{t("common.invoices")}</CardTitle>
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link to="/app/invoices">
              <PlusCircle className="h-4 w-4" />
              {t("common.viewAll")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.number")}</TableHead>
                <TableHead>{t("common.invoice")}</TableHead>
                <TableHead className="text-right">{t("common.amount")}</TableHead>
                <TableHead>{t("common.dueDate")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoices ?? []).map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link to={`/app/invoices/${inv.id}`} className="font-semibold text-primary hover:underline">
                      {inv.number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t(INVOICE_TYPE_KEYS[inv.type] ?? inv.type)}
                  </TableCell>
                  <TableCell className="text-right font-medium">{money(inv.total, lang)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(inv.due_date, lang)}</TableCell>
                  <TableCell>
                    <StatusBadge status={inv.status} />
                  </TableCell>
                </TableRow>
              ))}
              {(invoices ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    <span className="flex items-center justify-center gap-2">
                      <FolderKanban className="h-4 w-4" />
                      {t("common.noData")}
                    </span>
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

export default ProjectDetail;
