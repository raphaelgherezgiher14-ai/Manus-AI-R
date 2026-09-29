import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Send,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { MagicLinkActions } from "@/components/shared/magic-link-actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { emailDocumentLink } from "@/hooks/use-magic-link";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, nextDocumentNumber } from "@/lib/actions";
import { addDaysISO, formatDate, formatVatRate, grossFromNet, money, todayISO } from "@/lib/format";
import type { Project, Quote, QuoteItem } from "@/types";

const QuoteDetail = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: quote } = useQuery({
    queryKey: ["quote", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("*, customer(*)")
        .eq("id", id!)
        .maybeSingle();
      return (data as Quote & { customer?: Quote["customer"] }) ?? null;
    },
    enabled: !!id,
  });

  const { data: items } = useQuery({
    queryKey: ["quote-items", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", id!)
        .order("sort_order");
      return (data ?? []) as QuoteItem[];
    },
    enabled: !!id,
  });

  const { data: project } = useQuery({
    queryKey: ["quote-project", quote?.project_id],
    queryFn: async () => {
      if (!quote?.project_id) return null;
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", quote.project_id)
        .maybeSingle();
      return (data as Project) ?? null;
    },
    enabled: !!quote?.project_id,
  });

  const setStatus = async (status: Quote["status"]) => {
    if (!quote) return;
    setBusy(true);
    try {
      await supabase.from("quotes").update({ status }).eq("id", quote.id);
      await logAudit({
        companyId,
        action: `quote.${status}`,
        entity: "quotes",
        entityId: quote.id,
        details: { number: quote.number },
      });
      if (status === "sent") {
        const res = await emailDocumentLink("quote", quote.id);
        toast.success(
          res.delivered ? t("link.emailSent") : t("link.emailSimulated"),
        );
      } else {
        toast.success(t("app.quotes.statusUpdated"));
      }
      await queryClient.invalidateQueries({ queryKey: ["quote", id] });
    } finally {
      setBusy(false);
    }
  };

  const createDepositInvoice = async () => {
    if (!quote || !companyId) return;
    setBusy(true);
    try {
      const number = await nextDocumentNumber("invoices", companyId);
      const dueDays = project?.deposit_due_days ?? 14;
      const depositNet =
        Math.round((quote.net_total * quote.deposit_percent) / 100 * 100) / 100;
      const { vat: depositVat, gross: depositGross } = grossFromNet(
        depositNet,
        quote.vat_rate,
      );
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          company_id: companyId,
          customer_id: quote.customer_id,
          project_id: quote.project_id,
          quote_id: quote.id,
          number,
          type: "deposit",
          status: "sent",
          issue_date: todayISO(),
          service_date: todayISO(),
          due_date: addDaysISO(todayISO(), dueDays),
          total: depositGross,
          net_total: depositNet,
          vat_amount: depositVat,
          vat_rate: quote.vat_rate,
          amount_paid: 0,
          currency: quote.currency,
          notes: `${t("app.quotes.depositNotes")} ${quote.number}`,
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("invoice_items").insert({
        invoice_id: data.id,
        description: `${t("invoice.type.deposit")} (${quote.deposit_percent}%) — ${quote.title}`,
        quantity: 1,
        unit_price: depositNet,
        amount: depositNet,
        sort_order: 1,
      });
      await logAudit({
        companyId,
        action: "invoice.created",
        entity: "invoices",
        entityId: data.id,
        details: { number, type: "deposit" },
      });
      toast.success(t("app.quotes.depositCreated"));
      await queryClient.invalidateQueries({ queryKey: ["quote", id] });
    } catch {
      toast.error(t("auth.genericError"));
    } finally {
      setBusy(false);
    }
  };

  if (!quote) {
    return <PageHeader title={t("common.loading")} />;
  }

  const depositTotal = (quote.total * quote.deposit_percent) / 100;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${quote.number} — ${quote.title}`}
        subtitle={`${t("common.customer")}: ${quote.customer?.name}`}
        actions={
          <Button asChild variant="ghost">
            <Link to="/app/quotes">
              <ArrowLeft className="h-4 w-4" />
              {t("common.back")}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={quote.status} />
        <span className="text-sm text-muted-foreground">
          {t("common.issueDate")}: {formatDate(quote.issue_date, lang)} ·{" "}
          {t("common.validUntil")}: {formatDate(quote.valid_until, lang)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
        <span className="text-sm font-medium text-foreground">
          {t("link.title")}
        </span>
        <MagicLinkActions
          type="quote"
          id={quote.id}
          onEmailSent={() => void queryClient.invalidateQueries({ queryKey: ["quote", id] })}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("app.quotes.items")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
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
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">
                    {t("common.total")}
                  </TableCell>
                  <TableCell className="text-right text-lg font-bold">
                    {money(quote.total, lang)}
                  </TableCell>
                </TableRow>
                {quote.vat_rate ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-right text-xs text-muted-foreground"
                    >
                      {t("mlink.net")} {money(quote.net_total, lang)} · {t("mlink.vat")}{" "}
                      {formatVatRate(quote.vat_rate)} {money(quote.vat_amount, lang)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground" />
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("app.quotes.settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("app.quotes.depositPercent")}</span>
                <span className="font-semibold">{quote.deposit_percent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("invoice.type.deposit")}</span>
                <span className="font-semibold">{money(depositTotal, lang)}</span>
              </div>
              {quote.notes ? (
                <p className="rounded-md bg-muted/60 p-3 text-muted-foreground">{quote.notes}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("app.quotes.actions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quote.status === "draft" ? (
                <Button className="w-full" onClick={() => void setStatus("sent")} disabled={busy}>
                  <Send className="h-4 w-4" />
                  {t("app.quotes.send")}
                </Button>
              ) : null}
              {quote.status === "sent" ? (
                <>
                  <Button className="w-full" onClick={() => void setStatus("accepted")} disabled={busy}>
                    <CheckCircle2 className="h-4 w-4" />
                    {t("app.quotes.markAccepted")}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => void setStatus("declined")} disabled={busy}>
                    <XCircle className="h-4 w-4" />
                    {t("app.quotes.markDeclined")}
                  </Button>
                </>
              ) : null}
              {quote.status === "accepted" ? (
                <Button className="w-full" onClick={() => void createDepositInvoice()} disabled={busy}>
                  <Banknote className="h-4 w-4" />
                  {t("app.quotes.createDeposit")}
                </Button>
              ) : null}
              <Button asChild variant="outline" className="w-full">
                <Link to="/app/invoices">{t("app.quotes.viewInvoices")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetail;
