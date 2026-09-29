import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug, Plus, Receipt, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Integration, PaymentMethod } from "@/types";

export const AdminPaymentMethods = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("card");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payment-methods"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_methods").select("*").order("created_at", { ascending: false });
      return (data ?? []) as PaymentMethod[];
    },
  });

  const create = async () => {
    if (!name.trim()) return;
    await supabase.from("payment_methods").insert({ company_id: null, name: name.trim(), kind, enabled: true });
    toast.success(t("admin.paymentMethods.created"));
    setOpen(false);
    setName("");
    await queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
  };

  const remove = async (pm: PaymentMethod) => {
    await supabase.from("payment_methods").delete().eq("id", pm.id);
    await queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
  };

  const columns: Column<PaymentMethod>[] = [
    { key: "name", header: t("common.name"), cell: (r) => <span className="font-medium text-foreground">{r.name}</span> },
    { key: "kind", header: t("common.method"), cell: (r) => <span className="capitalize text-muted-foreground">{r.kind}</span> },
    { key: "scope", header: t("admin.paymentMethods.scope"), cell: (r) => <span className="text-muted-foreground">{r.company_id ? "company" : "platform"}</span> },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <ConfirmDialog
          title={t("admin.paymentMethods.deleteTitle")}
          trigger={
            <Button variant="ghost" size="icon" aria-label={t("common.delete")}>
              <Trash2 className="h-4 w-4" />
            </Button>
          }
          onConfirm={() => remove(r)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.paymentMethods.title")}
        subtitle={t("admin.paymentMethods.subtitle")}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("admin.paymentMethods.new")}
          </Button>
        }
      />
      <DataTable
        keyField="id"
        columns={columns}
        data={data ?? []}
        loading={isLoading}
        empty={<EmptyState icon={Receipt} title={t("common.empty")} />}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("admin.paymentMethods.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("common.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.method")}</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">{t("common.card")}</SelectItem>
                  <SelectItem value="sepa">{t("common.sepa")}</SelectItem>
                  <SelectItem value="bank_transfer">{t("common.bankTransfer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void create()}>{t("common.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const AdminIntegrations = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-integrations"],
    queryFn: async () => {
      const { data } = await supabase.from("integrations").select("*").order("created_at", { ascending: false });
      return (data ?? []) as Integration[];
    },
  });

  const toggle = async (integration: Integration, enabled: boolean) => {
    await supabase.from("integrations").update({ enabled }).eq("id", integration.id);
    await queryClient.invalidateQueries({ queryKey: ["admin-integrations"] });
  };

  const columns: Column<Integration>[] = [
    { key: "name", header: t("common.name"), cell: (r) => <span className="font-medium text-foreground">{r.name}</span> },
    { key: "kind", header: t("app.settings.integrations"), cell: (r) => <span className="capitalize text-muted-foreground">{r.kind}</span> },
    { key: "scope", header: t("admin.paymentMethods.scope"), cell: (r) => <span className="text-muted-foreground">{r.company_id ? "company" : "platform"}</span> },
    {
      key: "enabled",
      header: t("common.enabled"),
      cell: (r) => <Switch checked={r.enabled} onCheckedChange={(v) => void toggle(r, v)} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.integrations.title")} subtitle={t("admin.integrations.subtitle")} />
      <DataTable
        keyField="id"
        columns={columns}
        data={data ?? []}
        loading={isLoading}
        empty={<EmptyState icon={Plug} title={t("common.empty")} />}
      />
    </div>
  );
};
