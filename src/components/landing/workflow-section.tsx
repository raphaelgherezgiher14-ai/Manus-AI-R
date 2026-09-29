import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BellRing,
  FileText,
  Handshake,
  PartyPopper,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WorkflowSection() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);

  const steps = [
    {
      title: t("landing.workflow.step1.title"),
      desc: t("landing.workflow.step1.desc"),
      icon: Handshake,
    },
    {
      title: t("landing.workflow.step2.title"),
      desc: t("landing.workflow.step2.desc"),
      icon: Banknote,
    },
    {
      title: t("landing.workflow.step3.title"),
      desc: t("landing.workflow.step3.desc"),
      icon: FileText,
    },
    {
      title: t("landing.workflow.step4.title"),
      desc: t("landing.workflow.step4.desc"),
      icon: BellRing,
    },
    {
      title: t("landing.workflow.step5.title"),
      desc: t("landing.workflow.step5.desc"),
      icon: PartyPopper,
    },
  ];

  const panels = [
    // Step 1: quote accepted
    {
      header: t("landing.workflow.panel.quoteNumber"),
      status: t("landing.workflow.panel.quoteStatus"),
      statusTone: "bg-primary/10 text-primary",
      body: (
        <div className="space-y-2.5">
          {["Design & UX", "Development", "Launch & QA"].map((item, i) => (
            <div
              key={item}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3.5 py-2.5 text-sm"
            >
              <span className="text-muted-foreground">{item}</span>
              <span className="font-semibold text-foreground">
                {i === 0 ? "€4,850" : i === 1 ? "€14,550" : "€4,850"}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-background px-3.5 py-2.5 text-sm">
            <span className="font-medium text-foreground">Total</span>
            <span className="font-bold text-foreground">€24,250</span>
          </div>
        </div>
      ),
      footer: (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            20% {t("landing.portals.business.f1")}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <BadgeCheck className="h-4 w-4" />
            {t("landing.workflow.panel.quoteStatus")} — Q-2026-014
          </span>
        </div>
      ),
    },
    // Step 2: deposit collected
    {
      header: t("landing.workflow.panel.deposit"),
      status: t("landing.workflow.panel.depositStatus"),
      statusTone: "bg-primary/10 text-primary",
      body: (
        <div className="space-y-2.5">
          <div className="rounded-lg bg-background px-3.5 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                INV-2026-0001 · 20% deposit
              </span>
              <span className="text-sm font-bold text-foreground">
                {t("landing.workflow.panel.depositAmount")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-3.5 py-3">
            <Banknote className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">
                {t("landing.workflow.panel.depositStatus")} ·{" "}
                {t("common.pay")}ment
              </p>
              <p className="text-xs text-primary/70">•••• 4242 · Visa</p>
            </div>
            <BadgeCheck className="h-5 w-5 text-primary" />
          </div>
        </div>
      ),
      footer: (
        <span className="text-xs text-muted-foreground">
          {t("common.received")} · 2 days after acceptance
        </span>
      ),
    },
    // Step 3: progress invoices
    {
      header: t("landing.workflow.panel.progress"),
      status: t("common.sent"),
      statusTone: "bg-admin/10 text-admin",
      body: (
        <div className="space-y-2.5">
          <div className="rounded-lg bg-background px-3.5 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Phase 1 — Discovery & UX
              </span>
              <span className="text-sm font-bold text-foreground">€4,850</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              INV-2026-0008 · issued automatically on completion
            </p>
          </div>
          <div className="rounded-lg bg-background px-3.5 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Phase 2 — Design system
              </span>
              <span className="text-sm font-bold text-foreground">€7,275</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("common.status")}: in progress
            </p>
          </div>
        </div>
      ),
      footer: (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Auto-issued per completed phase
        </span>
      ),
    },
    // Step 4: automated reminders
    {
      header: t("landing.workflow.panel.reminder"),
      status: "Seq 2/3",
      statusTone: "bg-warning/15 text-warning-foreground",
      body: (
        <div className="rounded-lg border border-border/60 bg-background p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <BellRing className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("landing.workflow.panel.reminder")} · INV-2026-0081
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("common.send") ?? "Sent"} · {t("common.email")}
              </p>
            </div>
          </div>
          <p className="mt-3 rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
            {t("landing.workflow.panel.reminderBody")}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  n <= 2 ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>
      ),
      footer: (
        <span className="text-xs text-muted-foreground">
          {t("landing.hero.mock.automation")}
        </span>
      ),
    },
    // Step 5: final payment
    {
      header: t("landing.workflow.panel.final"),
      status: t("common.paid"),
      statusTone: "bg-primary/10 text-primary",
      body: (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between rounded-lg bg-background px-3.5 py-3">
            <span className="text-sm text-muted-foreground">
              Final invoice · INV-2026-0087
            </span>
            <span className="text-lg font-bold text-foreground">
              {t("landing.workflow.panel.finalAmount")}
            </span>
          </div>
          <div className="rounded-lg bg-primary/10 px-3.5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PartyPopper className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  {t("landing.workflow.step5.title")}
                </span>
              </div>
              <BadgeCheck className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      ),
      footer: (
        <span className="text-xs text-muted-foreground">
          Project completed · 100% of {t("common.total")} collected
        </span>
      ),
    },
  ];

  return (
    <section id="workflow" className="border-t border-border/60 bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {t("landing.workflow.title")}
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            {t("landing.workflow.subtitle")}
          </p>
        </div>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-2">
            {steps.map((step, i) => (
              <button
                key={step.title}
                onClick={() => setActive(i)}
                className={cn(
                  "group w-full rounded-xl border p-5 text-left transition-all",
                  active === i
                    ? "border-primary/30 bg-primary/5 shadow-sm"
                    : "border-border/60 bg-background hover:border-primary/20 hover:bg-primary/[0.03]",
                )}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                      active === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <step.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-foreground">
                      <span className="text-xs font-bold text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {step.title}
                    </p>
                    <AnimatePresence initial={false}>
                      {active === i ? (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="mt-1.5 text-sm text-muted-foreground"
                        >
                          {step.desc}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="lg:sticky lg:top-24">
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[0_24px_70px_-28px_hsl(var(--sidebar-background)/0.4)]">
              <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                <span className="ml-3 flex-1 rounded-md bg-background px-3 py-1 text-[11px] text-muted-foreground">
                  app.payalarm.app/projects/301
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">
                    {panels[active].header}
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      panels[active].statusTone,
                    )}
                  >
                    {panels[active].status}
                  </span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="mt-4"
                  >
                    {panels[active].body}
                    <div className="mt-4 border-t border-border/60 pt-3">
                      {panels[active].footer}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Button asChild variant="outline">
                <Link to="/signup">
                  {t("landing.workflow.cta")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
