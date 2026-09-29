import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  useCompany,
  useCustomers,
  useProjects,
} from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, nextDocumentNumber } from "@/lib/actions";
import { formatVatRate, grossFromNet, money } from "@/lib/format";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

const QuoteNew = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: company } = useCompany(companyId);
  const { data: customers } = useCustomers(companyId);
  const { data: projects } = useProjects(companyId);

  const [customerId, setCustomerId] = useState(searchParams.get("customer") ?? "");
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);
  const [depositPercent, setDepositPercent] = useState(20);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const netTotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const isSmallBusiness = company?.vat_status === "kleinunternehmer";
  const vatRate = isSmallBusiness ? null : (company?.default_vat_rate ?? 19);
  const { vat: vatAmount, gross: total } = grossFromNet(netTotal, vatRate);

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const createQuote = async (status: "draft" | "sent") => {
    if (!companyId) return;
    if (!customerId || !title.trim()) {
      toast.error(t("common.required"));
      return;
    }
    const cleanItems = items.filter((i) => i.description.trim());
    if (cleanItems.length === 0) {
      toast.error(t("app.quotes.noItems"));
      return;
    }
    setSaving(true);
    try {
      const number = await nextDocumentNumber("quotes", companyId);
      const { data, error } = await supabase
        .from("quotes")
        .insert({
          company_id: companyId,
          customer_id: customerId,
          project_id: projectId || null,
          number,
          title: title.trim(),
          status,
          issue_date: new Date().toISOString().slice(0, 10),
          valid_until: validUntil || null,
          deposit_percent: depositPercent,
          notes: notes.trim() || null,
          net_total: Math.round(netTotal * 100) / 100,
          vat_amount: vatAmount,
          vat_rate: vatRate,
          total,
          currency: "EUR",
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("quote_items").insert(
        cleanItems.map((item, i) => ({
          quote_id: data.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.quantity * item.unit_price,
          sort_order: i,
        })),
      );

      await logAudit({
        companyId,
        action: status === "sent" ? "quote.sent" : "quote.created",
        entity: "quotes",
        entityId: data.id,
        details: { number },
      });

      toast.success(status === "sent" ? t("app.quotes.sent") : t("app.quotes.created"));
      navigate(`/app/quotes/${data.id}`);
    } catch {
      toast.error(t("auth.genericError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.quotes.newTitle")}
        actions={
          <Button asChild variant="ghost">
            <Link to="/app/quotes">
              <ArrowLeft className="h-4 w-4" />
              {t("common.back")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("app.quotes.details")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("common.customer")} *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.project")}</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.none")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(projects ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("common.title")} *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Website Relaunch"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">{t("app.quotes.items")}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0 }])}
              >
                <Plus className="h-4 w-4" />
                {t("common.add")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_110px_36px] gap-2">
                  <Input
                    placeholder={t("common.description")}
                    value={item.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                    aria-label={t("common.quantity")}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={item.unit_price}
                    onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })}
                    aria-label={t("common.unitPrice")}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setItems(items.filter((_, j) => j !== i))}
                    aria-label={t("common.remove")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border/60 pt-4">
                <span className="font-medium text-foreground">{t("common.total")}</span>
                <div className="text-right">
                  {vatRate ? (
                    <p className="text-xs text-muted-foreground">
                      {t("mlink.net")} {money(Math.round(netTotal * 100) / 100, lang)} · {t("mlink.vat")}{" "}
                      {formatVatRate(vatRate)} {money(vatAmount, lang)}
                    </p>
                  ) : null}
                  <p className="text-xl font-bold text-primary">{money(total, lang)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("app.quotes.settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("app.quotes.depositPercent")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={depositPercent}
                  onChange={(e) => setDepositPercent(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  {t("app.quotes.depositHint", { amount: money((total * depositPercent) / 100, lang) })}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.validUntil")}</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.notes")}</Label>
                <Textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={() => void createQuote("sent")} disabled={saving}>
              {saving ? t("common.loading") : t("app.quotes.saveAndSend")}
            </Button>
            <Button variant="outline" onClick={() => void createQuote("draft")} disabled={saving}>
              {t("app.quotes.saveDraft")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteNew;
