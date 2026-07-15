import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { status: "loading" }
  | { status: "valid" }
  | { status: "already" }
  | { status: "invalid"; message?: string }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message?: string };

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid", message: "Missing unsubscribe token." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.valid) setState({ status: "valid" });
        else if (body.reason === "already_unsubscribed") setState({ status: "already" });
        else setState({ status: "invalid", message: body.error || "Invalid link." });
      } catch (e) {
        setState({ status: "invalid", message: "Could not verify link." });
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ status: "submitting" });
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error) return setState({ status: "error", message: error.message });
    if (data?.success) setState({ status: "success" });
    else if (data?.reason === "already_unsubscribed") setState({ status: "already" });
    else setState({ status: "error", message: "Something went wrong." });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Unsubscribe from OptionWorld emails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.status === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying link…
            </div>
          )}
          {state.status === "valid" && (
            <>
              <p className="text-sm text-muted-foreground">
                Confirm you want to stop receiving emails from OptionWorld. You'll no longer get
                subscription reminders or other notifications.
              </p>
              <Button onClick={confirm} className="w-full">
                Confirm unsubscribe
              </Button>
            </>
          )}
          {state.status === "submitting" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Processing…
            </div>
          )}
          {state.status === "success" && (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              <p className="text-sm">You've been unsubscribed. We won't email you anymore.</p>
            </div>
          )}
          {state.status === "already" && (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              <p className="text-sm">You're already unsubscribed. Nothing to do.</p>
            </div>
          )}
          {(state.status === "invalid" || state.status === "error") && (
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              <p className="text-sm">{state.message || "This link is not valid."}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
