import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useClubCategories } from "@/hooks/useClubCategories";
import { ClubGate } from "@/components/club/ClubGate";
import { ClubChat } from "@/components/club/ClubChat";
import { Crown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function OptionWorldClub() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isClub, isAdmin, loading: subLoading } = useSubscription();
  const { categories, loading: catsLoading } = useClubCategories();
  const [chatId, setChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId && categories.length > 0) setChatId(categories[0].id);
  }, [categories, chatId]);

  const loading = authLoading || subLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="OptionWorld Club — Live Chat Community"
        description="Private trading community with expert stock & option ideas, analyst support and live chat."
        path="/optionworld-club"
      />
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <main className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !user || (!isClub && !isAdmin) ? (
          <ClubGate />
        ) : (
          <div className="container mx-auto px-2 sm:px-4 py-4 max-w-3xl">
            <div className="rounded-xl border border-border overflow-hidden h-[calc(100vh-180px)] min-h-[500px] bg-card">
              {catsLoading || !chatId ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ClubChat categoryId={chatId} categoryName="OptionWorld Club" />
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
