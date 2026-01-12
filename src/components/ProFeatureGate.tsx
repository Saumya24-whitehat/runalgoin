import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Loader2 } from "lucide-react";

interface ProFeatureGateProps {
  children: ReactNode;
  featureName?: string;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function ProFeatureGate({
  children,
  featureName = "This feature",
  fallback,
  showUpgradePrompt = true,
}: ProFeatureGateProps) {
  const { user } = useAuth();
  const { isPro, loading, isAdmin } = useSubscription();
  const navigate = useNavigate();

  // Admins always have access
  if (isAdmin) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    if (fallback) return <>{fallback}</>;
    
    if (showUpgradePrompt) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-card/50 border border-border rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
            Login Required
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Please login to access {featureName.toLowerCase()}.
          </p>
          <Button onClick={() => navigate("/auth")} className="gap-2">
            Login
          </Button>
        </div>
      );
    }
    return null;
  }

  if (!isPro) {
    if (fallback) return <>{fallback}</>;
    
    if (showUpgradePrompt) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-primary/5 to-card/50 border border-primary/20 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
            Pro Feature
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {featureName} is available exclusively for Pro subscribers. Upgrade now to unlock
            powerful analytics tools.
          </p>
          <Button onClick={() => navigate("/plans")} className="gap-2">
            <Crown className="h-4 w-4" />
            Upgrade to Pro
          </Button>
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
}

// Hook for conditional rendering without UI
export function useProFeature() {
  const { isPro, loading, isAdmin } = useSubscription();
  const { user } = useAuth();

  return {
    hasAccess: isAdmin || isPro,
    isLoggedIn: !!user,
    loading,
    isPro,
    isAdmin,
  };
}
