import { useSessionManager } from "@/hooks/useSessionManager";

/**
 * SessionManager Component
 * 
 * This component manages user sessions with:
 * 1. Auto logout at midnight IST (12:00 AM) for fresh data each trading day
 * 2. Session refresh when user returns to tab after being away
 * 3. Session validation on network reconnection
 * 4. Proper handling of stale/expired refresh tokens
 */
export const SessionManager = () => {
  // Initialize session management hooks
  useSessionManager();
  
  // This component doesn't render anything visible
  return null;
};
