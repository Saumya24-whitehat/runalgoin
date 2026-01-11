import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Subscription {
  plan_type: "free" | "pro" | "enterprise";
  status: "active" | "cancelled" | "expired";
  expires_at: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubscription();
      checkAdminRole();
    } else {
      setSubscription(null);
      setIsAdmin(false);
      setLoading(false);
    }
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan_type, status, expires_at")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching subscription:", error);
      }

      setSubscription(data as Subscription || { plan_type: "free", status: "active", expires_at: null });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setSubscription({ plan_type: "free", status: "active", expires_at: null });
    } finally {
      setLoading(false);
    }
  };

  const checkAdminRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
      }
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
    }
  };

  const isPro = subscription?.plan_type === "pro" || subscription?.plan_type === "enterprise";
  const isEnterprise = subscription?.plan_type === "enterprise";

  return {
    subscription,
    loading,
    isPro,
    isEnterprise,
    isAdmin,
    refetch: fetchSubscription,
  };
}
