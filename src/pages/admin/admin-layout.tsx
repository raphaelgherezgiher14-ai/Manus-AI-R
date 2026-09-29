import {
  Activity,
  Building2,
  CalendarDays,
  CreditCard,
  FileSignature,
  FileText,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Plug,
  Receipt,
  Settings,
  Sparkles,
  Users,
  ScrollText,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { Shell, type ShellNavItem } from "@/components/layouts/shell";

export function AdminLayout() {
  const { t } = useTranslation();

  const navItems: ShellNavItem[] = [
    { to: "/admin", label: t("admin.nav.dashboard"), icon: LayoutDashboard, end: true },
    { to: "/admin/companies", label: t("admin.nav.companies"), icon: Building2 },
    { to: "/admin/calendar", label: t("admin.nav.calendar"), icon: CalendarDays },
    { to: "/admin/invoice-management", label: t("admin.nav.invoiceMgmt"), icon: FileText },
    { to: "/admin/payments", label: t("admin.nav.payments"), icon: Receipt },
    { to: "/admin/analyst", label: t("admin.nav.analyst"), icon: Sparkles },
    { to: "/admin/users", label: t("admin.nav.users"), icon: Users },
    { to: "/admin/roles", label: t("admin.nav.roles"), icon: KeyRound },
    { to: "/admin/customers", label: t("admin.nav.customers"), icon: Users },
    { to: "/admin/projects", label: t("admin.nav.projects"), icon: FolderKanban },
    { to: "/admin/quotes", label: t("admin.nav.quotes"), icon: FileSignature },
    { to: "/admin/invoices", label: t("admin.nav.invoices"), icon: FileText },
    { to: "/admin/subscriptions", label: t("admin.nav.subscriptions"), icon: CreditCard },
    { to: "/admin/payment-methods", label: t("admin.nav.paymentMethods"), icon: CreditCard },
    { to: "/admin/integrations", label: t("admin.nav.integrations"), icon: Plug },
    { to: "/admin/analytics", label: t("admin.nav.analytics"), icon: Activity },
    { to: "/admin/audit", label: t("admin.nav.audit"), icon: ScrollText },
    { to: "/admin/settings", label: t("admin.nav.settings"), icon: Settings },
  ];

  const mobileNavItems: ShellNavItem[] = [
    { to: "/admin", label: t("admin.nav.dashboard"), icon: LayoutDashboard, end: true },
    { to: "/admin/companies", label: t("admin.nav.companies"), icon: Building2 },
    { to: "/admin/calendar", label: t("admin.nav.calendar"), icon: CalendarDays },
    { to: "/admin/payments", label: t("admin.nav.payments"), icon: Receipt },
    { to: "/admin/settings", label: t("admin.nav.settings"), icon: Settings },
  ];

  return (
    <Shell
      navItems={navItems}
      mobileNavItems={mobileNavItems}
      accent="admin"
      sidebarLabel={t("admin.consoleLabel")}
    >
      <Outlet />
    </Shell>
  );
}
