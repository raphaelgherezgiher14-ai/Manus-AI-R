import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";

const Success = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Brand className="mb-8" />
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="h-9 w-9 text-primary" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-foreground">
        {t("success.title")}
      </h1>
      <p className="mt-2 max-w-md text-center text-muted-foreground">
        {t("success.subtitle")}
      </p>
      <Button asChild className="mt-8">
        <Link to="/">{t("success.actions.goHome")}</Link>
      </Button>
    </div>
  );
};

export default Success;
