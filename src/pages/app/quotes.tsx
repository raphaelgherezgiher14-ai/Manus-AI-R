import { FileSignature, Link2, Plus } from "lucide-react";
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
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuotes } from "@/hooks/use-company-data";
import { copyMagicLink } from "@/hooks/use-magic-link";
import { formatDate, money } from "@/lib/format";
import type { Quote } from "@/types";

const Quotes = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: quotes, isLoading } = useQuotes(companyId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = (quotes ?? []).filter((q) => {
    const ql = q.number.toLowerCase() + " " + q.title.toLowerCase() + " " + (q.customer?.name ?? "").toLowerCase();
    const matchSearch = ql.includes(search.toLowerCase());
    const matchFilter = filter === "all" || q.status === filter;
    return matchSearch && matchFilter;
  });

  const columns: Column<Quote>[] = [
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
      cell: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.customer?.name}</p>
        </div>
      ),
    },
    {
      key: "total",
      header: t("common.total"),
      cell: (row) => <span className="font-semibold">{money(row.total, lang)}</span>,
    },
    {
      key: "valid",
      header: t("common.validUntil"),
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.valid_until, lang)}</span>,
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "link",
      header: "",
      cell: (row) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("link.copy")}
          onClick={(e) => {
            e.preventDefault();
            void copyMagicLink("quote", row.id);
          }}
        >
          <Link2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.quotes.title")}
        subtitle={t("app.quotes.subtitle")}
        actions={
          <Button asChild>
            <Link to="/app/quotes/new">
              <Plus className="h-4 w-4" />
              {t("app.quotes.new")}
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
            <SelectItem value="draft">{t("common.draft")}</SelectItem>
            <SelectItem value="sent">{t("common.sent")}</SelectItem>
            <SelectItem value="accepted">{t("common.accepted")}</SelectItem>
            <SelectItem value="declined">{t("common.declined")}</SelectItem>
            <SelectItem value="expired">{t("common.expired")}</SelectItem>
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
            icon={FileSignature}
            title={t("common.empty")}
            description={t("app.quotes.emptyDesc")}
            action={
              <Button asChild>
                <Link to="/app/quotes/new">{t("app.quotes.new")}</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
};

export default Quotes;
