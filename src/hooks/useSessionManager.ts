import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const IST_OFFSET = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30

const getISTMidnight = (): Date => {
  const now = new Date();
  // Convert current time to IST
  const istNow = new Date(now.getTime() + IST_OFFSET);
  
  // Set to next midnight IST
  const istMidnight = new Date(istNow);
  istMidnight.setHours(24, 0, 0, 0); // Next midnight
  
  // Convert back to local time
  return new Date(istMidnight.getTime() - IST_OFFSET);
};

const getTimeUntilISTMidnight = (): number => {
  const now = new Date();
  const midnight = getISTMidnight();
  return midnight.getTime() - now.getTime();
};

export const useSessionManager = () => {
  const { toast } = useToast();
  const midnightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVisibilityCheckRef = useRef<number>(Date.now());
  const SESSION_STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

  // Force logout function
  const forceLogout = useCallback(async (reason: string) => {
    console.log(`[SessionManager] Force logout triggered: ${reason}`);
    
    try {
      await supabase.auth.signOut();
      
      toast({
        title: "Session Expired",
        description: reason,
        variant: "default",
      });
      
      // Redirect to auth page
      window.location.href = "/auth";
    } catch (error) {
      console.error("[SessionManager] Error during logout:", error);
      // Force redirect anyway
      window.location.href = "/auth";
    }
  }, [toast]);

  // Refresh session function
  const refreshSession = useCallback(async (): Promise<boolean> => {
    console.log("[SessionManager] Refreshing session...");
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("[SessionManager] Session refresh error:", error);
        return false;
      }
      
      if (!session) {
        console.log("[SessionManager] No active session found");
        return false;
      }

      // Try to refresh the token
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error("[SessionManager] Token refresh error:", refreshError);
        // If refresh fails, the token might be invalid
        if (refreshError.message.includes("Invalid Refresh Token") || 
            refreshError.message.includes("Refresh Token Not Found")) {
          await forceLogout("Your session has expired. Please login again.");
          return false;
        }
      }

      console.log("[SessionManager] Session refreshed successfully");
      return true;
    } catch (error) {
      console.error("[SessionManager] Unexpected error:", error);
      return false;
    }
  }, [forceLogout]);

  // Setup midnight auto-logout (IST 12:00 AM)
  const setupMidnightLogout = useCallback(async () => {
    // Clear existing timeout
    if (midnightTimeoutRef.current) {
      clearTimeout(midnightTimeoutRef.current);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const timeUntilMidnight = getTimeUntilISTMidnight();
    console.log(`[SessionManager] Setting midnight logout in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);

    midnightTimeoutRef.current = setTimeout(async () => {
      await forceLogout("Daily session reset at midnight. Please login again for fresh data.");
    }, timeUntilMidnight);
  }, [forceLogout]);

  // Handle visibility change (tab focus)
  const handleVisibilityChange = useCallback(async () => {
    if (document.visibilityState !== "visible") {
      return;
    }

    const now = Date.now();
    const timeSinceLastCheck = now - lastVisibilityCheckRef.current;
    lastVisibilityCheckRef.current = now;

    console.log(`[SessionManager] Tab focused, time away: ${Math.round(timeSinceLastCheck / 1000)}s`);

    // Only refresh if user was away for more than threshold
    if (timeSinceLastCheck > SESSION_STALE_THRESHOLD) {
      console.log("[SessionManager] Session might be stale, refreshing...");
      
      const success = await refreshSession();
      
      if (success) {
        toast({
          title: "Session Refreshed",
          description: "Data will update automatically.",
        });
      }
    } else {
      // Just validate session is still valid
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await forceLogout("Your session has expired. Please login again.");
      }
    }
  }, [refreshSession, forceLogout, toast]);

  // Handle online/offline events
  const handleOnline = useCallback(async () => {
    console.log("[SessionManager] Network online, validating session...");
    await refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    // Setup midnight logout
    setupMidnightLogout();

    // Setup visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Setup online event listener
    window.addEventListener("online", handleOnline);

    // Listen for auth state changes to reset midnight timer
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setupMidnightLogout();
      } else if (event === "SIGNED_OUT") {
        if (midnightTimeoutRef.current) {
          clearTimeout(midnightTimeoutRef.current);
        }
      }
    });

    return () => {
      if (midnightTimeoutRef.current) {
        clearTimeout(midnightTimeoutRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      subscription.unsubscribe();
    };
  }, [setupMidnightLogout, handleVisibilityChange, handleOnline]);

  return {
    refreshSession,
    forceLogout,
  };
};
