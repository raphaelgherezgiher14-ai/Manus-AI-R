import { Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function BetaSection() {
  const { t } = useTranslation();
  return (
    <section className="border-t border-border/60 bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Rocket className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("landing.beta.title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
          {t("landing.beta.subtitle")}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/signup">{t("landing.beta.cta")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#pricing">{t("landing.nav.pricing")}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
