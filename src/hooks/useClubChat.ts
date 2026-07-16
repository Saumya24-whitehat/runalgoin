import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface ClubChatMessage {
  id: string;
  category_id: string;
  user_id: string;
  body: string;
  image_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  deleted_at: string | null;
  author_name?: string;
}

export function useClubChat(categoryId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ClubChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const profilesCache = useRef<Record<string, string>>({});

  const attachName = useCallback(async (msgs: ClubChatMessage[]) => {
    const missing = Array.from(
      new Set(msgs.map((m) => m.user_id).filter((id) => !profilesCache.current[id])),
    );
    if (missing.length) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", missing);
      (data || []).forEach((p: any) => {
        profilesCache.current[p.user_id] = p.name || "Member";
      });
    }
    return msgs.map((m) => ({ ...m, author_name: profilesCache.current[m.user_id] || "Member" }));
  }, []);

  const load = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("club_chat_messages")
      .select("*")
      .eq("category_id", categoryId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    const named = await attachName((data || []) as any);
    setMessages(named);
    setLoading(false);
  }, [categoryId, attachName]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!categoryId) return;
    const channel = supabase
      .channel(`club-chat-${categoryId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "club_chat_messages",
          filter: `category_id=eq.${categoryId}`,
        },
        async (payload) => {
          const msg = payload.new as ClubChatMessage;
          const [withName] = await attachName([msg]);
          setMessages((prev) =>
            prev.some((m) => m.id === withName.id) ? prev : [...prev, withName],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryId, attachName]);

  const send = async (body: string, imageUrl?: string | null) => {
    if (!user || !categoryId) return;
    const trimmed = body.trim();
    if (!trimmed && !imageUrl) return;
    const { error } = await supabase.from("club_chat_messages").insert({
      category_id: categoryId,
      user_id: user.id,
      body: trimmed || "(image)",
      image_url: imageUrl ?? null,
    });
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    }
  };

  return { messages, loading, send };
}
