import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Brand } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function LandingNavbar() {
  const { t } = useTranslation();
  const { user, profile, loading } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#features", label: t("landing.nav.features") },
    { href: "#workflow", label: t("landing.nav.workflow") },
    { href: "#portals", label: t("landing.nav.portals") },
    { href: "#pricing", label: t("landing.nav.pricing") },
    { href: "#faq", label: t("landing.nav.faq") },
  ];

  const dashboardHref = profile?.role === "admin" ? "/admin" : "/app";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Payalarm home">
          <Brand />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden min-w-[110px] sm:flex" />
          <ThemeToggle />
          <div className="hidden items-center gap-2 md:flex">
            {!loading &&
              (user ? (
                <Button asChild variant="outline">
                  <Link to={dashboardHref}>{t("common.open")} {t("common.dashboard") ?? ""}</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost">
                    <Link to="/login">{t("landing.nav.signIn")}</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/signup">{t("landing.nav.cta")}</Link>
                  </Button>
                </>
              ))}
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("common.menu")}>
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <Brand />
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-1">
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent",
                    )}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                  {user ? (
                    <Button asChild>
                      <Link to={dashboardHref} onClick={() => setOpen(false)}>
                        {t("common.open")}
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild variant="outline">
                        <Link to="/login" onClick={() => setOpen(false)}>
                          {t("landing.nav.signIn")}
                        </Link>
                      </Button>
                      <Button asChild>
                        <Link to="/signup" onClick={() => setOpen(false)}>
                          {t("landing.nav.cta")}
                        </Link>
                      </Button>
                    </>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <LanguageSwitcher />
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
