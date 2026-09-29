import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Profile } from "@/types";

const AdminUsers = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return (data ?? []) as Profile[];
    },
  });

  const setRole = async (profile: Profile, role: Profile["role"]) => {
    await supabase.from("profiles").update({ role }).eq("id", profile.id);
    toast.success(t("admin.users.roleUpdated"));
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const remove = async (profile: Profile) => {
    await supabase.from("profiles").delete().eq("id", profile.id);
    toast.success(t("admin.users.deleted"));
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const columns: Column<Profile>[] = [
    {
      key: "user",
      header: t("common.member"),
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-admin/10 text-admin">{initials(row.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{row.full_name || "—"}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: t("common.role"),
      cell: (row) => (
        <Select value={row.role} onValueChange={(v) => void setRole(row, v as Profile["role"])}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="business">{t("auth.roleBusiness")}</SelectItem>
            <SelectItem value="customer">{t("auth.roleCustomer")}</SelectItem>
            <SelectItem value="admin">{t("auth.roleAdmin")}</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "company",
      header: t("common.company"),
      cell: (row) => <span className="text-muted-foreground">{row.company_id?.slice(0, 8) ?? "—"}</span>,
    },
    {
      key: "language",
      header: t("common.language"),
      cell: (row) => <span className="uppercase text-muted-foreground">{row.language}</span>,
    },
    {
      key: "created",
      header: t("common.date"),
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.created_at, lang)}</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <ConfirmDialog
          title={t("admin.users.deleteTitle")}
          description={row.email}
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
      <PageHeader title={t("admin.users.title")} subtitle={t("admin.users.subtitle")} />
      <DataTable
        keyField="id"
        columns={columns}
        data={users ?? []}
        loading={isLoading}
        empty={<EmptyState icon={Users} title={t("common.empty")} />}
      />
    </div>
  );
};

export default AdminUsers;
