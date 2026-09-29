import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Crown,
  Landmark,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { useAuth } from "@/hooks/use-auth";
import { useCompany, useSubscription } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

const PRODUCT_IDS: Record<string, string> = {
  professional: "prod_VDy3LegRaxuCZx",
  business: "prod_VDy3PSBc7LmHYf",
};

interface CompanyForm {
  name: string;
  industry: string;
  address: string;
  city: string;
  country: string;
  vat_id: string;
  vat_status: "kleinunternehmer" | "regelbesteuert";
  default_vat_rate: 7 | 19;
  tax_number: string;
  iban: string;
  bic: string;
  bank_name: string;
}

const emptyForm: CompanyForm = {
  name: "",
  industry: "",
  address: "",
  city: "",
  country: "DE",
  vat_id: "",
  vat_status: "regelbesteuert",
  default_vat_rate: 19,
  tax_number: "",
  iban: "",
  bic: "",
  bank_name: "",
};

const Settings = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: company } = useCompany(companyId);
  const { data: subscription } = useSubscription(companyId);
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        industry: company.industry ?? "",
        address: company.address ?? "",
        city: company.city ?? "",
        country: company.country ?? "DE",
        vat_id: company.vat_id ?? "",
        vat_status: company.vat_status,
        default_vat_rate: company.default_vat_rate,
        tax_number: company.tax_number ?? "",
        iban: company.iban ?? "",
        bic: company.bic ?? "",
        bank_name: company.bank_name ?? "",
      });
    }
  }, [company]);

  const save = async () => {
    if (!companyId || !form.name.trim()) return;
    setSaving(true);
    try {
      await supabase
        .from("companies")
        .update({
          name: form.name.trim(),
          industry: form.industry.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          country: form.country.trim() || null,
          vat_id: form.vat_id.trim() || null,
          vat_status: form.vat_status,
          default_vat_rate: form.default_vat_rate,
          tax_number: form.tax_number.trim() || null,
          iban: form.iban.trim() || null,
          bic: form.bic.trim() || null,
          bank_name: form.bank_name.trim() || null,
        })
        .eq("id", companyId);
      toast.success(t("app.settings.saved"));
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    } finally {
      setSaving(false);
    }
  };

  const upgrade = async (plan: "professional" | "business") => {
    setUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          productId: PRODUCT_IDS[plan],
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/cancel`,
          companyId,
          plan,
        },
      });
      if (error || !data?.url) {
        const now = new Date();
        await supabase.from("companies").update({ plan, status: "active" }).eq("id", companyId);
        await supabase.from("subscriptions").insert({
          company_id: companyId,
          plan,
          status: "active",
          trial_start: now.toISOString(),
          trial_end: now.toISOString(),
          period_start: now.toISOString(),
          period_end: new Date(now.getTime() + 30 * 86400000).toISOString(),
        });
        toast.success(t("landing.pricing.simulated"));
      } else {
        window.open(data.url);
      }
      await queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["subscription", companyId] });
    } catch {
      toast.error(t("landing.pricing.checkoutError"));
    } finally {
      setUpgrading(false);
    }
  };

  const planName =
    company?.plan === "business"
      ? t("landing.pricing.biz.name")
      : company?.plan === "professional"
        ? t("landing.pricing.pro.name")
        : t("landing.pricing.free.name");

  const renewalDate = subscription?.period_end ?? company?.trial_ends_at;

  const row = (label: string, value: string | null | undefined) => (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value || "—"}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.settings.companyTitle")}
        subtitle={t("app.settings.companySubtitle")}
        actions={
          <Button asChild variant="outline">
            <Link to="/app">{t("common.back")}</Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                {t("app.settings.company")}
              </CardTitle>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t("common.edit")}
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5" />
                  {t("common.cancel")}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("common.name")}</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("app.settings.industry")}</Label>
                    <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>{t("common.address")}</Label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("common.city")}</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("common.country")}</Label>
                    <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {row(t("common.name"), company?.name)}
                  {row(t("app.settings.industry"), company?.industry)}
                  {row(t("common.address"), company?.address)}
                  {row(
                    t("common.city"),
                    [company?.city, company?.country].filter(Boolean).join(", ") || null,
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="h-4 w-4" />
                {t("app.settings.tax")}
              </CardTitle>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t("common.edit")}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("auth.vatModel")}</Label>
                    <Select
                      value={form.vat_status}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          vat_status: v as "kleinunternehmer" | "regelbesteuert",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regelbesteuert">{t("auth.vatRegular")}</SelectItem>
                        <SelectItem value="kleinunternehmer">{t("auth.vatSmall")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.vat_status === "regelbesteuert" ? (
                    <div className="space-y-1.5">
                      <Label>{t("auth.vatRate")}</Label>
                      <Select
                        value={String(form.default_vat_rate)}
                        onValueChange={(v) =>
                          setForm({ ...form, default_vat_rate: Number(v) as 7 | 19 })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="19">19 %</SelectItem>
                          <SelectItem value="7">7 %</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    <Label>{t("mlink.taxNumber")}</Label>
                    <Input
                      value={form.tax_number}
                      onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                      placeholder="DE123456789"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("mlink.vatId")}</Label>
                    <Input
                      value={form.vat_id}
                      onChange={(e) => setForm({ ...form, vat_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("mlink.iban")}</Label>
                    <Input
                      value={form.iban}
                      onChange={(e) => setForm({ ...form, iban: e.target.value })}
                      placeholder="DE89 3704 0044 0532 0130 00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("mlink.bic")}</Label>
                    <Input
                      value={form.bic}
                      onChange={(e) => setForm({ ...form, bic: e.target.value })}
                      placeholder="COBADEFFXXX"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>{t("mlink.bank")}</Label>
                    <Input
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {row(
                    t("auth.vatModel"),
                    company?.vat_status === "kleinunternehmer"
                      ? t("auth.vatSmall")
                      : t("auth.vatRegular"),
                  )}
                  {row(t("mlink.taxNumber"), company?.tax_number)}
                  {row(t("mlink.vatId"), company?.vat_id)}
                  {row(t("mlink.iban"), company?.iban)}
                  {row(t("mlink.bic"), company?.bic)}
                  {row(t("mlink.bank"), company?.bank_name)}
                </div>
              )}

              {editing ? (
                <div className="mt-5 flex justify-end gap-2 border-t border-border/60 pt-4">
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={() => void save()} disabled={saving}>
                    <Save className="h-4 w-4" />
                    {saving ? t("common.loading") : t("common.save")}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Subscription */}
        <div className="space-y-5">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Crown className="h-4 w-4 text-primary" />
                {t("app.settings.plan")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-primary/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-foreground">{planName}</p>
                  <StatusBadge status={subscription?.status ?? company?.plan ?? "trial"} />
                </div>
                {renewalDate ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {subscription?.status === "active"
                      ? t("app.settings.renews", {
                          date: formatDate(renewalDate, lang),
                        })
                      : t("app.settings.trialEnds", {
                          date: formatDate(renewalDate, lang),
                        })}
                  </p>
                ) : null}
                <p className="mt-2 text-lg font-bold text-primary">
                  {company?.plan === "business"
                    ? "€79"
                    : company?.plan === "professional"
                      ? "€39"
                      : "€0"}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {t("landing.pricing.monthly")}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={company?.plan === "professional" || upgrading}
                  onClick={() => void upgrade("professional")}
                >
                  {t("landing.pricing.pro.name")} — €39
                </Button>
                <Button
                  className="w-full"
                  disabled={company?.plan === "business" || upgrading}
                  onClick={() => void upgrade("business")}
                >
                  {t("landing.pricing.biz.name")} — €79
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
