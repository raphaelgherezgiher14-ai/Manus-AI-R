import {
  Banknote,
  BellRing,
  FileBarChart,
  FileSignature,
  Globe,
  Layers,
  LayoutDashboard,
  ShieldAlert,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

export function FeaturesSection() {
  const { t } = useTranslation();

  const features = [
    {
      icon: FileSignature,
      title: t("landing.features.f1.title"),
      desc: t("landing.features.f1.desc"),
    },
    {
      icon: Banknote,
      title: t("landing.features.f2.title"),
      desc: t("landing.features.f2.desc"),
    },
    {
      icon: Layers,
      title: t("landing.features.f3.title"),
      desc: t("landing.features.f3.desc"),
    },
    {
      icon: BellRing,
      title: t("landing.features.f4.title"),
      desc: t("landing.features.f4.desc"),
    },
    {
      icon: ShieldAlert,
      title: t("landing.features.f5.title"),
      desc: t("landing.features.f5.desc"),
    },
    {
      icon: LayoutDashboard,
      title: t("landing.features.f6.title"),
      desc: t("landing.features.f6.desc"),
    },
    {
      icon: FileBarChart,
      title: t("landing.features.f7.title"),
      desc: t("landing.features.f7.desc"),
    },
    {
      icon: Globe,
      title: t("landing.features.f8.title"),
      desc: t("landing.features.f8.desc"),
    },
  ];

  return (
    <section id="features" className="border-t border-border/60 bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {t("landing.features.title")}
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            {t("landing.features.subtitle")}
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={cn(
                "rounded-xl border border-border/60 bg-background p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
              )}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
