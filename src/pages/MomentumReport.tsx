import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDeviceFingerprint } from "@/lib/deviceFingerprint";
import { PageLayout } from "@/components/PageLayout";

const POPUP_INTERVAL_MS = 60_000;

export default function MomentumReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, isAdmin, refetch } = useSubscription();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Momentum Report | OptionWorld";
  }, []);

  useEffect(() => {
    if (isPro || isAdmin) return;
    // Registered (non-pro) users: show once on load.
    if (user) {
      const t = setTimeout(() => setOpen(true), 3000);
      return () => clearTimeout(t);
    }
    // Unregistered users: show every minute.
    const t = setTimeout(() => setOpen(true), 3000);
    const i = setInterval(() => setOpen(true), POPUP_INTERVAL_MS);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, [isPro, isAdmin, user]);

  const startTrial = async () => {
    if (!user) {
      navigate("/auth?redirect=/momentum-report");
      return;
    }
    setLoading(true);
    try {
      const fingerprint = await getDeviceFingerprint();
      const { data, error } = await supabase.functions.invoke("start-free-trial", {
        body: { fingerprint },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Failed to start trial");
      }
      toast.success("15-day Pro trial activated!");
      await refetch();
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Could not start trial");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background">
      <iframe
        src="/momentum-report.html"
        title="Momentum Report"
        className="w-full"
        style={{ height: "100vh", border: 0 }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Unlock the full OptionWorld experience
            </DialogTitle>
            <DialogDescription>
              Start your <strong>15-day free trial</strong> of Pro — full access to option analytics,
              screeners, simulator, and premium reports. No card required.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Maybe later
            </Button>
            <Button onClick={startTrial} disabled={loading}>
              {loading ? "Activating..." : user ? "Start 15-day Free Trial" : "Sign up & Start Trial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
