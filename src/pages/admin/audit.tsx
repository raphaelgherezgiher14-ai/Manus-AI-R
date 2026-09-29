import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import type { AuditLog } from "@/types";

const AdminAudit = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*, actor:profiles!actor_id(*)")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as (AuditLog & { actor?: { email: string; full_name: string } })[];
    },
  });

  const columns: Column<AuditLog & { actor?: { email: string; full_name: string } }>[] = [
    {
      key: "date",
      header: t("common.date"),
      cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.created_at, lang)}</span>,
    },
    {
      key: "actor",
      header: t("common.member"),
      cell: (r) => (
        <span className="font-medium text-foreground">
          {r.actor?.full_name || r.actor?.email || (r.actor_role ?? "system")}
        </span>
      ),
    },
    {
      key: "action",
      header: t("app.settings.company"),
      cell: (r) => <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">{r.action}</span>,
    },
    {
      key: "entity",
      header: t("common.entity"),
      cell: (r) => <span className="capitalize text-muted-foreground">{r.entity ?? "—"}</span>,
    },
    {
      key: "details",
      header: t("common.details"),
      cell: (r) => (
        <span className="max-w-[240px] truncate text-xs text-muted-foreground">
          {r.details ? JSON.stringify(r.details) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.audit.title")} subtitle={t("admin.audit.subtitle")} />
      <DataTable
        keyField="id"
        columns={columns}
        data={data ?? []}
        loading={isLoading}
        empty={<EmptyState icon={ScrollText} title={t("common.empty")} />}
      />
    </div>
  );
};

export default AdminAudit;
