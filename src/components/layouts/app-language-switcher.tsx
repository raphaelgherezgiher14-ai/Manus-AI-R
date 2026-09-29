import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuth } from "@/hooks/use-auth";

export function AppLanguageSwitcher() {
  const { t } = useTranslation();
  const { setProfileLanguage } = useAuth();

  return (
    <LanguageSwitcher
      className="min-w-[110px]"
      onValueChange={(lang) => {
        void setProfileLanguage(lang);
      }}
    />
  );
}
