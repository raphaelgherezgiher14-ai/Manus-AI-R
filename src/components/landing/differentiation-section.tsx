import { ArrowRight, Scale, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function DifferentiationSection() {
  const { t } = useTranslation();

  const points = [
    t("landing.diff.p1"),
    t("landing.diff.p2"),
    t("landing.diff.p3"),
    t("landing.diff.p4"),
  ];

  return (
    <section className="border-t border-border/60 bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {t("landing.diff.title")}
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            {t("landing.diff.subtitle")}
          </p>
        </div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            {points.map((point, i) => (
              <div
                key={point}
                className="flex items-start gap-3.5 rounded-xl border border-border/60 bg-background p-4"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-foreground/85">
                  {point}
                </p>
              </div>
            ))}
            <div className="flex justify-start pt-2">
              <Button asChild variant="outline">
                <Link to="/signup">
                  {t("common.tryFree")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Scale className="h-4 w-4 text-muted-foreground" />
              {t("landing.diff.tableTitle")}
            </p>
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-[1.4fr_1fr] gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{t("landing.diff.them")}</span>
                <span className="text-primary">{t("common.appName")}</span>
              </div>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1.4fr_1fr] gap-3 rounded-lg border border-border/50 px-3 py-2.5 text-sm"
                >
                  <span className="text-muted-foreground">
                    {t(`landing.diff.row${i + 1}`)}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Wrench className="h-3.5 w-3.5 text-primary" />
                    {t("landing.diff.focus")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
