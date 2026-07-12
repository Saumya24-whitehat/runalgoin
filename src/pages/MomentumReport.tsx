import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDeviceFingerprint } from "@/lib/deviceFingerprint";
import { PageLayout } from "@/components/PageLayout";

const POPUP_INTERVAL_MS = 60_000;

interface ReportSummary {
  id: string;
  title: string;
  week_of: string;
}

export default function MomentumReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, isAdmin, refetch } = useSubscription();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [loadingReport, setLoadingReport] = useState(true);

  useEffect(() => {
    document.title = "Momentum Report | OptionWorld";
  }, []);

  useEffect(() => {
    if (isPro || isAdmin) return;
    if (user) {
      const t = setTimeout(() => setOpen(true), 3000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setOpen(true), 3000);
    const i = setInterval(() => setOpen(true), POPUP_INTERVAL_MS);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, [isPro, isAdmin, user]);

  // Load list of reports
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("momentum_reports")
        .select("id, title, week_of")
        .order("week_of", { ascending: false });
      if (error) {
        console.error(error);
        setLoadingReport(false);
        return;
      }
      const list = data || [];
      setReports(list);
      if (list.length > 0) {
        setSelectedId(list[0].id);
      } else {
        setLoadingReport(false);
      }
    })();
  }, []);

  // Load selected report content
  useEffect(() => {
    if (!selectedId) return;
    setLoadingReport(true);
    (async () => {
      const { data, error } = await supabase
        .from("momentum_reports")
        .select("content")
        .eq("id", selectedId)
        .maybeSingle();
      if (error) {
        toast.error("Failed to load report");
      } else {
        setContent(data?.content || "");
      }
      setLoadingReport(false);
    })();
  }, [selectedId]);

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
    <PageLayout>
      <div className="w-full">
        {reports.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b bg-card">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-primary" />
              Momentum Report
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Week:</span>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {format(new Date(r.week_of), "dd MMM yyyy")} — {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div style={{ height: "calc(100vh - 170px)" }}>
          {loadingReport ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <h2 className="text-lg font-semibold">No momentum reports yet</h2>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                Weekly momentum reports will appear here as soon as they're published.
              </p>
            </div>
          ) : (
            <iframe
              srcDoc={content}
              title="Momentum Report"
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups"
            />
          )}
        </div>

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
    </PageLayout>
  );
}
