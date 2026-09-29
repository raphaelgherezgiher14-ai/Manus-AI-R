import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Brand } from "@/components/shared/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link to="/" aria-label="Payalarm home">
            <Brand />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden min-w-[110px] sm:flex" />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Card className="border-border/60">
          <CardContent className="p-6 sm:p-10">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <Separator className="my-5" />
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              {children}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

const placeholderNote = (text: string) => (
  <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-muted-foreground">
    {text}
  </div>
);

export function LegalImprint() {
  const { t } = useTranslation();
  return (
    <LegalShell title={t("legal.imprint.title")}>
      {placeholderNote(t("legal.placeholder"))}
      <div>
        <p className="font-semibold text-foreground">
          {t("legal.imprint.provider")}
        </p>
        <p>{t("legal.imprint.name")}</p>
        <p>{t("legal.imprint.address")}</p>
      </div>
      <div>
        <p className="font-semibold text-foreground">{t("legal.imprint.contact")}</p>
        <p>{t("legal.imprint.email")}</p>
        <p>{t("legal.imprint.phone")}</p>
      </div>
      <div>
        <p className="font-semibold text-foreground">
          {t("legal.imprint.responsible")}
        </p>
        <p>{t("legal.imprint.responsibleNote")}</p>
      </div>
      <div>
        <p className="font-semibold text-foreground">
          {t("legal.imprint.disclaimerTitle")}
        </p>
        <p>{t("legal.imprint.disclaimer")}</p>
      </div>
    </LegalShell>
  );
}

export function LegalPrivacy() {
  const { t } = useTranslation();
  return (
    <LegalShell title={t("legal.privacy.title")}>
      {placeholderNote(t("legal.placeholder"))}
      <p>{t("legal.privacy.intro")}</p>
      <div>
        <p className="font-semibold text-foreground">{t("legal.privacy.responsible")}</p>
        <p>{t("legal.privacy.responsibleDesc")}</p>
      </div>
      <div>
        <p className="font-semibold text-foreground">{t("legal.privacy.data")}</p>
        <p>{t("legal.privacy.dataDesc")}</p>
      </div>
      <div>
        <p className="font-semibold text-foreground">{t("legal.privacy.rights")}</p>
        <p>{t("legal.privacy.rightsDesc")}</p>
      </div>
    </LegalShell>
  );
}

export function LegalTerms() {
  const { t } = useTranslation();
  return (
    <LegalShell title={t("legal.terms.title")}>
      {placeholderNote(t("legal.placeholder"))}
      <div>
        <p className="font-semibold text-foreground">{t("legal.terms.scope")}</p>
        <p>{t("legal.terms.scopeDesc")}</p>
      </div>
      <div>
        <p className="font-semibold text-foreground">{t("legal.terms.trial")}</p>
        <p>{t("legal.terms.trialDesc")}</p>
      </div>
      <div>
        <p className="font-semibold text-foreground">{t("legal.terms.payment")}</p>
        <p>{t("legal.terms.paymentDesc")}</p>
      </div>
      <div>
        <p className="font-semibold text-foreground">{t("legal.terms.law")}</p>
        <p>{t("legal.terms.lawDesc")}</p>
      </div>
    </LegalShell>
  );
}
