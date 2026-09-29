import { FolderKanban, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useProjects } from "@/hooks/use-company-data";
import { formatDate, money } from "@/lib/format";
import type { Project } from "@/types";

const Projects = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: projects, isLoading } = useProjects(companyId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = (projects ?? []).filter((p) => {
    const ql = p.name.toLowerCase() + " " + (p.customer?.name ?? "").toLowerCase();
    const matchSearch = ql.includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.status === filter;
    return matchSearch && matchFilter;
  });

  const columns: Column<Project>[] = [
    {
      key: "name",
      header: t("common.project"),
      cell: (row) => (
        <div>
          <Link to={`/app/projects/${row.id}`} className="font-semibold text-foreground hover:text-primary">
            {row.name}
          </Link>
          <p className="text-xs text-muted-foreground">{row.customer?.name}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "value",
      header: t("app.project.totalValue"),
      cell: (row) => <span className="font-semibold">{money(row.total_value, lang)}</span>,
    },
    {
      key: "deposit",
      header: t("invoice.type.deposit"),
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.deposit_percent}% ({money((row.total_value * row.deposit_percent) / 100, lang)})
        </span>
      ),
    },
    {
      key: "dates",
      header: t("app.project.period"),
      cell: (row) => (
        <span className="text-muted-foreground">
          {formatDate(row.start_date, lang)} — {formatDate(row.end_date, lang)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.projects.title")}
        subtitle={t("app.projects.subtitle")}
        actions={
          <Button asChild>
            <Link to="/app/projects/new">
              <Plus className="h-4 w-4" />
              {t("app.projects.new")}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="quote">{t("common.quote")}</SelectItem>
            <SelectItem value="active">{t("common.active")}</SelectItem>
            <SelectItem value="on_hold">{t("common.onHold")}</SelectItem>
            <SelectItem value="completed">{t("common.completed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        keyField="id"
        columns={columns}
        data={filtered}
        loading={isLoading}
        empty={
          <EmptyState
            icon={FolderKanban}
            title={t("common.empty")}
            description={t("app.projects.emptyDesc")}
            action={
              <Button asChild>
                <Link to="/app/projects/new">{t("app.projects.new")}</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
};

export default Projects;
