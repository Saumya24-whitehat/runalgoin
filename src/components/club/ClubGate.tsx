import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Crown, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TeaserMsg {
  id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  author_name: string;
  is_admin: boolean;
}

export function ClubGate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<TeaserMsg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_club_chat_teaser");
      if (!cancelled) {
        if (error) console.error(error);
        setMessages(((data || []) as TeaserMsg[]));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Group by day (Asia/Kolkata local date)
  const grouped = messages.reduce<Record<string, TeaserMsg[]>>((acc, m) => {
    const day = format(new Date(m.created_at), "dd MMM yyyy");
    (acc[day] ||= []).push(m);
    return acc;
  }, {});
  const dayKeys = Object.keys(grouped);

  const handleJoin = () => navigate("/plans");

  return (
    <div className="max-w-3xl mx-auto py-4 px-3">
      {/* Header — StockEdge style */}
      <div className="flex items-center justify-between rounded-t-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          <h1 className="font-heading text-lg font-bold">OptionWorld Club</h1>
        </div>
        <Button size="sm" onClick={handleJoin} className="font-semibold px-6">
          JOIN
        </Button>
      </div>

      {/* Intro strip */}
      <div className="border-x border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        Free preview • last 3 days, up to 2 messages/day. Join to unlock full chat.
      </div>

      {/* Chat teaser */}
      <div className="border border-border rounded-b-xl bg-background overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : dayKeys.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No messages yet. Join to be first!
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {dayKeys.map((day) => (
              <div key={day} className="space-y-2">
                <div className="flex justify-center">
                  <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {day}
                  </span>
                </div>
                {grouped[day].map((m) => (
                  <div key={m.id} className="flex justify-start">
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl rounded-bl-sm px-3 py-2 text-sm shadow-sm border",
                        m.is_admin
                          ? "bg-amber-500/15 border-amber-500/60"
                          : "bg-card border-border",
                      )}
                    >
                      <div className="text-[11px] font-semibold mb-0.5 flex items-center gap-1">
                        {m.is_admin && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] uppercase tracking-wide">
                            Admin
                          </span>
                        )}
                        <span
                          className={
                            m.is_admin
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-primary"
                          }
                        >
                          {m.author_name}
                        </span>
                      </div>
                      {m.image_url && (
                        <img
                          src={m.image_url}
                          alt=""
                          className="rounded-md mb-1 max-h-48 pointer-events-none select-none"
                        />
                      )}
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div className="text-[10px] mt-1 text-right text-muted-foreground">
                        {format(new Date(m.created_at), "HH:mm")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Locked composer / CTA */}
        <div className="border-t border-border bg-gradient-to-b from-card to-muted/40 p-5 text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            Full chat, replies & analyst ideas are members-only
          </div>
          <div>
            <Button onClick={handleJoin} size="lg" className="gap-2 font-semibold">
              <Crown className="w-4 h-4" />
              Join Club — ₹3,500 / year
            </Button>
          </div>
          {!user && (
            <button
              className="text-xs text-primary underline"
              onClick={() => navigate("/auth?redirect=/optionworld-club")}
            >
              Already a member? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
