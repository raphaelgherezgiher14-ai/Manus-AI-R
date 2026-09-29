import { BetaSection } from "@/components/landing/beta-section";
import { DifferentiationSection } from "@/components/landing/differentiation-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingTicker } from "@/components/landing/landing-ticker";
import { PortalsSection } from "@/components/landing/portals-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { WorkflowSection } from "@/components/landing/workflow-section";
import { LandingFooter } from "@/components/layouts/landing-footer";
import { LandingNavbar } from "@/components/layouts/landing-navbar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingTicker />
        <WorkflowSection />
        <DifferentiationSection />
        <PortalsSection />
        <FeaturesSection />
        <BetaSection />
        <PricingSection />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Index;
