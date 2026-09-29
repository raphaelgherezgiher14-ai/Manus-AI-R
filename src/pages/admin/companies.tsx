import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import type { Company } from "@/types";

const AdminCompanies = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const queryClient = useQueryClient();

  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      return (data ?? []) as Company[];
    },
  });

  const setPlan = async (company: Company, plan: Company["plan"]) => {
    await supabase.from("companies").update({ plan }).eq("id", company.id);
    toast.success(t("admin.companies.updated"));
    await queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
  };

  const toggleStatus = async (company: Company) => {
    await supabase
      .from("companies")
      .update({ status: company.status === "active" ? "suspended" : "active" })
      .eq("id", company.id);
    await queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
  };

  const columns: Column<Company>[] = [
    {
      key: "name",
      header: t("common.company"),
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-admin/10 text-admin">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.city ?? row.country}</p>
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      header: t("common.plan"),
      cell: (row) => (
        <Select value={row.plan} onValueChange={(v) => void setPlan(row, v as Company["plan"])}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trial">{t("landing.pricing.free.name")}</SelectItem>
            <SelectItem value="professional">{t("landing.pricing.pro.name")}</SelectItem>
            <SelectItem value="business">{t("landing.pricing.biz.name")}</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "trial",
      header: t("common.trial"),
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.trial_ends_at, lang)}</span>,
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (row) => (
        <button onClick={() => void toggleStatus(row)} className="hover:opacity-80">
          <StatusBadge status={row.status} />
        </button>
      ),
    },
    {
      key: "created",
      header: t("common.date"),
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.created_at, lang)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.companies.title")} subtitle={t("admin.companies.subtitle")} />
      <DataTable
        keyField="id"
        columns={columns}
        data={companies ?? []}
        loading={isLoading}
        empty={<EmptyState icon={Building2} title={t("common.empty")} />}
      />
    </div>
  );
};

export default AdminCompanies;
