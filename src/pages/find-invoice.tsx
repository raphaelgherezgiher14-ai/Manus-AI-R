import { FileSearch, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { Brand } from "@/components/shared/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const FindInvoice = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim() || !email.trim()) return;
    setSubmitting(true);
    setNotFound(false);
    const { data, error } = await supabase.rpc("find_invoice_link", {
      p_number: number.trim(),
      p_email: email.trim(),
    });
    setSubmitting(false);
    if (!error && typeof data === "string" && data.length > 0) {
      navigate(`/i/${data}`);
    } else {
      setNotFound(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border/60 px-4 sm:px-6">
        <Link to="/" aria-label="Home">
          <Brand />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden min-w-[110px] sm:flex" />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileSearch className="h-6 w-6" />
              </span>
              <CardTitle className="text-2xl font-bold text-foreground">
                {t("find.title")}
              </CardTitle>
              <CardDescription>{t("find.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="number">{t("find.number")}</Label>
                  <Input
                    id="number"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="INV-2026-0001"
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("common.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </div>

                {notFound ? (
                  <p className="rounded-md border border-destructive bg-card px-3 py-2 text-sm text-destructive">
                    {t("find.notFound")}
                  </p>
                ) : null}

                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {submitting ? t("common.loading") : t("find.button")}
                </Button>
              </form>

              <p className="mt-5 text-center text-xs text-muted-foreground">
                {t("find.hint")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FindInvoice;
