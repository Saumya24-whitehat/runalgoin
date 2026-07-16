import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  is_admin?: boolean;
}

export function useClubChat(categoryId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ClubChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const profilesCache = useRef<Record<string, string>>({});
  const adminCache = useRef<Record<string, boolean>>({});
  const initialLoadRef = useRef(true);

  const attachMeta = useCallback(async (msgs: ClubChatMessage[]) => {
    const uniqueIds = Array.from(new Set(msgs.map((m) => m.user_id)));
    const missingNames = uniqueIds.filter((id) => !(id in profilesCache.current));
    const missingRoles = uniqueIds.filter((id) => !(id in adminCache.current));

    if (missingNames.length) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", missingNames);
      missingNames.forEach((id) => {
        profilesCache.current[id] = "Member";
      });
      (data || []).forEach((p: any) => {
        profilesCache.current[p.user_id] = p.name || "Member";
      });
    }

    if (missingRoles.length) {
      const { data } = await supabase.rpc("get_club_admin_ids");
      const adminSet = new Set(((data || []) as any[]).map((r: any) => r.user_id));
      missingRoles.forEach((id) => {
        adminCache.current[id] = adminSet.has(id);
      });
    }

    return msgs.map((m) => ({
      ...m,
      author_name: profilesCache.current[m.user_id] || "Member",
      is_admin: !!adminCache.current[m.user_id],
    }));
  }, []);

  const load = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    initialLoadRef.current = true;
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
    const named = await attachMeta((data || []) as any);
    setMessages(named);
    setLoading(false);
    setTimeout(() => {
      initialLoadRef.current = false;
    }, 500);
  }, [categoryId, attachMeta]);

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
          const [withMeta] = await attachMeta([msg]);
          setMessages((prev) =>
            prev.some((m) => m.id === withMeta.id) ? prev : [...prev, withMeta],
          );

          // Alert everyone (except sender) when an admin posts a new message
          if (
            withMeta.is_admin &&
            withMeta.user_id !== user?.id &&
            !initialLoadRef.current
          ) {
            toast(`📢 Admin • ${withMeta.author_name}`, {
              description: withMeta.body.slice(0, 140),
              duration: 6000,
            });
            try {
              // Small audible ping
              const ctx = new (window.AudioContext ||
                (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 880;
              gain.gain.setValueAtTime(0.05, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
              osc.start();
              osc.stop(ctx.currentTime + 0.4);
            } catch {
              /* ignore */
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryId, attachMeta, user?.id]);

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
      toast.error("Failed to send", { description: error.message });
    }
  };

  return { messages, loading, send };
}
