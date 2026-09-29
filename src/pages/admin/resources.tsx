import { useQuery } from "@tanstack/react-query";
import { Building2, FileSignature, FileText, FolderKanban, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, money } from "@/lib/format";
import { INVOICE_TYPE_KEYS } from "@/lib/status";
import type { Customer, Invoice, Project, Quote } from "@/types";

export const AdminCustomers = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*, company(*)").order("created_at", { ascending: false });
      return (data ?? []) as (Customer & { company?: Company })[];
    },
  });

  const columns: Column<Customer & { company?: Company }>[] = [
    { key: "name", header: t("common.name"), cell: (r) => <span className="font-medium text-foreground">{r.name}</span> },
    { key: "company", header: t("common.company"), cell: (r) => <span className="text-muted-foreground">{r.company?.name ?? "—"}</span> },
    { key: "email", header: t("common.email"), cell: (r) => <span className="text-muted-foreground">{r.email ?? "—"}</span> },
    { key: "language", header: t("common.language"), cell: (r) => <span className="uppercase text-muted-foreground">{r.language}</span> },
    { key: "status", header: t("common.status"), cell: (r) => <StatusBadge status={r.status} /> },
    { key: "created", header: t("common.date"), cell: (r) => <span className="text-muted-foreground">{formatDate(r.created_at, lang)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.customers.title")} subtitle={t("admin.customers.subtitle")} />
      <DataTable keyField="id" columns={columns} data={data ?? []} loading={isLoading} empty={<EmptyState icon={Users} title={t("common.empty")} />} />
    </div>
  );
};

type Company = { name: string | null };

export const AdminProjects = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*, customer(*), company(*)").order("created_at", { ascending: false });
      return (data ?? []) as (Project & { company?: Company; customer?: { name: string } })[];
    },
  });

  const columns: Column<Project & { company?: Company; customer?: { name: string } }>[] = [
    { key: "name", header: t("common.project"), cell: (r) => <span className="font-medium text-foreground">{r.name}</span> },
    { key: "company", header: t("common.company"), cell: (r) => <span className="text-muted-foreground">{r.company?.name ?? "—"}</span> },
    { key: "customer", header: t("common.customer"), cell: (r) => <span className="text-muted-foreground">{r.customer?.name ?? "—"}</span> },
    { key: "value", header: t("app.project.totalValue"), cell: (r) => <span className="font-semibold">{money(r.total_value, lang)}</span> },
    { key: "status", header: t("common.status"), cell: (r) => <StatusBadge status={r.status} /> },
    { key: "created", header: t("common.date"), cell: (r) => <span className="text-muted-foreground">{formatDate(r.created_at, lang)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.projects.title")} subtitle={t("admin.projects.subtitle")} />
      <DataTable keyField="id" columns={columns} data={data ?? []} loading={isLoading} empty={<EmptyState icon={FolderKanban} title={t("common.empty")} />} />
    </div>
  );
};

export const AdminQuotes = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-quotes"],
    queryFn: async () => {
      const { data } = await supabase.from("quotes").select("*, company(*)").order("created_at", { ascending: false });
      return (data ?? []) as (Quote & { company?: Company })[];
    },
  });

  const columns: Column<Quote & { company?: Company }>[] = [
    { key: "number", header: t("common.number"), cell: (r) => <span className="font-semibold text-primary">{r.number}</span> },
    { key: "title", header: t("common.title"), cell: (r) => <span className="font-medium text-foreground">{r.title}</span> },
    { key: "company", header: t("common.company"), cell: (r) => <span className="text-muted-foreground">{r.company?.name ?? "—"}</span> },
    { key: "total", header: t("common.total"), cell: (r) => <span className="font-semibold">{money(r.total, lang)}</span> },
    { key: "status", header: t("common.status"), cell: (r) => <StatusBadge status={r.status} /> },
    { key: "created", header: t("common.date"), cell: (r) => <span className="text-muted-foreground">{formatDate(r.created_at, lang)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.quotes.title")} subtitle={t("admin.quotes.subtitle")} />
      <DataTable keyField="id" columns={columns} data={data ?? []} loading={isLoading} empty={<EmptyState icon={FileSignature} title={t("common.empty")} />} />
    </div>
  );
};

export const AdminInvoices = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*, company(*)").order("created_at", { ascending: false });
      return (data ?? []) as (Invoice & { company?: Company })[];
    },
  });

  const columns: Column<Invoice & { company?: Company }>[] = [
    { key: "number", header: t("common.number"), cell: (r) => <span className="font-semibold text-primary">{r.number}</span> },
    { key: "company", header: t("common.company"), cell: (r) => <span className="text-muted-foreground">{r.company?.name ?? "—"}</span> },
    { key: "type", header: t("common.invoice"), cell: (r) => <span className="text-muted-foreground">{t(INVOICE_TYPE_KEYS[r.type] ?? r.type)}</span> },
    { key: "total", header: t("common.total"), cell: (r) => <span className="font-semibold">{money(r.total, lang)}</span> },
    { key: "status", header: t("common.status"), cell: (r) => <StatusBadge status={r.status} /> },
    { key: "created", header: t("common.date"), cell: (r) => <span className="text-muted-foreground">{formatDate(r.created_at, lang)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.invoices.title")} subtitle={t("admin.invoices.subtitle")} />
      <DataTable keyField="id" columns={columns} data={data ?? []} loading={isLoading} empty={<EmptyState icon={FileText} title={t("common.empty")} />} />
    </div>
  );
};
