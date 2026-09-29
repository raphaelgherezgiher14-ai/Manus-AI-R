import { motion } from "framer-motion";
import {
  AlarmClock,
  ArrowRight,
  BadgeCheck,
  BellRing,
  CheckCircle2,
  CreditCard,
  Euro,
  ReceiptText,
  Sparkles,
  Unlock,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ParticlesBackground } from "@/components/landing/particles-background";
import { Button } from "@/components/ui/button";

const stagger = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

export function LandingHero() {
  const { t } = useTranslation();

  const facts = [
    { icon: Sparkles, text: t("landing.hero.fact1") },
    { icon: CreditCard, text: t("landing.hero.fact2") },
    { icon: Unlock, text: t("landing.hero.fact3") },
    { icon: ReceiptText, text: t("landing.hero.fact4") },
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <ParticlesBackground />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)/0.5) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)/0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <motion.div variants={stagger} custom={0} initial="hidden" animate="show">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <AlarmClock className="h-3.5 w-3.5" />
                {t("landing.hero.badge")}
              </span>
            </motion.div>

            <motion.h1
              variants={stagger}
              custom={1}
              initial="hidden"
              animate="show"
              className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              {t("landing.hero.title1")}
              <span className="mt-1 block text-primary">
                {t("landing.hero.title2")}
              </span>
            </motion.h1>

            <motion.p
              variants={stagger}
              custom={2}
              initial="hidden"
              animate="show"
              className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              {t("landing.hero.subtitle")}
            </motion.p>

            <motion.div
              variants={stagger}
              custom={3}
              initial="hidden"
              animate="show"
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button asChild size="lg" className="h-12 px-7 text-base">
                <Link to="/signup">
                  {t("landing.hero.ctaStart")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
                <a href="#workflow">{t("landing.hero.ctaDemo")}</a>
              </Button>
            </motion.div>

            <motion.p
              variants={stagger}
              custom={4}
              initial="hidden"
              animate="show"
              className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"
            >
              <BadgeCheck className="h-4 w-4 text-primary" />
              {t("landing.hero.beta")}
            </motion.p>
          </div>

          {/* Product mock */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="relative"
          >
            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-[0_20px_60px_-20px_hsl(var(--sidebar-background)/0.35)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("landing.hero.mock.outstanding")}
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                    €28,250
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                  {t("landing.hero.mock.overdue")}: €16,125
                </span>
              </div>

              <div className="mt-5 space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      {i === 2 ? (
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <BellRing className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-admin/10 text-admin">
                          <Euro className="h-4 w-4" />
                        </span>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {i === 2
                            ? t("landing.hero.mock.invoiceOverdue")
                            : i === 1
                              ? "INV-2026-0079"
                              : "INV-2026-0008"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {i === 0
                            ? t("common.paid")
                            : i === 1
                              ? t("landing.hero.mock.invoiceDue")
                              : t("landing.hero.mock.automation")}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      {i === 2 ? "€16,125" : i === 1 ? "€12,125" : "€4,850"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <p className="text-[11px] font-medium text-primary">
                    {t("landing.hero.mock.paidThisMonth")}
                  </p>
                  <p className="mt-1 text-lg font-bold text-primary">€9,700</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {t("landing.hero.mock.nextReminder")}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-lg font-bold text-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    +2d
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -left-4 -top-4 hidden items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 shadow-md sm:flex">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {t("landing.workflow.panel.quoteStatus")} Q-2026-014
              </span>
            </div>
          </motion.div>
        </div>

        {/* Honest facts — no fabricated metrics */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-16 grid grid-cols-1 gap-3 border-t border-border/60 pt-8 sm:grid-cols-2 lg:grid-cols-4"
        >
          {facts.map((fact) => (
            <div
              key={fact.text}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <fact.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              </span>
              <span className="text-sm font-medium text-foreground">
                {fact.text}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
