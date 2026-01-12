import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "./useSubscription";
import { toast } from "sonner";

const EXPIRY_WARNING_DAYS = 7;
const NOTIFICATION_KEY = "subscription_expiry_notified";

export function useSubscriptionExpiry() {
  const { user } = useAuth();
  const { subscription, refetch } = useSubscription();

  // Check and auto-downgrade expired subscriptions
  const checkAndDowngradeExpired = useCallback(async () => {
    if (!user || !subscription) return;

    // Skip if already free or no expiry
    if (subscription.plan_type === "free" || !subscription.expires_at) return;

    const expiryDate = new Date(subscription.expires_at);
    const now = new Date();

    // If expired, downgrade to free
    if (expiryDate < now && subscription.status === "active") {
      try {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "expired",
            plan_type: "free",
          })
          .eq("user_id", user.id);

        if (error) throw error;

        toast.error("Your subscription has expired", {
          description: "You've been downgraded to the Free plan. Upgrade to continue using Pro features.",
          action: {
            label: "Upgrade",
            onClick: () => window.location.href = "/plans",
          },
        });

        refetch();
      } catch (error) {
        console.error("Error downgrading subscription:", error);
      }
    }
  }, [user, subscription, refetch]);

  // Show expiry warning notification
  const showExpiryWarning = useCallback(() => {
    if (!subscription?.expires_at || subscription.plan_type === "free") return;

    const expiryDate = new Date(subscription.expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check if we already notified today
    const lastNotified = localStorage.getItem(NOTIFICATION_KEY);
    const today = new Date().toDateString();
    
    if (lastNotified === today) return;

    if (daysUntilExpiry > 0 && daysUntilExpiry <= EXPIRY_WARNING_DAYS) {
      localStorage.setItem(NOTIFICATION_KEY, today);
      
      toast.warning(`Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? "s" : ""}`, {
        description: "Renew now to avoid losing access to Pro features.",
        action: {
          label: "Renew",
          onClick: () => window.location.href = "/plans",
        },
      });
    }
  }, [subscription]);

  useEffect(() => {
    if (subscription) {
      checkAndDowngradeExpired();
      showExpiryWarning();
    }
  }, [subscription, checkAndDowngradeExpired, showExpiryWarning]);

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!subscription?.expires_at || subscription.plan_type === "free") return null;
    
    const expiryDate = new Date(subscription.expires_at);
    const now = new Date();
    const days = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return days > 0 ? days : 0;
  };

  return {
    daysRemaining: getDaysRemaining(),
    isExpiringSoon: (getDaysRemaining() ?? Infinity) <= EXPIRY_WARNING_DAYS,
    isExpired: subscription?.status === "expired" || (getDaysRemaining() ?? 1) <= 0,
  };
}
