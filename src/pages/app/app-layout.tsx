import {
  BellRing,
  CreditCard,
  FileSignature,
  FileText,
  FolderKanban,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { Shell, type ShellNavItem } from "@/components/layouts/shell";

export function AppLayout() {
  const { t } = useTranslation();

  const navItems: ShellNavItem[] = [
    { to: "/app", label: t("common.dashboard"), icon: LayoutDashboard, end: true },
    { to: "/app/customers", label: t("common.customers"), icon: Users },
    { to: "/app/quotes", label: t("common.quotes"), icon: FileSignature },
    { to: "/app/projects", label: t("common.projects"), icon: FolderKanban },
    { to: "/app/invoices", label: t("common.invoices"), icon: FileText },
    { to: "/app/payments", label: t("common.payments"), icon: CreditCard },
    { to: "/app/reminders", label: t("common.reminders"), icon: BellRing },
    { to: "/app/cashflow", label: t("common.cashflow"), icon: TrendingUp },
    { to: "/app/messages", label: t("common.messages"), icon: MessageSquare },
    { to: "/app/documents", label: t("common.documents"), icon: FolderOpen },
    { to: "/app/settings", label: t("common.settings"), icon: Settings },
  ];

  // Mobile bottom tab bar: the five most important destinations.
  const mobileNavItems: ShellNavItem[] = [
    { to: "/app", label: t("common.dashboard"), icon: LayoutDashboard, end: true },
    { to: "/app/customers", label: t("common.customers"), icon: Users },
    { to: "/app/invoices", label: t("common.invoices"), icon: FileText },
    { to: "/app/reminders", label: t("common.reminders"), icon: BellRing },
    { to: "/app/settings", label: t("common.settings"), icon: Settings },
  ];

  return (
    <Shell navItems={navItems} mobileNavItems={mobileNavItems}>
      <Outlet />
    </Shell>
  );
}
