import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CreditCard,
  FileSignature,
  Loader2,
  QrCode,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { GiroCodeQr } from "@/components/shared/girocode-qr";
import { Brand } from "@/components/shared/brand";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  buildGiroCode,
  formatDate,
  formatVatRate,
  money,
} from "@/lib/format";
import { INVOICE_TYPE_KEYS } from "@/lib/status";
import type { PublicDocument, PublicVat } from "@/types";

function TotalsBlock({ vat }: { vat: PublicVat | undefined }) {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  if (!vat) return null;
  const is19 = vat.vat_status === "kleinunternehmer";
  return (
    <div className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("mlink.net")}</span>
        <span>{money(vat.net_total, lang)}</span>
      </div>
      {!is19 ? (
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {t("mlink.vat")} ({formatVatRate(vat.vat_rate)})
          </span>
          <span>{money(vat.vat_amount, lang)}</span>
        </div>
      ) : null}
      <div className="flex justify-between border-t border-border/60 pt-1.5 text-base font-bold">
        <span>{t("mlink.gross")}</span>
        <span>{money(vat.gross_total, lang)}</span>
      </div>
      {is19 ? (
        <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          {t("mlink.vatNote19")}
        </p>
      ) : null}
    </div>
  );
}

function IssuerBlock({
  doc,
}: {
  doc: PublicDocument;
}) {
  const { t } = useTranslation();
  const company = doc.company;
  const is19 = company?.vat_status === "kleinunternehmer";
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("common.from")}
      </p>
      <p className="mt-1 font-bold text-foreground">{company?.name}</p>
      <p className="text-sm text-muted-foreground">
        {[company?.address, company?.city, company?.country]
          .filter(Boolean)
          .join(", ")}
      </p>
      {company?.vat_id || company?.tax_number ? (
        <p className="text-sm text-muted-foreground">
          {is19 && company.tax_number
            ? `${t("mlink.taxNumber")}: ${company.tax_number}`
            : company.vat_id
              ? `${t("mlink.vatId")}: ${company.vat_id}`
              : company.tax_number
                ? `${t("mlink.taxNumber")}: ${company.tax_number}`
                : null}
        </p>
      ) : null}
    </div>
  );
}

function CustomerBlock({ doc }: { doc: PublicDocument }) {
  const { t } = useTranslation();
  const c = doc.customer;
  return (
    <div className="text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("common.to")}
      </p>
      <p className="mt-1 font-bold text-foreground">{c?.name}</p>
      {c?.contact_name ? (
        <p className="text-muted-foreground">{c.contact_name}</p>
      ) : null}
      <p className="text-muted-foreground">{c?.address}</p>
      <p className="text-muted-foreground">
        {[c?.city, c?.country].filter(Boolean).join(", ")}
      </p>
    </div>
  );
}

