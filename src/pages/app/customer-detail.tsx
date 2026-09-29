import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  FileSignature,
  FileText,
  Mail,
  MapPin,
  Phone,
  Save,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCustomers } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, initials, money } from "@/lib/format";
import { INVOICE_TYPE_KEYS } from "@/lib/status";
import type { Invoice, Payment, Project, Quote } from "@/types";

const CustomerDetail = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data: customers } = useCustomers(companyId);
  const customer = customers?.find((c) => c.id === id);
  const queryClient = useQueryClient();
  const [note, setNote] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const saveNote = async () => {
    if (!id) return;
    setSavingNote(true);
    try {
      await supabase
        .from("customers")
        .update({ note: (note ?? "").trim() || null })
        .eq("id", id);
      toast.success(t("app.customer.noteSaved"));
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
    } finally {
      setSavingNote(false);
    }
  };

  const { data: projects } = useQuery({
    queryKey: ["customer-projects", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false });
      return (data ?? []) as Project[];
    },
    enabled: !!id,
  });

  const { data: quotes } = useQuery({
    queryKey: ["customer-quotes", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("*")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false });
      return (data ?? []) as Quote[];
    },
    enabled: !!id,
  });

  const { data: invoices } = useQuery({
    queryKey: ["customer-invoices", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false });
      return (data ?? []) as Invoice[];
    },
    enabled: !!id,
  });

  const { data: payments } = useQuery({
    queryKey: ["customer-payments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*, invoice(*)")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false });
      return (data ?? []) as Payment[];
    },
    enabled: !!id,
  });

  const projectColumns: Column<Project>[] = [
    {
      key: "name",
      header: t("common.project"),
      cell: (row) => (
        <Link to={`/app/projects/${row.id}`} className="font-semibold text-foreground hover:text-primary">
          {row.name}
        </Link>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "total",
      header: t("common.total"),
      cell: (row) => <span className="font-semibold">{money(row.total_value, lang)}</span>,
    },
    {
      key: "end",
      header: t("app.customer.endDate"),
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.end_date, lang)}</span>,
    },
  ];

  const quoteColumns: Column<Quote>[] = [
    {
      key: "number",
      header: t("common.number"),
      cell: (row) => (
        <Link to={`/app/quotes/${row.id}`} className="font-semibold text-primary hover:underline">
          {row.number}
        </Link>
      ),
    },
    {
      key: "title",
      header: t("common.title"),
      cell: (row) => <span className="text-foreground/80">{row.title}</span>,
    },
    {
      key: "total",
      header: t("common.total"),
      cell: (row) => <span className="font-semibold">{money(row.total, lang)}</span>,
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: "number",
      header: t("common.number"),
      cell: (row) => (
        <Link to={`/app/invoices/${row.id}`} className="font-semibold text-primary hover:underline">
          {row.number}
        </Link>
      ),
    },
    {
      key: "type",
      header: t("common.invoice"),
      cell: (row) => (
        <span className="text-muted-foreground">{t(INVOICE_TYPE_KEYS[row.type] ?? row.type)}</span>
      ),
    },
    {
      key: "amount",
      header: t("common.amount"),
      cell: (row) => <span className="font-semibold">{money(row.total - row.amount_paid, lang)}</span>,
    },
    {
      key: "due",
      header: t("common.dueDate"),
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.due_date, lang)}</span>,
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  if (!customer) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("app.customers.title")} />
        <EmptyState icon={UserRound} title={t("common.loading")} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        subtitle={t("app.customer.since", { date: formatDate(customer.created_at, lang) })}
        actions={
          <>
            <Button asChild>
              <Link to={`/app/quotes/new?customer=${customer.id}`}>
                <FileSignature className="h-4 w-4" />
                {t("app.customers.invoice")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/customers">{t("common.back")}</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                {initials(customer.name)}
              </span>
              <div>
                <p className="font-semibold text-foreground">{customer.name}</p>
                {customer.contact_name ? (
                  <p className="text-sm text-muted-foreground">{customer.contact_name}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-5 space-y-2.5 text-sm">
              {customer.email ? (
                <p className="flex items-center gap-2.5 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {customer.email}
                </p>
              ) : null}
              {customer.phone ? (
                <p className="flex items-center gap-2.5 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {customer.phone}
                </p>
              ) : null}
              {customer.address || customer.city ? (
                <p className="flex items-center gap-2.5 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {[customer.address, customer.city, customer.country].filter(Boolean).join(", ")}
                </p>
              ) : null}
              {customer.tax_id ? (
                <p className="flex items-center gap-2.5 text-muted-foreground">
                  <Building2 className="h-4 w-4" /> {t("common.taxId")}: {customer.tax_id}
                </p>
              ) : null}
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-4">
              <StatusBadge status={customer.status} />
              <span className="uppercase text-xs text-muted-foreground">{customer.language}</span>
            </div>
            {/* Note field */}
            <div className="mt-5 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{t("common.notes")}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void saveNote()}
                  disabled={savingNote}
                  aria-label={t("common.save")}
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea
                className="mt-2 min-h-[88px]"
                placeholder={t("app.customer.notePlaceholder")}
                value={note ?? customer.note ?? ""}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("app.customer.summary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/60 p-4">
                <p className="text-xs text-muted-foreground">{t("app.customer.totalValue")}</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {money((projects ?? []).reduce((s, p) => s + p.total_value, 0), lang)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/60 p-4">
                <p className="text-xs text-muted-foreground">{t("app.customer.outstanding")}</p>
                <p className="mt-1 text-xl font-bold text-destructive">
                  {money(
                    (invoices ?? [])
                      .filter((i) => i.status === "sent" || i.status === "overdue")
                      .reduce((s, i) => s + i.total - i.amount_paid, 0),
                    lang,
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-muted/60 p-4">
                <p className="text-xs text-muted-foreground">{t("app.customer.paidTotal")}</p>
                <p className="mt-1 text-xl font-bold text-primary">
                  {money((payments ?? []).reduce((s, p) => s + p.amount, 0), lang)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">
            <FileText className="h-4 w-4" />
            {t("common.projects")}
          </TabsTrigger>
          <TabsTrigger value="quotes">
            <FileSignature className="h-4 w-4" />
            {t("common.quotes")}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4" />
            {t("common.invoices")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="projects" className="mt-4">
          <DataTable
            keyField="id"
            columns={projectColumns}
            data={projects ?? []}
            empty={<EmptyState icon={FileText} title={t("common.empty")} />}
          />
        </TabsContent>
        <TabsContent value="quotes" className="mt-4">
          <DataTable
            keyField="id"
            columns={quoteColumns}
            data={quotes ?? []}
            empty={<EmptyState icon={FileSignature} title={t("common.empty")} />}
          />
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <DataTable
            keyField="id"
            columns={invoiceColumns}
            data={invoices ?? []}
            empty={<EmptyState icon={FileText} title={t("common.empty")} />}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerDetail;
