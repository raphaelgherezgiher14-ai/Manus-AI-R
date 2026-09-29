import { BellRing, Briefcase, CreditCard, KeyRound, Percent, ReceiptText, ShieldCheck, Unlock, UserRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Brand } from "@/components/shared/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import { resolveError } from "@/lib/errors";
import { cn } from "@/lib/utils";

type RoleChoice = "business" | "admin";

const Signup = () => {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const [role, setRole] = useState<RoleChoice>("business");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vatStatus, setVatStatus] = useState<"kleinunternehmer" | "regelbesteuert">("regelbesteuert");
  const [vatRate, setVatRate] = useState<7 | 19>(19);
  const [taxNumber, setTaxNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t("auth.passwordWeak"));
      return;
    }
    if (role === "admin") {
      const { data: valid } = await supabase.rpc("verify_admin_invite", {
        p_code: inviteCode.trim(),
      });
      if (!valid) {
        setError(t("auth.inviteInvalid"));
        return;
      }
    }
    setSubmitting(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        vatStatus,
        defaultVatRate: vatRate,
        taxNumber: taxNumber.trim(),
        role,
      });
      toast.success(t("auth.signUpSuccess"));
      // RedirectIfAuthed forwards a fresh signup to /welcome (see route-guards).
    } catch (err) {
      setError(resolveError(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left brand panel (45%) */}
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-[hsl(var(--sidebar-background))] p-10 text-white lg:flex">
        <div className="relative">
          <Link to="/" aria-label="Home" className="inline-block">
            <Brand light />
          </Link>
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
            {role === "admin" ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <Briefcase className="h-3.5 w-3.5" />
            )}
            {role === "admin" ? t("auth.roleAdmin") : t("auth.roleBusiness")}
          </span>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight">
            {role === "admin" ? t("auth.splitAdminTitle") : t("auth.splitTitle")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            {role === "admin" ? t("auth.splitAdminSubtitle") : t("auth.splitSubtitle")}
          </p>
          <ul className="mt-8 space-y-4 text-sm text-white/85">
            {(role === "admin"
              ? [
                  { icon: ShieldCheck, key: "auth.adminF1" },
                  { icon: KeyRound, key: "auth.adminF2" },
                  { icon: UserRound, key: "auth.adminF3" },
                ]
              : [
                  { icon: BellRing, key: "auth.bullet1" },
                  { icon: CreditCard, key: "auth.bullet2" },
                  { icon: Unlock, key: "auth.bullet3" },
                  { icon: ShieldCheck, key: "auth.bullet4" },
                ]
            ).map((b) => (
              <li key={b.key} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <b.icon className="h-4 w-4" />
                </span>
                <span className="pt-1.5">{t(b.key)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">{t("auth.splitFooter")}</p>
      </div>

      {/* Right form panel (55%) */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Home" className="lg:hidden">
            <Brand />
          </Link>
          <div className="flex w-full items-center justify-end gap-2 lg:w-auto">
            <LanguageSwitcher className="hidden min-w-[110px] sm:flex" />
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <Card className="shadow-card">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-foreground">
                  {t("auth.signUpTitle")}
                </CardTitle>
                <CardDescription>{t("auth.signUpSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Role picker */}
                <div className="mb-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("business")}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                      role === "business"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <Briefcase className="h-5 w-5" />
                    {t("auth.roleBusiness")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                      role === "admin"
                        ? "border-admin bg-admin/10 text-admin"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <ShieldCheck className="h-5 w-5" />
                    {t("auth.roleAdmin")}
                  </button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                    />
                  </div>

                  {role === "admin" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="inviteCode">
                        {t("auth.inviteCode")} <span className="text-muted-foreground">({t("common.required")})</span>
                      </Label>
                      <Input
                        id="inviteCode"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="PAYALARM-ADMIN-2026"
                        autoComplete="off"
                        required
                      />
                      <p className="text-xs text-muted-foreground">{t("auth.inviteHint")}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="companyName">{t("auth.companyName")}</Label>
                        <Input
                          id="companyName"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Acme GmbH"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>{t("auth.vatModel")}</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setVatStatus("regelbesteuert")}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                              vatStatus === "regelbesteuert"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:bg-accent",
                            )}
                          >
                            <Percent className="h-5 w-5" />
                            {t("auth.vatRegular")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setVatStatus("kleinunternehmer")}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                              vatStatus === "kleinunternehmer"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:bg-accent",
                            )}
                          >
                            <ReceiptText className="h-5 w-5" />
                            {t("auth.vatSmall")}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {vatStatus === "kleinunternehmer"
                            ? t("auth.vatSmallHint")
                            : t("auth.vatRegularHint")}
                        </p>
                      </div>

                      {vatStatus === "regelbesteuert" ? (
                        <div className="space-y-1.5">
                          <Label>{t("auth.vatRate")}</Label>
                          <Select
                            value={String(vatRate)}
                            onValueChange={(v) => setVatRate(Number(v) as 7 | 19)}
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
                        <Label htmlFor="taxNumber">
                          {t("auth.taxNumber")}{" "}
                          <span className="text-muted-foreground">({t("common.optional")})</span>
                        </Label>
                        <Input
                          id="taxNumber"
                          value={taxNumber}
                          onChange={(e) => setTaxNumber(e.target.value)}
                          placeholder="DE123456789"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t("common.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">{t("common.password")}</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  {error ? (
                    <p className="rounded-md border border-destructive bg-card px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={submitting}
                  >
                    {submitting ? t("common.loading") : t("auth.signUpButton")}
                  </Button>
                </form>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {t("auth.haveAccount")}{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-primary hover:underline"
                  >
                    {t("auth.signInLink")}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