const PublicDocumentPage = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { token } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [doc, setDoc] = useState<PublicDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardPending, setCardPending] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const { data } = await supabase.rpc("get_document_by_token", {
      p_token: token,
    });
    setDoc((data as PublicDocument | null) ?? null);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Return from Stripe Checkout: the success page may show immediately, but the
  // invoice is only marked paid by the webhook. Poll a few times to reflect it.
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId && token && doc && doc.document_type === "invoice") {
      if (doc.invoice?.status !== "paid") {
        setCardPending(true);
        let attempts = 0;
        const timer = window.setInterval(async () => {
          attempts += 1;
          await load();
          if (doc.invoice?.status === "paid" || attempts >= 5) {
            window.clearInterval(timer);
            setCardPending(false);
          }
        }, 2000);
        return () => window.clearInterval(timer);
      }
      searchParams.delete("session_id");
      searchParams.delete("pay");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, token, doc, load, setSearchParams]);

  const payWithCard = async () => {
    if (!token) return;
    setBusy(true);
    setCardError(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-invoice-checkout",
        {
          body: {
            token,
            baseUrl: window.location.origin,
          },
        },
      );
      if (error || !data?.url) {
        throw new Error(String(error ?? "no url"));
      }
      window.open(data.url);
    } catch {
      setCardError("mlink.cardError");
    } finally {
      setBusy(false);
    }
  };

  const reportSepaTransfer = async () => {
    if (!token) return;
    setBusy(true);
    await supabase.rpc("record_invoice_payment", {
      p_token: token,
      p_method: "sepa",
      p_reference: null,
      p_succeeded: false,
    });
    setReported(true);
    setBusy(false);
    await load();
  };

  const decideQuote = async (status: "accepted" | "declined") => {
    if (!token) return;
    setBusy(true);
    await supabase.rpc("decide_quote", { p_token: token, p_status: status });
    setBusy(false);
    await load();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <Brand className="mb-6" />
        <AlertTriangle className="h-10 w-10 text-warning-foreground" />
        <h1 className="mt-4 text-xl font-bold text-foreground">
          {t("mlink.invalidTitle")}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t("mlink.invalidDesc")}
        </p>
        <Button asChild className="mt-6">
          <Link to="/">{t("common.getStarted")}</Link>
        </Button>
      </div>
    );
  }

  const isQuote = doc.document_type === "quote";
  const quote = doc.quote;
  const invoice = doc.invoice;
  const company = doc.company;
  const payOptions = doc.pay_options;
  const balance = invoice ? Math.max(invoice.total - invoice.amount_paid, 0) : 0;
  const hasPendingPayment = (invoice?.status === "sent" || invoice?.status === "overdue") && (doc.payments ?? []).some((p) => p.status === "pending");

  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Payalarm">
            <Brand />
          </Link>
          {user ? (
            <Button asChild variant="outline" size="sm">
              <Link to={user ? "/app" : "/login"}>{t("common.open")}</Link>
            </Button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-4xl px-4 sm:px-6">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            {/* Document meta */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {isQuote ? t("mlink.quoteNumber") : t("mlink.invoiceNumber")}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                  {isQuote ? quote?.number : invoice?.number}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {!isQuote ? (
                    <StatusBadge status={invoice?.status ?? ""} />
                  ) : (
                    <StatusBadge status={quote?.status ?? ""} />
                  )}
                  {!isQuote ? (
                    <span className="text-sm text-muted-foreground">
                      {t(INVOICE_TYPE_KEYS[invoice?.type ?? ""] ?? "invoice.type.progress")}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {!isQuote ? (
                  <>
                    <p>
                      {t("common.issueDate")}: {formatDate(invoice?.issue_date, lang)}
                    </p>
                    <p>
                      {t("mlink.serviceDate")}: {formatDate(invoice?.service_date ?? invoice?.issue_date, lang)}
                    </p>
                    <p>
                      {t("common.dueDate")}: {formatDate(invoice?.due_date, lang)}
                    </p>
                  </>
                ) : (
                  <p>
                    {t("common.validUntil")}: {formatDate(quote?.valid_until, lang)}
                  </p>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Parties */}
            <div className="grid gap-6 sm:grid-cols-2">
              <IssuerBlock doc={doc} />
              <CustomerBlock doc={doc} />
            </div>

            {/* Items */}
            <div className="mt-8 overflow-x-auto">
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
                  {(isQuote ? quote?.items ?? [] : invoice?.items ?? []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{money(item.unit_price, lang)}</TableCell>
                      <TableCell className="text-right font-medium">{money(item.amount, lang)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Deposits on final invoice */}
            {!isQuote && invoice?.type === "final" && (doc.deposits ?? []).length > 0 ? (
              <div className="mt-6 rounded-lg border border-border/60 p-4">
                <p className="text-sm font-semibold text-foreground">
                  {t("mlink.deposits")}
                </p>
                <div className="mt-2 space-y-1.5 text-sm">
                  {(doc.deposits ?? []).map((dep) => (
                    <div key={dep.number} className="flex items-center justify-between text-muted-foreground">
                      <span>
                        {t("invoice.type.deposit")} {dep.number}
                      </span>
                      <span>
                        {money(dep.net_total, lang)} + {money(dep.vat_amount, lang)} {t("mlink.vat")}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-border/60 pt-1.5 font-semibold text-foreground">
                    <span>{t("mlink.depositsTotal")}</span>
                    <span>
                      {money(
                        (doc.deposits ?? []).reduce((s, d) => s + d.total, 0),
                        lang,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <TotalsBlock vat={doc.vat} />

            {/* Paid state */}
            {!isQuote && invoice?.status === "paid" ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-primary/10 p-4">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-primary">{t("mlink.paidTitle")}</p>
                  <p className="text-sm text-primary/80">{t("mlink.paidDesc")}</p>
                </div>
              </div>
            ) : null}

            {/* Pending SEPA report */}
            {!isQuote && hasPendingPayment ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-warning/15 p-4">
                <Banknote className="h-6 w-6 shrink-0 text-warning-foreground" />
                <p className="text-sm font-medium text-warning-foreground">
                  {t("mlink.reported")}
                </p>
              </div>
            ) : null}

            {/* Quote decisions */}
            {isQuote && quote?.status === "sent" ? (
              <div className="mt-8 rounded-xl border border-border/60 p-5">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSignature className="h-4 w-4" />
                  {t("mlink.depositNote")}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => void decideQuote("declined")}
                    disabled={busy}
                  >
                    {t("common.declined")}
                  </Button>
                  <Button onClick={() => void decideQuote("accepted")} disabled={busy}>
                    <CheckCircle2 className="h-4 w-4" />
                    {t("mlink.accept")}
                  </Button>
                </div>
              </div>
            ) : null}
            {isQuote && quote?.status === "accepted" ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-primary/10 p-4">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
                <p className="font-semibold text-primary">{t("mlink.quoteAccepted")}</p>
              </div>
            ) : null}
            {isQuote && quote?.status === "declined" ? (
              <div className="mt-6 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
                {t("mlink.quoteDeclined")}
              </div>
            ) : null}

            {/* Payment methods */}
            {!isQuote && invoice && invoice.status !== "paid" && balance > 0 ? (
              <div className="mt-8">
                <p className="text-sm font-semibold text-foreground">
                  {t("mlink.paymentMethods")}
                </p>
                <p className="mt-1 text-2xl font-bold text-primary">
                  {money(balance, lang)}
                </p>

                {reported || hasPendingPayment ? (
                  <div className="mt-4 rounded-xl bg-warning/15 p-4 text-sm font-medium text-warning-foreground">
                    {t("mlink.reported")}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {/* Card */}
                    <div className="flex flex-col rounded-xl border border-border/60 p-5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-admin/10 text-admin">
                        <CreditCard className="h-5 w-5" />
                      </span>
                      <p className="mt-3 font-semibold text-foreground">
                        {t("mlink.cardTitle")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("mlink.cardDesc")}
                      </p>
                      {payOptions?.card_enabled === false ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          {t("mlink.methodDisabled")}
                        </p>
                      ) : cardPending ? (
                        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-primary">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("mlink.cardPending")}
                        </p>
                      ) : cardError ? (
                        <div className="mt-3">
                          <p className="text-sm text-destructive">{t(cardError)}</p>
                          <Button
                            className="mt-3"
                            onClick={() => void payWithCard()}
                            disabled={busy}
                          >
                            {busy ? t("common.loading") : t("mlink.cardRetry")}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="mt-4"
                          onClick={() => void payWithCard()}
                          disabled={busy}
                        >
                          {busy ? t("common.loading") : t("mlink.cardButton")}
                        </Button>
                      )}
                    </div>

                    {/* SEPA */}
                    <div className="flex flex-col rounded-xl border border-border/60 p-5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <QrCode className="h-5 w-5" />
                      </span>
                      <p className="mt-3 font-semibold text-foreground">
                        {t("mlink.sepaTitle")}
                      </p>
                      {payOptions?.sepa_enabled !== false &&
                      payOptions?.iban ? (
                        <>
                          <div className="mt-3 flex justify-center">
                            <GiroCodeQr
                              value={buildGiroCode({
                                name: company?.name ?? "",
                                iban: payOptions.iban,
                                bic: payOptions.bic,
                                amount: balance,
                                reference: invoice.number,
                              })}
                            />
                          </div>
                          <p className="mt-2 text-center text-xs text-muted-foreground">
                            {t("mlink.scanHint")}
                          </p>
                          <div className="mt-4 space-y-1.5 rounded-lg bg-muted/50 p-3 text-sm">
                            <p className="flex justify-between gap-3">
                              <span className="text-muted-foreground">{t("mlink.iban")}</span>
                              <span className="font-medium text-foreground">{payOptions.iban}</span>
                            </p>
                            {payOptions.bic ? (
                              <p className="flex justify-between gap-3">
                                <span className="text-muted-foreground">{t("mlink.bic")}</span>
                                <span className="font-medium text-foreground">{payOptions.bic}</span>
                              </p>
                            ) : null}
                            {payOptions.bank_name ? (
                              <p className="flex justify-between gap-3">
                                <span className="text-muted-foreground">{t("mlink.bank")}</span>
                                <span className="font-medium text-foreground">{payOptions.bank_name}</span>
                              </p>
                            ) : null}
                            <p className="flex justify-between gap-3">
                              <span className="text-muted-foreground">{t("mlink.reference")}</span>
                              <span className="font-medium text-foreground">{invoice.number}</span>
                            </p>
                            <p className="flex justify-between gap-3">
                              <span className="text-muted-foreground">{t("common.amount")}</span>
                              <span className="font-semibold text-foreground">{money(balance, lang)}</span>
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => void reportSepaTransfer()}
                            disabled={busy}
                          >
                            <Banknote className="h-4 w-4" />
                            {t("mlink.transferButton")}
                          </Button>
                          <p className="mt-2 text-center text-xs text-muted-foreground">
                            {t("mlink.transferHint")}
                          </p>
                        </>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">
                          {t("mlink.methodDisabled")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {company?.name} · {t("common.appName")} · {t("mlink.securedBy")}
        </p>
      </main>
    </div>
  );
};

export default PublicDocumentPage;
