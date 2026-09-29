import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Brand } from "@/components/shared/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function LandingFooter() {
  const { t } = useTranslation();

  const columns = [
    {
      title: t("landing.footer.product"),
      links: [
        { label: t("landing.footer.product.workflow"), href: "#workflow" },
        { label: t("landing.footer.product.features"), href: "#features" },
        { label: t("landing.footer.product.pricing"), href: "#pricing" },
        { label: t("landing.footer.product.faq"), href: "#faq" },
      ],
    },
    {
      title: t("landing.footer.legal"),
      links: [
        { label: t("legal.imprint.title"), href: "/impressum", internal: true },
        { label: t("legal.privacy.title"), href: "/datenschutz", internal: true },
        { label: t("legal.terms.title"), href: "/agb", internal: true },
      ],
    },
  ];

  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(2,1fr)]">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              {t("landing.footer.tagline")}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <LanguageSwitcher className="min-w-[110px]" />
              <ThemeToggle />
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.internal ? (
                      <Link
                        to={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {t("common.appName")}.{" "}
            {t("landing.footer.rights")}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/login" className="hover:text-foreground">
              {t("common.signIn")}
            </Link>
            <Link to="/signup" className="hover:text-foreground">
              {t("common.signUp")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
