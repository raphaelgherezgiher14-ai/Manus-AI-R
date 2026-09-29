import { ArrowRight, Briefcase, CheckCircle2, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router-dom";

import { Brand } from "@/components/shared/brand";
import { homeForRole } from "@/components/shared/route-guards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth, JUST_SIGNED_UP_KEY } from "@/hooks/use-auth";
import { initials } from "@/lib/format";
import type { Role } from "@/types";

const Welcome = () => {
  const { t } = useTranslation();
  const { profile, user, loading } = useAuth();

  // Captured once at mount: the welcome screen is a one-time stop after signup.
  const [arrivedFromSignup] = useState(() => {
    try {
      return sessionStorage.getItem(JUST_SIGNED_UP_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.removeItem(JUST_SIGNED_UP_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  const role = (profile?.role ?? "business") as Role;

  // Visiting /welcome outside a fresh signup goes straight to the portal.
  if (!loading && user && profile && !arrivedFromSignup) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  const isAdmin = role === "admin";
  const firstName = (profile?.full_name ?? "").split(" ")[0] || profile?.email?.split("@")[0] || "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <span
              className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ${
                isAdmin ? "bg-admin/15 text-admin" : "bg-primary/15 text-primary"
              }`}
            >
              {initials(profile?.full_name) || <UserRound className="h-8 w-8" />}
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
              {t("welcome.title", { name: firstName })}
            </h1>
            <span
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                isAdmin
                  ? "border-admin/30 bg-admin/10 text-admin"
                  : "border-primary/30 bg-primary/10 text-primary"
              }`}
            >
              {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <Briefcase className="h-3.5 w-3.5" />}
              {isAdmin ? t("auth.roleAdmin") : t("auth.roleBusiness")}
            </span>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {isAdmin ? t("welcome.adminDesc") : t("welcome.businessDesc")}
            </p>
            <div className="mt-6 w-full space-y-2 text-left">
              {(isAdmin ? ["welcome.adminF1", "welcome.adminF2"] : ["welcome.businessF1", "welcome.businessF2", "welcome.businessF3"]).map(
                (key) => (
                  <div key={key} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground/80">{t(key)}</span>
                  </div>
                ),
              )}
            </div>
            <Button asChild className="mt-7 w-full" size="lg">
              <Link to={homeForRole(role)}>
                {t("welcome.openDashboard")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Welcome;
