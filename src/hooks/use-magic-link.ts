import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { magicLinkUrl } from "@/lib/format";

export type LinkDocType = "quote" | "invoice";

export async function getLinkToken(type: LinkDocType, id: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("ensure_share_link", {
    p_doc_type: type,
    p_doc_id: id,
  });
  if (error) return null;
  return (data as string | null) ?? null;
}

export async function regenerateLinkToken(type: LinkDocType, id: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("regenerate_share_link", {
    p_doc_type: type,
    p_doc_id: id,
  });
  if (error) return null;
  return (data as string | null) ?? null;
}

export async function copyMagicLink(type: LinkDocType, id: string): Promise<boolean> {
  const token = await getLinkToken(type, id);
  if (!token) {
    toast.error("link.error");
    return false;
  }
  try {
    await navigator.clipboard.writeText(magicLinkUrl(token));
    toast.success("link.copied");
    return true;
  } catch {
    toast.error("link.error");
    return false;
  }
}

export async function emailDocumentLink(
  type: LinkDocType,
  id: string,
): Promise<{ ok: boolean; delivered?: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("send-document", {
    body: {
      documentType: type,
      documentId: id,
      baseUrl: window.location.origin,
    },
  });
  if (error) return { ok: false, error: "link.emailError" };
  return { ok: true, delivered: Boolean(data?.delivered) };
}
