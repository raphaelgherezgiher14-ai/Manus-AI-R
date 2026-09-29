import { Copy, Link2, Mail, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  copyMagicLink,
  emailDocumentLink,
  regenerateLinkToken,
  type LinkDocType,
} from "@/hooks/use-magic-link";

interface MagicLinkActionsProps {
  type: LinkDocType;
  id: string;
  onEmailSent?: () => void;
  className?: string;
}

/** Copy / e-mail / regenerate the magic link of a quote or invoice. */
export function MagicLinkActions({
  type,
  id,
  onEmailSent,
  className,
}: MagicLinkActionsProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    await copyMagicLink(type, id);
  };

  const email = async () => {
    setBusy(true);
    const res = await emailDocumentLink(type, id);
    setBusy(false);
    if (!res.ok) {
      toast.error(t(res.error ?? "link.emailError"));
      return;
    }
    toast.success(res.delivered ? t("link.emailSent") : t("link.emailSimulated"));
    onEmailSent?.();
  };

  const regenerate = async () => {
    setBusy(true);
    const token = await regenerateLinkToken(type, id);
    setBusy(false);
    if (token) {
      toast.success(t("link.regenerated"));
    } else {
      toast.error(t("link.error"));
    }
  };

  return (
    <div className={className}>
      <Button variant="outline" size="sm" onClick={() => void copy()}>
        <Copy className="h-3.5 w-3.5" />
        {t("link.copy")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => void email()} disabled={busy}>
        <Mail className="h-3.5 w-3.5" />
        {t("link.email")}
      </Button>
      <Button variant="ghost" size="icon" onClick={() => void regenerate()} disabled={busy} aria-label={t("link.regenerate")}>
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
