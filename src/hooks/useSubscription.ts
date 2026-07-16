import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Subscription {
  plan_type: "free" | "pro" | "club" | "enterprise";
  status: "active" | "cancelled" | "expired";
  expires_at: string | null;
}

async function fetchSubscription(userId: string): Promise<Subscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan_type, status, expires_at")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching subscription:", error);
  }

  return (data as Subscription) || { plan_type: "free", status: "active", expires_at: null };
}

async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (error) {
    console.error("Error checking admin role:", error);
    return false;
  }
  return data === true;
}

export function useSubscription() {
  const { user } = useAuth();

  const {
    data: subscription,
    isLoading: subLoading,
    refetch: refetchSub,
  } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: () => fetchSubscription(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: isAdmin = false, isLoading: adminLoading } = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: () => fetchIsAdmin(user!.id),
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const loading = subLoading || adminLoading;
  const rawSub = subscription || (user ? null : { plan_type: "free" as const, status: "active" as const, expires_at: null });

  // Treat expired subscriptions as free
  const isExpired = !!rawSub?.expires_at && new Date(rawSub.expires_at).getTime() < Date.now();
  const sub = rawSub && isExpired
    ? { ...rawSub, plan_type: "free" as const, status: "expired" as const }
    : rawSub;

  // Persist the downgrade to the DB once, so admin views stay consistent
  useEffect(() => {
    if (!user || !rawSub || !isExpired) return;
    if (rawSub.plan_type === "free" && rawSub.status === "expired") return;
    supabase
      .from("subscriptions")
      .update({ plan_type: "free", status: "expired" })
      .eq("user_id", user.id)
      .then(({ error }) => {
        if (error) console.error("Failed to downgrade expired subscription:", error);
      });
  }, [user, rawSub, isExpired]);

  const isClub = (sub?.plan_type === "club" || sub?.plan_type === "enterprise");
  // Club is a superset of Pro — keep existing Pro gates working for club members.
  const isPro = (sub?.plan_type === "pro" || sub?.plan_type === "club" || sub?.plan_type === "enterprise");
  const isEnterprise = sub?.plan_type === "enterprise";

  return {
    subscription: sub,
    loading: !!user && loading,
    isPro,
    isClub,
    isEnterprise,
    isAdmin,
    refetch: refetchSub,
  };
}
