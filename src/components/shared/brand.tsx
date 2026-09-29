import { AlarmClock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

interface BrandProps {
  className?: string;
  light?: boolean;
  iconOnly?: boolean;
}

export function Brand({ className, light = false, iconOnly }: BrandProps) {
  const { t } = useTranslation();
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <AlarmClock className="h-5 w-5" />
      </span>
      {!iconOnly ? (
        <span
          className={cn(
            "text-lg font-bold tracking-tight",
            light ? "text-white" : "text-foreground",
          )}
        >
          {t("common.appName")}
        </span>
      ) : null}
    </span>
  );
}
