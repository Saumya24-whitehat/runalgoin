import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface ClubPost {
  id: string;
  user_id: string;
  category_id: string;
  body: string;
  image_url: string | null;
  idea_type: string | null;
  action: string | null;
  exchange: string | null;
  symbol: string | null;
  cmp: number | null;
  entry_zone: string | null;
  stop_loss: number | null;
  target1: number | null;
  timeframe: string | null;
  rationale: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author_name?: string;
  category_name?: string;
  is_admin?: boolean;
}

export function useClubPosts(categoryId: string | null) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [loading, setLoading] = useState(false);
  const profilesCache = useRef<Record<string, string>>({});
  const catsCache = useRef<Record<string, string>>({});
  const adminCache = useRef<Record<string, boolean>>({});

  const enrich = useCallback(async (list: ClubPost[]) => {
    const missingUsers = Array.from(
      new Set(list.map((p) => p.user_id).filter((id) => !profilesCache.current[id])),
    );
    if (missingUsers.length) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", missingUsers);
      (data || []).forEach((p: any) => {
        profilesCache.current[p.user_id] = p.name || "Member";
      });
    }
    const missingCats = Array.from(
      new Set(list.map((p) => p.category_id).filter((id) => !catsCache.current[id])),
    );
    if (missingCats.length) {
      const { data } = await supabase
        .from("club_categories")
        .select("id, name")
        .in("id", missingCats);
      (data || []).forEach((c: any) => {
        catsCache.current[c.id] = c.name;
      });
    }
    const uniqueUserIds = Array.from(new Set(list.map((p) => p.user_id)));
    const missingRoles = uniqueUserIds.filter((id) => !(id in adminCache.current));
    if (missingRoles.length) {
      const { data } = await supabase.rpc("get_club_admin_ids");
      const adminSet = new Set(((data || []) as any[]).map((r: any) => r.user_id));
      uniqueUserIds.forEach((id) => {
        adminCache.current[id] = adminSet.has(id);
      });
    }
    return list.map((p) => ({
      ...p,
      author_name: profilesCache.current[p.user_id] || "Member",
      category_name: catsCache.current[p.category_id] || "",
      is_admin: !!adminCache.current[p.user_id],
    }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("club_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (categoryId) q = q.eq("category_id", categoryId);
    const { data, error } = await q;
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    const enriched = await enrich((data || []) as any);
    setPosts(enriched);
    setLoading(false);
  }, [categoryId, enrich]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`club-posts${categoryId ? `-${categoryId}` : ""}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "club_posts" },
        async (payload) => {
          const post = payload.new as ClubPost;
          if (categoryId && post.category_id !== categoryId) return;
          const [withMeta] = await enrich([post]);
          setPosts((prev) => (prev.some((p) => p.id === withMeta.id) ? prev : [withMeta, ...prev]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryId, enrich]);

  const create = async (values: Partial<ClubPost> & { body: string; category_id: string }) => {
    if (!user) return false;
    const { error } = await supabase.from("club_posts").insert({
      ...values,
      user_id: user.id,
    } as any);
    if (error) {
      toast({ title: "Failed to post", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Posted to the Club" });
    return true;
  };

  const update = async (id: string, values: Partial<ClubPost>) => {
    const { error } = await supabase.from("club_posts").update(values as any).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return false;
    }
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...values } as ClubPost : p)));
    toast({ title: "Post updated" });
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("club_posts").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return false;
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Post deleted" });
    return true;
  };

  return { posts, loading, create, update, remove, refresh: load };
}
