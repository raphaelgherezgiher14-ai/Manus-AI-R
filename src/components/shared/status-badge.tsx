import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_KEYS, statusTone, TONE_CLASSES } from "@/lib/status";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  const tone = statusTone(status);
  const label = STATUS_KEYS[status];

  return (
    <Badge
      variant="outline"
      className={cn("border font-medium capitalize", TONE_CLASSES[tone], className)}
    >
      {label ? t(label) : status}
    </Badge>
  );
}
