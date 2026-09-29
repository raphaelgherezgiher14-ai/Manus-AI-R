import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { RoleDef } from "@/types";

const AdminRoles = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState("");

  const { data: roles, isLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("roles").select("*").order("name");
      return (data ?? []) as RoleDef[];
    },
  });

  const create = async () => {
    if (!name.trim()) return;
    await supabase.from("roles").insert({
      company_id: null,
      name: name.trim(),
      description: description.trim() || null,
      is_system: false,
      permissions: permissions.split(",").map((p) => p.trim()).filter(Boolean),
    });
    toast.success(t("admin.roles.created"));
    setOpen(false);
    setName("");
    setDescription("");
    setPermissions("");
    await queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
  };

  const remove = async (role: RoleDef) => {
    await supabase.from("roles").delete().eq("id", role.id);
    toast.success(t("admin.roles.deleted"));
    await queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
  };

  const columns: Column<RoleDef>[] = [
    {
      key: "name",
      header: t("common.name"),
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.is_system ? (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">system</span>
          ) : null}
          <span className="font-medium text-foreground">{row.name}</span>
        </div>
      ),
    },
    {
      key: "description",
      header: t("common.description"),
      cell: (row) => <span className="text-muted-foreground">{row.description ?? "—"}</span>,
    },
    {
      key: "permissions",
      header: t("admin.roles.permissions"),
      cell: (row) => (
        <span className="max-w-[220px] truncate text-xs text-muted-foreground">
          {Array.isArray(row.permissions) ? row.permissions.join(", ") : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        row.is_system ? null : (
          <ConfirmDialog
            title={t("admin.roles.deleteTitle")}
            trigger={
              <Button variant="ghost" size="icon" aria-label={t("common.delete")}>
                <Trash2 className="h-4 w-4" />
              </Button>
            }
            onConfirm={() => remove(row)}
          />
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.roles.title")}
        subtitle={t("admin.roles.subtitle")}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("admin.roles.new")}
          </Button>
        }
      />

      <DataTable
        keyField="id"
        columns={columns}
        data={roles ?? []}
        loading={isLoading}
        empty={<EmptyState icon={KeyRound} title={t("common.empty")} />}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("admin.roles.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("common.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.description")}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.roles.permissions")}</Label>
              <Textarea
                rows={3}
                placeholder="customers, quotes, invoices"
                value={permissions}
                onChange={(e) => setPermissions(e.target.value)}
              />
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

export default AdminRoles;
