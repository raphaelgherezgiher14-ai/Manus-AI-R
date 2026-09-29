import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useCompany } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatVatRate, money } from "@/lib/format";
import { INVOICE_TYPE_KEYS } from "@/lib/status";
import type { Invoice, InvoiceItem } from "@/types";

/**
 * Print-optimized invoice view. Opened from the invoice detail page so the
 * "Download" action produces a real document (print → save as PDF) instead of
 * printing the app shell.
 */
const InvoicePrint = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: company } = useCompany(companyId);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice-print", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("*, customer(*), project(*)")
        .eq("id", id!)
        .maybeSingle();
      return (data as Invoice) ?? null;
    },
    enabled: !!id,
  });

  const { data: items } = useQuery({
    queryKey: ["invoice-print-items", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", id!)
        .order("sort_order");
      return (data ?? []) as InvoiceItem[];
    },
    enabled: !!id,
  });

  // Open the browser print dialog once the document is ready.
  useEffect(() => {
    if (!invoice) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [invoice]);

  if (isLoading || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  const isSmallBusiness = company?.vat_status === "kleinunternehmer";
  const balance = invoice.total - invoice.amount_paid;

  return (
    <div className="min-h-screen bg-white text-foreground print:bg-white">
      {/* Toolbar — hidden when printing */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border/60 bg-white px-4 py-3 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/app/invoices/${invoice.id}`}>
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {t("common.print")}
        </Button>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("common.from")}
            </p>
            <p className="mt-1 font-bold text-foreground">{company?.name ?? ""}</p>
            <p className="text-sm text-muted-foreground">
              {[company?.address, company?.city, company?.country]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p className="text-sm text-muted-foreground">
              {isSmallBusiness && company?.tax_number
                ? `${t("mlink.taxNumber")}: ${company.tax_number}`
                : company?.vat_id
                  ? `${t("mlink.vatId")}: ${company.vat_id}`
                  : company?.tax_number
                    ? `${t("mlink.taxNumber")}: ${company.tax_number}`
                    : null}
            </p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("common.to")}
            </p>
            <p className="mt-1 font-bold text-foreground">{invoice.customer?.name}</p>
            {invoice.customer?.contact_name ? (
              <p className="text-muted-foreground">{invoice.customer.contact_name}</p>
            ) : null}
            <p className="text-muted-foreground">{invoice.customer?.address}</p>
            <p className="text-muted-foreground">
              {[invoice.customer?.city, invoice.customer?.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {t("common.invoice")} {invoice.number}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(INVOICE_TYPE_KEYS[invoice.type] ?? "invoice.type.progress")}
            </p>
          </div>
          <div className="text-sm text-muted-foreground sm:text-right">
            <p>
              {t("common.issueDate")}: {formatDate(invoice.issue_date, lang)}
            </p>
            <p>
              {t("mlink.serviceDate")}:{" "}
              {formatDate(invoice.service_date ?? invoice.issue_date, lang)}
            </p>
            <p>
              {t("common.dueDate")}: {formatDate(invoice.due_date, lang)}
            </p>
          </div>
        </div>

        <Table className="mt-8">
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.description")}</TableHead>
              <TableHead className="text-right">{t("common.quantity")}</TableHead>
              <TableHead className="text-right">{t("common.unitPrice")}</TableHead>
              <TableHead className="text-right">{t("common.amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(items ?? []).map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{money(item.unit_price, lang)}</TableCell>
                <TableCell className="text-right font-medium">{money(item.amount, lang)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("mlink.net")}</span>
            <span>{money(invoice.net_total, lang)}</span>
          </div>
          {!isSmallBusiness && invoice.vat_rate ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("mlink.vat")} ({formatVatRate(invoice.vat_rate)})
              </span>
              <span>{money(invoice.vat_amount, lang)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-border/60 pt-1.5 text-base font-bold">
            <span>{t("mlink.gross")}</span>
            <span>{money(invoice.total, lang)}</span>
          </div>
          {invoice.amount_paid > 0 ? (
            <>
              <div className="flex justify-between pt-2">
                <span className="text-muted-foreground">{t("common.paid")}</span>
                <span>-{money(invoice.amount_paid, lang)}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-1.5 font-bold">
                <span>{t("common.balance")}</span>
                <span>{money(balance, lang)}</span>
              </div>
            </>
          ) : null}
          {isSmallBusiness ? (
            <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {t("mlink.vatNote19")}
            </p>
          ) : null}
        </div>

        {invoice.notes ? (
          <p className="mt-6 rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
            {invoice.notes}
          </p>
        ) : null}

        {company?.iban ? (
          <div className="mt-8 border-t border-border/60 pt-4 text-sm text-muted-foreground">
            <p>
              {t("mlink.iban")}: {company.iban}
            </p>
            {company.bic ? (
              <p>
                {t("mlink.bic")}: {company.bic}
              </p>
            ) : null}
            {company.bank_name ? (
              <p>
                {t("mlink.bank")}: {company.bank_name}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default InvoicePrint;
