import { XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";

const Cancel = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Brand className="mb-8" />
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/15">
        <XCircle className="h-9 w-9 text-warning-foreground" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-foreground">
        {t("cancel.title")}
      </h1>
      <p className="mt-2 max-w-md text-center text-muted-foreground">
        {t("cancel.subtitle")}
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild variant="outline">
          <Link to="/">{t("cancel.actions.home")}</Link>
        </Button>
        <Button asChild>
          <Link to="/#pricing">{t("cancel.actions.retry")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default Cancel;
