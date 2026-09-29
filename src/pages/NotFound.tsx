import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Brand className="mb-8" />
      <p className="text-7xl font-extrabold tracking-tight text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold text-foreground">
        {t("notFound.title")}
      </h1>
      <p className="mt-2 max-w-md text-center text-muted-foreground">
        {t("notFound.subtitle")}
      </p>
      <Button asChild className="mt-8">
        <Link to="/">{t("notFound.actions.backHome")}</Link>
      </Button>
    </div>
  );
};

export default NotFound;
