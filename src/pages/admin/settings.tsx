import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Mail,
  Plus,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Setting } from "@/types";

const AdminSettings = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [supportMail, setSupportMail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [notifyPayment, setNotifyPayment] = useState(true);
  const [notifySignup, setNotifySignup] = useState(true);
  const [dangerCompany, setDangerCompany] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .is("company_id", null)
        .order("key");
      return (data ?? []) as Setting[];
    },
  });

  const getSetting = (k: string): string => {
    const s = (settings ?? []).find((x) => x.key === k);
    if (!s) return "";
    return typeof s.value === "string" ? s.value : JSON.stringify(s.value);
  };

  const upsert = async (k: string, v: string) => {
    const parsed = (() => {
      try {
        return JSON.parse(v || "{}");
      } catch {
        return v;
      }
    })();
    const existing = (settings ?? []).find((x) => x.key === k);
    if (existing) {
      await supabase.from("settings").update({ value: parsed }).eq("id", existing.id);
    } else {
      await supabase.from("settings").insert({ company_id: null, key: k, value: parsed });
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
  };

  const savePlatform = async () => {
    if (supportMail) await upsert("support_email", supportMail);
    if (logoUrl) await upsert("logo_url", logoUrl);
    await upsert("notify_payment", String(notifyPayment));
    await upsert("notify_signup", String(notifySignup));
    toast.success(t("admin.settings.saved"));
  };

  const create = async () => {
    if (!key.trim()) return;
    await upsert(key.trim(), value || "{}");
    toast.success(t("admin.settings.saved"));
    setKey("");
    setValue("");
  };

  const remove = async (setting: Setting) => {
    await supabase.from("settings").delete().eq("id", setting.id);
    await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
  };

  const dangerousDelete = async () => {
    const company = (dangerCompany ?? "").trim();
    if (!company) {
      toast.error(t("admin.settings.enterCompanyName"));
      return;
    }
    const { data: match } = await supabase
      .from("companies")
      .select("id, name")
      .eq("name", company)
      .limit(1);
    if (!match || match.length === 0) {
      toast.error(t("admin.settings.companyNotFound"));
      return;
    }
    // Admin-only destructive action: suspend + cancel subscription.
    await supabase
      .from("companies")
      .update({ status: "suspended" })
      .eq("id", match[0].id);
    await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("company_id", match[0].id);
    toast.success(t("admin.settings.companySuspended"));
    setDangerCompany("");
    await queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("admin.consoleLabel")}
        title={t("admin.settings.title")}
        subtitle={t("admin.settings.subtitle")}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            {t("admin.settings.platform")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {t("admin.settings.supportMail")}
              </Label>
              <Input
                type="email"
                placeholder="support@payalarm.app"
                value={supportMail || getSetting("support_email")}
                onChange={(e) => setSupportMail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {t("admin.settings.logoUrl")}
              </Label>
              <Input
                placeholder="https://…"
                value={logoUrl || getSetting("logo_url")}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("admin.settings.notifyPayment")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("admin.settings.notifyPaymentDesc")}
                </p>
              </div>
              <Switch
                checked={notifyPayment}
                onCheckedChange={setNotifyPayment}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("admin.settings.notifySignup")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("admin.settings.notifySignupDesc")}
                </p>
              </div>
              <Switch
                checked={notifySignup}
                onCheckedChange={setNotifySignup}
              />
            </div>
            <Button onClick={() => void savePlatform()}>
              <Save className="h-4 w-4" />
              {t("common.save")}
            </Button>
          </div>

          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-sm font-medium text-foreground">
              {t("admin.settings.currency")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("admin.settings.currencyDesc")}
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-semibold text-foreground">
              EUR
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.settings.newSetting")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>{t("admin.settings.key")}</Label>
            <Input placeholder="platform.name" value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.settings.value")}</Label>
            <Input placeholder='{"maintenance": false}' value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <Button onClick={() => void create()}>
            <Plus className="h-4 w-4" />
            {t("common.create")}
          </Button>
        </CardContent>
        <CardContent className="mt-2 space-y-3">
          {(settings ?? []).map((setting) => (
            <div key={setting.id} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-medium text-foreground">{setting.key}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value)}
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label={t("common.delete")} onClick={() => void remove(setting)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(settings ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t("admin.settings.dangerZone")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("admin.settings.dangerZoneDesc")}
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label>{t("admin.settings.enterCompanyName")}</Label>
              <Input
                placeholder="Acme GmbH"
                value={dangerCompany}
                onChange={(e) => setDangerCompany(e.target.value)}
              />
            </div>
            <Button variant="destructive" onClick={() => void dangerousDelete()}>
              <Trash2 className="h-4 w-4" />
              {t("admin.settings.suspendCompany")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
