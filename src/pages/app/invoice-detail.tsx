import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Download,
  Printer,
  Send,
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
import { emailDocumentLink } from "@/hooks/use-magic-link";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, applyPaymentToInvoice } from "@/lib/actions";
import { formatDate, formatVatRate, money } from "@/lib/format";
import { INVOICE_TYPE_KEYS } from "@/lib/status";
import type { Invoice, InvoiceItem, Payment } from "@/types";

const InvoiceDetail = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: company } = useCompany(companyId);
  const queryClient = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("card");
  const [busy, setBusy] = useState(false);

  const { data: invoice } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("*, customer(*), project(*)")
        .eq("id", id!)
        .maybeSingle();
      return (data as Invoice & { customer?: Invoice["customer"]; project?: Invoice["project"] }) ?? null;
    },
    enabled: !!id,
  });

  const { data: items } = useQuery({
    queryKey: ["invoice-items", id],
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

  const { data: payments } = useQuery({
    queryKey: ["invoice-payments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", id!)
        .order("created_at", { ascending: false });
      return (data ?? []) as Payment[];
    },
    enabled: !!id,
  });

  const { data: depositInvoices } = useQuery({
    queryKey: ["invoice-deposits", invoice?.quote_id],
    queryFn: async () => {
      if (!invoice?.quote_id) return [] as Invoice[];
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("quote_id", invoice.quote_id)
        .eq("type", "deposit")
        .eq("status", "paid");
      return (data ?? []) as Invoice[];
    },
    enabled: !!invoice?.quote_id,
  });

  const balance = invoice ? invoice.total - invoice.amount_paid : 0;
  const isSmallBusiness = company?.vat_status === "kleinunternehmer";

  const markSent = async () => {
    if (!invoice) return;
    await supabase.from("invoices").update({ status: "sent" }).eq("id", invoice.id);
    await logAudit({
      companyId,
      action: "invoice.sent",
      entity: "invoices",
      entityId: invoice.id,
      details: { number: invoice.number },
    });
    const res = await emailDocumentLink("invoice", invoice.id);
    toast.success(
      res.delivered ? t("link.emailSent") : t("link.emailSimulated"),
    );
    await queryClient.invalidateQueries({ queryKey: ["invoice", id] });
  };

  const confirmPayment = async (payment: Payment) => {
    if (!invoice) return;
    setBusy(true);
    try {
      await supabase
        .from("payments")
        .update({ status: "succeeded", paid_at: new Date().toISOString() })
        .eq("id", payment.id);
      await applyPaymentToInvoice(invoice.id, payment.amount);
      await logAudit({
        companyId,
        action: "payment.confirmed",
        entity: "payments",
        entityId: payment.id,
        details: { number: invoice.number, amount: payment.amount },
      });
      toast.success(t("app.payments.confirmed"));
      await queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      await queryClient.invalidateQueries({ queryKey: ["invoice-payments", id] });
    } finally {
      setBusy(false);
    }
  };

  const recordPayment = async () => {
    if (!invoice || !companyId) return;
    if (amount <= 0 || amount > balance) {
      toast.error(t("app.invoices.amountError"));
      return;
    }
    setBusy(true);
    try {
      const { data: pay, error } = await supabase
        .from("payments")
        .insert({
          company_id: companyId,
          customer_id: invoice.customer_id,
          invoice_id: invoice.id,
          amount,
          method,
          status: "succeeded",
          paid_at: new Date().toISOString(),
          reference: `manual_${Date.now()}`,
        })
        .select()
        .single();
      if (error) throw error;

      await applyPaymentToInvoice(invoice.id, amount);

      await logAudit({
        companyId,
        action: "payment.recorded",
        entity: "payments",
        entityId: pay.id,
        details: { number: invoice.number, amount },
      });

      setPayOpen(false);
      toast.success(t("app.invoices.paymentRecorded"));
      await queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      await queryClient.invalidateQueries({ queryKey: ["invoice-payments", id] });
    } catch {
      toast.error(t("auth.genericError"));
    } finally {
      setBusy(false);
    }
  };

  if (!invoice) {
    return <PageHeader title={t("common.loading")} />;
  }

  const depositTotal = (depositInvoices ?? []).reduce((s, d) => s + d.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.number}
        subtitle={`${invoice.customer?.name ?? ""} · ${t(INVOICE_TYPE_KEYS[invoice.type] ?? "invoice.type.progress")}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost">
              <Link to="/app/invoices">
                <ArrowLeft className="h-4 w-4" />
                {t("common.back")}
              </Link>
            </Button>
            {invoice.status === "draft" ? (
              <Button variant="outline" onClick={() => void markSent()}>
                <Send className="h-4 w-4" />
                {t("app.invoices.markSent")}
              </Button>
            ) : null}
            {(invoice.status === "sent" || invoice.status === "overdue") && balance > 0 ? (
              <Button onClick={() => setPayOpen(true)}>
                <Banknote className="h-4 w-4" />
                {t("app.invoices.recordPayment")}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {t("common.print")}
            </Button>
            <Button asChild variant="outline">
              <Link to={`/app/invoices/${invoice.id}/print`} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                {t("common.download")}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={invoice.status} />
        <span className="text-sm text-muted-foreground">
          {t("common.issueDate")}: {formatDate(invoice.issue_date, lang)} ·{" "}
          {t("mlink.serviceDate")}: {formatDate(invoice.service_date, lang)} ·{" "}
          {t("common.dueDate")}: {formatDate(invoice.due_date, lang)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
        <span className="text-sm font-medium text-foreground">
          {t("link.title")}
        </span>
        <MagicLinkActions
          type="invoice"
          id={invoice.id}
          onEmailSent={() => void queryClient.invalidateQueries({ queryKey: ["invoice", id] })}
        />
      </div>

      <Card>
        <CardContent className="p-6 print:p-0">
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
              <p className="text-sm text-muted-foreground">
                {t("common.invoice")}: {invoice.number}
              </p>
            </div>
            <div className="text-sm">
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
            {isSmallBusiness ? (
              <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                {t("mlink.vatNote19")}
              </p>
            ) : null}
            {invoice.type === "final" && depositTotal > 0 ? (
              <>
                <div className="flex justify-between pt-2">
                  <span className="text-muted-foreground">
                    {t("mlink.depositsTotal")}
                  </span>
                  <span>-{money(depositTotal, lang)}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-1.5 text-base font-bold">
                  <span>{t("common.balance")}</span>
                  <span>{money(balance, lang)}</span>
                </div>
              </>
            ) : null}
            {invoice.amount_paid > 0 && invoice.type !== "final" ? (
              <>
                <div className="flex justify-between pt-2">
                  <span className="text-muted-foreground">{t("common.paid")}</span>
                  <span>-{money(invoice.amount_paid, lang)}</span>
                </div>
                {balance > 0 ? (
                  <div className="flex justify-between border-t border-border/60 pt-1.5 font-bold">
                    <span>{t("common.balance")}</span>
                    <span>{money(balance, lang)}</span>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          {invoice.notes ? (
            <p className="mt-4 rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
              {invoice.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {payments && payments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("app.invoices.payments")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.method")}</TableHead>
                  <TableHead className="text-right">{t("common.amount")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{formatDate(p.paid_at, lang)}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {t(METHOD_KEY[p.method] ?? "common.card")}
                    </TableCell>
                    <TableCell className="text-right font-medium">{money(p.amount, lang)}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void confirmPayment(p)}
                          disabled={busy}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {t("app.payments.confirm")}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("app.invoices.recordPayment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("common.amount")}</Label>
              <Input
                type="number"
                min={0.01}
                max={balance}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                {t("common.balance")}: {money(balance, lang)}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.method")}</Label>
              <Select value={method} onValueChange={setMethod}>
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
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void recordPayment()} disabled={busy}>
              {busy ? t("common.loading") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const METHOD_KEY: Record<string, string> = {
  card: "common.card",
  sepa: "common.sepa",
  bank_transfer: "common.bankTransfer",
};

export default InvoiceDetail;
