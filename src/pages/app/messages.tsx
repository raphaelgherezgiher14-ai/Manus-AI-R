import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useCustomers } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

const Messages = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "de" ? "de" : "en";
  const { user, profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: customers } = useCustomers(companyId);
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["messages-thread", customerId],
    queryFn: async () => {
      if (!customerId) return [] as Message[];
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true });
      return (data ?? []) as Message[];
    },
    enabled: !!customerId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!customerId || !content.trim() || !companyId) return;
    await supabase.from("messages").insert({
      company_id: companyId,
      customer_id: customerId,
      sender_id: user?.id,
      sender_role: "business",
      content: content.trim(),
    });
    setContent("");
    await queryClient.invalidateQueries({ queryKey: ["messages-thread", customerId] });
    toast.success(t("app.messages.sent"));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.messages.title")}
        subtitle={t("app.messages.subtitle")}
      />

      <div className="max-w-sm space-y-1.5">
        <Label>{t("common.customer")}</Label>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger>
            <SelectValue placeholder={t("common.selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {(customers ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="flex h-[420px] flex-col p-0">
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {!customerId ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="h-8 w-8" />
                <p className="mt-2 text-sm">{t("app.messages.selectHint")}</p>
              </div>
            ) : (messages ?? []).length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {t("common.empty")}
              </div>
            ) : (
              (messages ?? []).map((m) => {
                const mine = m.sender_role === "business";
                return (
                  <div
                    key={m.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-4 py-2.5",
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "border border-border/60 bg-muted/60 text-foreground",
                      )}
                    >
                      <p className="text-sm leading-relaxed">{m.content}</p>
                      <p className={cn("mt-1 text-[11px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {formatDate(m.created_at, lang)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-border/60 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="flex gap-2"
            >
              <Input
                placeholder={t("app.messages.placeholder")}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={!customerId}
              />
              <Button type="submit" size="icon" disabled={!customerId || !content.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Messages;
