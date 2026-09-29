import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const PRODUCT_IDS: Record<string, string> = {
  professional: "prod_VDy3LegRaxuCZx",
  business: "prod_VDy3PSBc7LmHYf",
};

export function PricingSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, company } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  const plans = [
    {
      key: "free",
      name: t("landing.pricing.free.name"),
      price: t("landing.pricing.free.price"),
      desc: t("landing.pricing.free.desc"),
      features: [
        t("landing.pricing.free.f1"),
        t("landing.pricing.free.f2"),
        t("landing.pricing.free.f3"),
        t("landing.pricing.free.f4"),
      ],
      cta: t("landing.pricing.free.cta"),
      popular: false,
      href: "/signup",
    },
    {
      key: "professional",
      name: t("landing.pricing.pro.name"),
      price: t("landing.pricing.pro.price"),
      desc: t("landing.pricing.pro.desc"),
      features: [
        t("landing.pricing.pro.f1"),
        t("landing.pricing.pro.f2"),
        t("landing.pricing.pro.f3"),
        t("landing.pricing.pro.f4"),
        t("landing.pricing.pro.f5"),
      ],
      cta: t("landing.pricing.pro.cta"),
      popular: true,
      href: undefined,
    },
    {
      key: "business",
      name: t("landing.pricing.biz.name"),
      price: t("landing.pricing.biz.price"),
      desc: t("landing.pricing.biz.desc"),
      features: [
        t("landing.pricing.biz.f1"),
        t("landing.pricing.biz.f2"),
        t("landing.pricing.biz.f3"),
        t("landing.pricing.biz.f4"),
        t("landing.pricing.biz.f5"),
      ],
      cta: t("landing.pricing.biz.cta"),
      popular: false,
      href: undefined,
    },
  ];

  const choosePlan = async (plan: string) => {
    if (plan === "free") {
      navigate("/signup");
      return;
    }
    setBusy(plan);
    try {
      const productId = PRODUCT_IDS[plan];
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            productId,
            plan,
            companyId: company?.id,
            successUrl: `${window.location.origin}/success`,
            cancelUrl: `${window.location.origin}/cancel`,
          },
        },
      );

      if (error || !data?.url) {
        // Simulated fallback when Stripe checkout is unavailable.
        if (!user) {
          navigate("/signup");
          return;
        }
        if (!profile || profile.role !== "business" || !company) {
          toast.error(t("auth.signInError"));
          return;
        }
        const now = new Date();
        await supabase
          .from("companies")
          .update({ plan, status: "active" })
          .eq("id", company.id);
        await supabase.from("subscriptions").insert({
          company_id: company.id,
          plan,
          status: "active",
          trial_start: now.toISOString(),
          trial_end: now.toISOString(),
          period_start: now.toISOString(),
          period_end: new Date(now.getTime() + 30 * 86400000).toISOString(),
        });
        toast.success(t("landing.pricing.simulated"));
        return;
      }
      window.open(data.url);
    } catch {
      toast.error(t("landing.pricing.checkoutError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section id="pricing" className="border-t border-border/60 bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {t("landing.pricing.title")}
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            {t("landing.pricing.subtitle")}
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={cn(
                "relative flex flex-col rounded-2xl border p-7",
                plan.popular
                  ? "border-primary/40 bg-background shadow-[0_20px_60px_-24px_hsl(160_84%_39%/0.5)]"
                  : "border-border/60 bg-background",
              )}
            >
              {plan.popular ? (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  <Sparkles className="h-3 w-3" />
                  {t("landing.pricing.popular")}
                </span>
              ) : null}
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold tracking-tight text-foreground">
                  {plan.price}
                </span>
                {plan.key !== "free" ? (
                  <span className="text-sm text-muted-foreground">
                    {t("landing.pricing.monthly")}
                  </span>
                ) : null}
              </div>
              {plan.key === "free" ? (
                <span className="mt-2 inline-flex w-fit items-center rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">
                  {t("landing.pricing.trialBadge")}
                </span>
              ) : null}
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={cn(
                        "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-white",
                        plan.popular ? "bg-primary" : "bg-muted-foreground/50",
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-7 w-full"
                size="lg"
                variant={plan.popular ? "default" : "outline"}
                disabled={busy === plan.key}
                onClick={() => void choosePlan(plan.key)}
              >
                {busy === plan.key
                  ? t("common.loading")
                  : plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
