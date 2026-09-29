import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, Pencil, Plus, Search, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useCustomers, useInvoices } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/actions";
import { formatDate, money } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types";

interface CustomerFormState {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  tax_id: string;
  language: "en" | "de";
}

const emptyForm: CustomerFormState = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "DE",
  tax_id: "",
  language: "de",
};

const Customers = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: customers, isLoading } = useCustomers(companyId);
  const { data: invoices } = useInvoices(companyId);
  const queryClient = useQueryClient();

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);

  // Per-customer derived stats
  const stats = (customers ?? []).map((c) => {
    const cInvoices = (invoices ?? []).filter((i) => i.customer_id === c.id);
    const open = cInvoices.filter((i) => i.status === "sent" || i.status === "overdue");
    const openSum = open.reduce((s, i) => s + i.total - i.amount_paid, 0);
    const hasOverdue = cInvoices.some((i) => i.status === "overdue");
    const lastActivity = cInvoices.reduce<string | null>(
      (latest, i) =>
        !latest || i.created_at > latest ? i.created_at : latest,
      null,
    );
    return { customer: c, openSum, hasOverdue, lastActivity };
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setNameError(false);
    setSaveError(null);
    setDialogOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      contact_name: customer.contact_name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      country: customer.country ?? "DE",
      tax_id: customer.tax_id ?? "",
      language: customer.language,
    });
    setNameError(false);
    setSaveError(null);
    setDialogOpen(true);
  };

  const save = async () => {
    if (savingRef.current) return;
    setSaveError(null);

    if (!companyId) {
      toast.error(t("app.customers.companyRequired"));
      return;
    }

    const name = form.name.trim();
    if (!name) {
      setNameError(true);
      toast.error(t("app.customers.nameRequired"));
      return;
    }

    savingRef.current = true;
    setSaving(true);
    let customerId = editing?.id;
    try {
      if (editing) {
        const { error } = await supabase
          .from("customers")
          .update({
            name,
            contact_name: form.contact_name.trim() || null,
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            address: form.address.trim() || null,
            city: form.city.trim() || null,
            country: form.country.trim() || null,
            tax_id: form.tax_id.trim() || null,
            language: form.language,
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert({
            company_id: companyId,
            name,
            contact_name: form.contact_name.trim() || null,
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            address: form.address.trim() || null,
            city: form.city.trim() || null,
            country: form.country.trim() || null,
            tax_id: form.tax_id.trim() || null,
            language: form.language,
          })
          .select()
          .single();
        if (error) throw error;
        if (!data) throw new Error(t("app.customers.saveError"));
        customerId = data.id;
      }
    } catch (error) {
      const detail =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : String(error);
      const message = t("app.customers.saveError");
      setSaveError(detail ? `${message} ${detail}` : message);
      toast.error(message, { description: detail || undefined });
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    void logAudit({
      companyId,
      action: editing ? "customer.updated" : "customer.created",
      entity: "customers",
      entityId: customerId,
      details: { name },
    }).catch(() => undefined);
    toast.success(t(editing ? "app.customers.updated" : "app.customers.created"));
    setDialogOpen(false);
    setForm(emptyForm);
    setNameError(false);
    setSaveError(null);
    void queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const filtered = stats
    .filter((s) => {
      if (tab === "active") return s.customer.status === "active" && !s.hasOverdue;
      if (tab === "overdue") return s.hasOverdue;
      return true;
    })
    .filter((s) => {
      const q = search.toLowerCase();
      return (
        s.customer.name.toLowerCase().includes(q) ||
        (s.customer.email ?? "").toLowerCase().includes(q) ||
        (s.customer.contact_name ?? "").toLowerCase().includes(q)
      );
    });

  type StatRow = (typeof stats)[number] & { rowKey: string };
  const columns: Column<StatRow>[] = [
    {
      key: "name",
      header: t("common.name"),
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="h-4 w-4" />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                row.hasOverdue
                  ? "bg-destructive"
                  : row.customer.status === "active"
                    ? "bg-primary"
                    : "bg-muted-foreground/40",
              )}
            />
          </span>
          <div>
            <Link
              to={`/app/customers/${row.customer.id}`}
              className="font-semibold text-foreground hover:text-primary"
            >
              {row.customer.name}
            </Link>
            {row.customer.contact_name ? (
              <p className="text-xs text-muted-foreground">
                {row.customer.contact_name}
              </p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: t("common.email"),
      cell: (row) => (
        <span className="text-muted-foreground">{row.customer.email ?? "—"}</span>
      ),
    },
    {
      key: "open",
      header: t("common.balance"),
      cell: (row) => (
        <span className={cn("font-semibold", row.openSum > 0 ? "text-foreground" : "text-muted-foreground")}>
          {money(row.openSum, lang)}
        </span>
      ),
    },
    {
      key: "activity",
      header: t("app.customers.lastActivity"),
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.lastActivity ? formatDate(row.lastActivity, lang) : "—"}
        </span>
      ),
    },
    {
      key: "language",
      header: t("common.language"),
      cell: (row) => (
        <span className="uppercase text-muted-foreground">
          {row.customer.language}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/app/quotes/new?customer=${row.customer.id}`}>
              <FileSignature className="h-3.5 w-3.5" />
              {t("app.customers.invoice")}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEdit(row.customer)}
            aria-label={t("common.edit")}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.customers.title")}
        subtitle={t("app.customers.subtitle")}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("app.customers.new")}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
            <TabsTrigger value="active">{t("common.active")}</TabsTrigger>
            <TabsTrigger value="overdue">{t("common.overdue")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        keyField="rowKey"
        columns={columns}
        data={filtered.map((s) => ({ ...s, rowKey: s.customer.id }))}
        loading={isLoading}
        empty={
          <EmptyState
            icon={UserRound}
            title={t("common.empty")}
            description={
              tab === "overdue"
                ? t("app.customers.noOverdue")
                : t("app.customers.emptyDesc")
            }
            action={
              tab === "overdue" ? undefined : (
                <Button onClick={openCreate}>{t("app.customers.new")}</Button>
              )
            }
          />
        }
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && savingRef.current) return;
          setDialogOpen(nextOpen);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("app.customers.edit") : t("app.customers.new")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {!companyId ? (
              <p role="alert" className="text-sm text-destructive">
                {t("app.customers.companyRequired")}
              </p>
            ) : null}
            {saveError ? (
              <p role="alert" className="text-sm text-destructive">
                {saveError}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label>{t("common.name")}</Label>
              <Input
                value={form.name}
                aria-invalid={nameError}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (e.target.value.trim()) setNameError(false);
                }}
                required
              />
              {nameError ? (
                <p role="alert" className="text-xs text-destructive">
                  {t("app.customers.nameRequired")}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("app.customers.contact")}</Label>
                <Input
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.email")}</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("common.phone")}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.taxId")}</Label>
                <Input
                  value={form.tax_id}
                  onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("common.address")}</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.country")}</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("common.city")}</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.language")}</Label>
                <Select
                  value={form.language}
                  onValueChange={(v) => setForm({ ...form, language: v as "en" | "de" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
