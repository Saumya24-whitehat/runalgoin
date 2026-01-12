import { useSessionManager } from "@/hooks/useSessionManager";
import { useSubscriptionExpiry } from "@/hooks/useSubscriptionExpiry";

/**
 * SessionManager Component
 * 
 * This component manages user sessions with:
 * 1. Auto logout at midnight IST (12:00 AM) for fresh data each trading day
 * 2. Session refresh when user returns to tab after being away
 * 3. Session validation on network reconnection
 * 4. Proper handling of stale/expired refresh tokens
 * 5. Subscription expiry notifications and auto-downgrade
 */
export const SessionManager = () => {
  // Initialize session management hooks
  useSessionManager();
  
  // Check subscription expiry and show notifications
  useSubscriptionExpiry();
  
  // This component doesn't render anything visible
  return null;
};
