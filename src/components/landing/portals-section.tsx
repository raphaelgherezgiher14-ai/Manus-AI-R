import {
  ArrowRight,
  Briefcase,
  Check,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PortalsSection() {
  const { t } = useTranslation();

  const portals = [
    {
      icon: Briefcase,
      key: "business",
      title: t("landing.portals.business.title"),
      desc: t("landing.portals.business.desc"),
      features: [
        t("landing.portals.business.f1"),
        t("landing.portals.business.f2"),
        t("landing.portals.business.f3"),
        t("landing.portals.business.f4"),
      ],
      cta: t("landing.portals.business.cta"),
      href: "/signup",
      accent: "bg-primary",
      iconBg: "bg-primary/10 text-primary",
    },
    {
      icon: UserRound,
      key: "customer",
      title: t("landing.portals.customer.title"),
      desc: t("landing.portals.customer.desc"),
      features: [
        t("landing.portals.customer.f1"),
        t("landing.portals.customer.f2"),
        t("landing.portals.customer.f3"),
        t("landing.portals.customer.f4"),
      ],
      cta: t("landing.portals.customer.cta"),
      href: "/rechnung-finden",
      accent: "bg-admin",
      iconBg: "bg-admin/10 text-admin",
    },
    {
      icon: ShieldCheck,
      key: "admin",
      title: t("landing.portals.admin.title"),
      desc: t("landing.portals.admin.desc"),
      features: [
        t("landing.portals.admin.f1"),
        t("landing.portals.admin.f2"),
        t("landing.portals.admin.f3"),
        t("landing.portals.admin.f4"),
      ],
      cta: t("landing.portals.admin.cta"),
      href: "/login",
      accent: "bg-admin",
      iconBg: "bg-admin/10 text-admin",
    },
  ];

  return (
    <section id="portals" className="bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {t("landing.portals.title")}
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            {t("landing.portals.subtitle")}
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {portals.map((portal) => (
            <div
              key={portal.key}
              className="flex flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  portal.iconBg,
                )}
              >
                <portal.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-foreground">
                {portal.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {portal.desc}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {portal.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={cn(
                        "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-white",
                        portal.accent,
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6">
                <Link to={portal.href}>
                  {portal.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
