import { useQueryClient } from "@tanstack/react-query";
import { Download, FileText, FolderOpen, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/hooks/use-auth";
import { useCustomers, useDocuments } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/actions";
import { formatDate } from "@/lib/format";
import type { Doc } from "@/types";

const KIND_KEYS: Record<string, string> = {
  contract: "app.documents.contract",
  brief: "app.documents.brief",
  report: "app.documents.report",
  other: "app.documents.other",
};

const Documents = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: documents, isLoading } = useDocuments(companyId);
  const { data: customers } = useCustomers(companyId);
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("contract");
  const [customerId, setCustomerId] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const create = async () => {
    if (savingRef.current) return;
    setFormError(null);

    if (!companyId) {
      toast.error(t("app.documents.companyRequired"));
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(true);
      toast.error(t("app.documents.nameRequired"));
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const { error } = await supabase.from("documents").insert({
        company_id: companyId,
        customer_id: customerId || null,
        name: trimmedName,
        kind,
        url: url.trim() || null,
      });
      if (error) throw error;
    } catch (error) {
      const detail =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : String(error);
      const message = t("app.documents.createError");
      setFormError(detail ? `${message} ${detail}` : message);
      toast.error(message, { description: detail || undefined });
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    void logAudit({
      companyId,
      action: "document.created",
      entity: "documents",
      details: { name: trimmedName },
    }).catch(() => undefined);
    toast.success(t("app.documents.created"));
    setOpen(false);
    setName("");
    setKind("contract");
    setCustomerId("");
    setUrl("");
    setNameError(false);
    setFormError(null);
    void queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  const openCreateDialog = () => {
    setNameError(false);
    setFormError(null);
    setOpen(true);
  };

  const openDocument = (row: Doc) => {
    if (!row.url) return;
    window.open(row.url, "_blank", "noopener,noreferrer");
  };

  const columns: Column<Doc>[] = [
    {
      key: "name",
      header: t("common.name"),
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-admin/10 text-admin">
            <FileText className="h-4 w-4" />
          </span>
          <span className="font-medium text-foreground">{row.name}</span>
        </div>
      ),
    },
    {
      key: "kind",
      header: t("app.documents.kind"),
      cell: (row) => <span className="capitalize text-muted-foreground">{t(KIND_KEYS[row.kind] ?? "app.documents.other")}</span>,
    },
    {
      key: "date",
      header: t("common.date"),
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.created_at, lang)}</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("app.documents.open")}
          title={row.url ? t("app.documents.open") : t("app.documents.noFile")}
          disabled={!row.url}
          onClick={() => openDocument(row)}
        >
          <Download className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.documents.title")}
        subtitle={t("app.documents.subtitle")}
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            {t("app.documents.add")}
          </Button>
        }
      />

      <DataTable
        keyField="id"
        columns={columns}
        data={documents ?? []}
        loading={isLoading}
        empty={
          <EmptyState
            icon={FolderOpen}
            title={t("common.empty")}
            description={t("app.documents.emptyDesc")}
            action={
              <Button onClick={openCreateDialog}>{t("app.documents.add")}</Button>
            }
          />
        }
      />

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && savingRef.current) return;
          setOpen(nextOpen);
          if (nextOpen) {
            setNameError(false);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("app.documents.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!companyId ? (
              <p role="alert" className="text-sm text-destructive">
                {t("app.documents.companyRequired")}
              </p>
            ) : null}
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label>{t("common.name")}</Label>
              <Input
                value={name}
                required
                aria-invalid={nameError}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value.trim()) setNameError(false);
                }}
              />
              {nameError ? (
                <p role="alert" className="text-xs text-destructive">
                  {t("app.documents.nameRequired")}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("app.documents.kind")}</Label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">{t("app.documents.contract")}</SelectItem>
                    <SelectItem value="brief">{t("app.documents.brief")}</SelectItem>
                    <SelectItem value="report">{t("app.documents.report")}</SelectItem>
                    <SelectItem value="other">{t("app.documents.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.customer")}</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.none")} />
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
            </div>
            <div className="space-y-1.5">
              <Label>
                {t("app.documents.url")}{" "}
                <span className="text-muted-foreground">({t("common.optional")})</span>
              </Label>
              <Input
                type="url"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t("app.documents.urlHint")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={saving} onClick={() => void create()}>
              {saving ? t("app.documents.saving") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
