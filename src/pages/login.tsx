import { AlarmClock, BellRing, CreditCard, LogIn, ShieldCheck, Unlock } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import { resolveError } from "@/lib/errors";

const loginBullets = [
  { icon: BellRing, textKey: "auth.bullet1" },
  { icon: CreditCard, textKey: "auth.bullet2" },
  { icon: Unlock, textKey: "auth.bullet3" },
  { icon: ShieldCheck, textKey: "auth.bullet4" },
];

const Login = () => {
  const { t } = useTranslation();
  const { signIn, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      toast.success(t("auth.signInSuccess"));
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
            <AlarmClock className="h-3.5 w-3.5" />
            {t("landing.hero.badge")}
          </span>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight">
            {t("auth.splitTitle")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            {t("auth.splitSubtitle")}
          </p>
          <ul className="mt-8 space-y-4">
            {loginBullets.map((b) => (
              <li key={b.textKey} className="flex items-start gap-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <b.icon className="h-4 w-4" />
                </span>
                <span className="pt-1.5 text-white/85">{t(b.textKey)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          {t("auth.splitFooter")}
        </p>
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
                  {t("auth.signInTitle")}
                </CardTitle>
                <CardDescription>{t("auth.signInSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-4">
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
                      autoComplete="current-password"
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

                  <Button type="submit" className="w-full" size="lg" disabled={submitting || authLoading}>
                    <LogIn className="h-4 w-4" />
                    {submitting ? t("common.loading") : t("auth.signInButton")}
                  </Button>
                </form>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {t("auth.noAccount")}{" "}
                  <Link
                    to="/signup"
                    className="font-semibold text-primary hover:underline"
                  >
                    {t("auth.createAccount")}
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

export default Login;
