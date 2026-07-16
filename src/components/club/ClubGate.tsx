import { Crown, MessageCircle, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ClubGate() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="rounded-3xl border-2 border-primary/40 bg-gradient-to-b from-primary/10 to-card p-8 md:p-12 text-center shadow-xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
          <Crown className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-3">
          OptionWorld Club
        </h1>
        <p className="text-muted-foreground text-lg mb-6">
          Join our private community for analyst-led ideas, expert recommendations, and live
          discussions with active market participants.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mb-8 text-left">
          <FeatureBox
            icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
            title="Expert Recommendations"
            body="Curated stock & option ideas with entry, stop-loss, target and timeframe."
          />
          <FeatureBox
            icon={<MessageCircle className="w-5 h-5 text-blue-500" />}
            title="Club Chat Group"
            body="WhatsApp-style rooms for momentum, short-term, long-term & technicals."
          />
          <FeatureBox
            icon={<Sparkles className="w-5 h-5 text-amber-500" />}
            title="Analyst Support"
            body="Discuss ideas, ask questions and learn from active participants."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={() => navigate("/plans")} className="gap-2">
            <Crown className="w-4 h-4" />
            Join Club — ₹3,500/year
          </Button>
          {!user && (
            <Button size="lg" variant="outline" onClick={() => navigate("/auth?redirect=/optionworld-club")}>
              Sign in
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Includes everything in Pro (yearly) + private community access.
        </p>
      </div>
    </div>
  );
}

function FeatureBox({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
