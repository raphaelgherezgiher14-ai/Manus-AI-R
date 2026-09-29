import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const items = [
  "landing.ticker.beta",
  "landing.ticker.noLogin",
  "landing.ticker.sepa",
  "landing.ticker.ustg",
  "landing.ticker.trial",
  "landing.ticker.noCard",
  "landing.ticker.bilingual",
  "landing.ticker.dunning",
];

export function LandingTicker() {
  const { t } = useTranslation();

  const row = (key: string, ariaHidden = false) => (
    <div
      key={key}
      className="flex shrink-0 items-center gap-6 pr-6"
      aria-hidden={ariaHidden || undefined}
    >
      {items.map((item) => (
        <span
          key={item}
          className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-muted-foreground"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          {t(item)}
        </span>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden border-y border-border/60 bg-muted/30 py-3">
      <div className="flex w-max animate-marquee">
        {row("a")}
        {row("b", true)}
      </div>
    </div>
  );
}
