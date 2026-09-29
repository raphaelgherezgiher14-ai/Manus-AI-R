import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing, Euro, Info, Megaphone, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

const TYPE_ICON = {
  info: Info,
  payment: Euro,
  reminder: BellRing,
  dunning: ShieldAlert,
  system: Megaphone,
};

export function NotificationsPopover() {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";

  const { data: items, refetch } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [] as AppNotification[];
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as AppNotification[];
    },
    enabled: !!user,
  });

  const unread = items?.filter((n) => !n.read).length ?? 0;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    void refetch();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("common.notifications")}>
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border/60 px-4 py-3">
          <p className="font-semibold text-foreground">{t("common.notifications")}</p>
        </div>
        <ScrollArea className="max-h-80">
          {!items || items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              {t("common.empty")}
            </div>
          ) : (
            <div className="flex flex-col">
              {items.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Info;
                const title = lang === "de" ? n.title_de : n.title_en;
                const body = lang === "de" ? n.body_de : n.body_en;
                return (
                  <button
                    key={n.id}
                    onClick={() => void markRead(n.id)}
                    className={cn(
                      "flex gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-accent/60",
                      !n.read && "bg-primary/[0.04]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        n.type === "dunning"
                          ? "bg-destructive/10 text-destructive"
                          : n.type === "payment"
                            ? "bg-primary/10 text-primary"
                            : "bg-admin/10 text-admin",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {title}
                      </span>
                      {body ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {body}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-[11px] text-muted-foreground/70">
                        {formatDate(n.created_at, lang)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
