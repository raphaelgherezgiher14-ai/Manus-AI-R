import type { LucideIcon } from "lucide-react";
import { LogOut, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { AppLanguageSwitcher } from "@/components/layouts/app-language-switcher";
import { Brand } from "@/components/shared/brand";
import { NotificationsPopover } from "@/components/shared/notifications-popover";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ShellNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface ShellProps {
  navItems: ShellNavItem[];
  mobileNavItems?: ShellNavItem[];
  accent?: "primary" | "admin";
  sidebarLabel?: string;
  children: ReactNode;
}

export function Shell({ navItems, mobileNavItems, accent = "primary", sidebarLabel, children }: ShellProps) {
  const { t } = useTranslation();
  const { profile, company, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const bottomNav = mobileNavItems ?? navItems.slice(0, 5);

  const activeNavClass =
    accent === "admin"
      ? "bg-admin/15 text-admin"
      : "bg-sidebar-accent text-sidebar-accent-foreground";
  const activeMobileClass = accent === "admin" ? "text-admin" : "text-primary";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {sidebarLabel ? (
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
          {sidebarLabel}
        </p>
      ) : null}
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? activeNavClass
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )
          }
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  const userBox = (
    <div className="border-t border-sidebar-border px-4 py-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 border border-sidebar-border">
          <AvatarFallback className="bg-primary/20 text-primary">
            {initials(profile?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">
            {profile?.full_name}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            {company?.name ?? profile?.email}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => void handleSignOut()}
          aria-label={t("common.signOut")}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Link to="/" aria-label="Home">
            <Brand light />
          </Link>
        </div>
        {nav}
        {userBox}
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 text-sidebar-accent-foreground" aria-label={t("common.menu")}>
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-0">
            <SheetHeader className="h-16 justify-center border-b border-sidebar-border px-5">
              <SheetTitle className="text-left">
                <Brand light />
              </SheetTitle>
            </SheetHeader>
            {nav}
            {userBox}
          </SheetContent>
        </Sheet>
        <Brand light iconOnly />
        <div className="flex items-center gap-1">
          <NotificationsPopover />
        </div>
      </div>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-end gap-2 border-b border-border/60 bg-background/85 px-4 backdrop-blur sm:px-6 lg:pl-8">
          <div className="flex items-center gap-2">
            <AppLanguageSwitcher />
            <ThemeToggle />
            <NotificationsPopover />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex h-16">
          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  isActive
                    ? activeMobileClass
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
