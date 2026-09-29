import { fetchEventSource } from "@microsoft/fetch-event-source";
import { Bot, Loader2, RotateCcw, Send, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SUPABASE_URL, supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const FALLBACK_MESSAGES: Record<string, string> = {
  authentication_error: "ai.authError",
  rate_limit_error: "ai.rateError",
  invalid_request_error: "ai.invalidError",
  overloaded_error: "ai.overloadedError",
  insufficient_credits: "ai.creditsError",
  permission_error: "ai.disabledError",
  api_error: "ai.serviceError",
};

interface ChatItem {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  error?: boolean;
}

const suggestions = ["ai.q1", "ai.q2", "ai.q3"];

export function AiAnalyst() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [items, setItems] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || isLoading) return;
    abortRef.current = new AbortController();
    const sessionId = crypto.randomUUID();

    // The backend verifies the caller is an admin — send the session token,
    // never the anonymous key.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("ai.authError");
      return;
    }

    setInput("");
    setError(null);
    setItems((prev) => [
      ...prev,
      { role: "user", content: q },
      { role: "assistant", content: "", isStreaming: true },
    ]);
    setIsLoading(true);

    try {
      await fetchEventSource(`${SUPABASE_URL}/functions/v1/admin-ai-analyst`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "X-Session-ID": sessionId,
        },
        body: JSON.stringify({ question: q }),
        signal: abortRef.current.signal,
        async onopen(response) {
          const contentType = response.headers.get("content-type") ?? "";
          if (!response.ok) {
            if (contentType.includes("text/event-stream")) {
              const text = await response.text();
              const m = text.match(/data: (.+)/);
              if (m) {
                try {
                  const d = JSON.parse(m[1]);
                  throw new Error(d.error?.message || "ai.serviceError");
                } catch (e) {
                  if (e instanceof Error && e.message !== "ai.serviceError") throw e;
                }
              }
            }
            if (contentType.includes("application/json")) {
              if (response.status === 401) throw new Error("ai.authError");
              if (response.status === 403) throw new Error("ai.forbidden");
              const d = await response.json();
              throw new Error(d.error?.message || `Request failed: ${response.status}`);
            }
            throw new Error(`Request failed: ${response.status}`);
          }
          if (!contentType.includes("text/event-stream")) {
            throw new Error(`Expected text/event-stream, got: ${contentType}`);
          }
        },
        onmessage(event) {
          if (!event.data || event.data === "[DONE]") return;
          const data = JSON.parse(event.data);
          if (data.error) {
            const msg = data.error?.message || FALLBACK_MESSAGES[data.error?.status] || "ai.serviceError";
            setError(msg);
            setItems((prev) => [
              ...prev.slice(0, -1),
              { role: "assistant", content: msg, error: true },
            ]);
            setIsLoading(false);
            return;
          }
          const text = data.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text || "")
            .join("");
          if (text) {
            setItems((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = {
                  ...last,
                  content: (last.content || "") + text,
                };
              }
              return next;
            });
          }
          if (data.candidates?.[0]?.finishReason) {
            setItems((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = { ...last, isStreaming: false };
              }
              return next;
            });
            setIsLoading(false);
          }
        },
        onerror(err) {
          throw err;
        },
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const message = (err as Error).message || "ai.serviceError";
        setError(message);
        setItems((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: message, error: true, isStreaming: false };
          }
          return next;
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setItems([]);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("admin.consoleLabel")}
        title={t("ai.title")}
        subtitle={t("ai.subtitle")}
        actions={
          items.length > 0 ? (
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t("ai.reset")}
            </Button>
          ) : undefined
        }
      />

      <Card className="overflow-hidden border-border/60 bg-[hsl(var(--sidebar-background))] text-white shadow-card">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/25 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{t("ai.title")}</p>
              <p className="text-xs text-white/60">{t("ai.poweredBy")}</p>
            </div>
          </div>

          <div className="max-h-[420px] min-h-[200px] space-y-4 overflow-y-auto p-5">
            {items.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Bot className="h-10 w-10 text-white/30" />
                <p className="mt-3 max-w-sm text-sm text-white/70">
                  {t("ai.intro")}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="border-white/20 bg-white/5 text-white/85 hover:bg-white/10 hover:text-white"
                      onClick={() => void send(t(s))}
                      disabled={isLoading}
                    >
                      {t(s)}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              items.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3",
                    item.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                      item.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : item.error
                          ? "bg-destructive/20 text-destructive"
                          : "bg-white/10 text-white/90",
                    )}
                  >
                    {item.content}
                    {item.isStreaming && (
                      <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-current align-middle" />
                    )}
                    {!item.content && item.isStreaming && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="flex items-end gap-2"
            >
              <Textarea
                className="min-h-[44px] flex-1 resize-none border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-primary"
                placeholder={t("ai.placeholder")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="h-11 w-11 shrink-0"
                aria-label={t("ai.send")}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {error ? (
              <p className="mt-2 text-xs text-destructive">{t(error)}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
