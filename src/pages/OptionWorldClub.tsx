import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useClubCategories } from "@/hooks/useClubCategories";
import { ClubGate } from "@/components/club/ClubGate";
import { ClubFeed } from "@/components/club/ClubFeed";
import { ClubChat } from "@/components/club/ClubChat";
import { ClubPostComposer } from "@/components/club/ClubPostComposer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Crown, Hash, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function OptionWorldClub() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isClub, isAdmin, loading: subLoading } = useSubscription();
  const { categories, loading: catsLoading } = useClubCategories();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [tab, setTab] = useState<"feed" | "chat">("feed");

  useEffect(() => {
    if (!selectedCat && categories.length > 0) setSelectedCat(categories[0].id);
  }, [categories, selectedCat]);

  const selectedName = useMemo(
    () => categories.find((c) => c.id === selectedCat)?.name,
    [categories, selectedCat],
  );

  const loading = authLoading || subLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="OptionWorld Club — Community, Ideas & Live Chat"
        description="Private trading community with expert stock & option ideas, analyst support and live WhatsApp-style chat rooms."
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
        ) : !user ? (
          <div className="max-w-md mx-auto text-center py-16 space-y-4">
            <Crown className="w-10 h-10 mx-auto text-primary" />
            <h1 className="text-2xl font-bold">Sign in to access the Club</h1>
            <Button onClick={() => navigate("/auth?redirect=/optionworld-club")}>Sign in</Button>
          </div>
        ) : !isClub ? (
          <ClubGate />
        ) : (
          <div className="container mx-auto px-2 sm:px-4 py-4">
            <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="font-heading text-2xl md:text-3xl font-bold flex items-center gap-2">
                  <Crown className="w-6 h-6 text-primary" />
                  OptionWorld Club
                </h1>
                <p className="text-sm text-muted-foreground">
                  Ideas, discussions, and live chat with fellow members.
                </p>
              </div>
              <ClubPostComposer defaultCategoryId={selectedCat} />
            </div>

            <div className="grid lg:grid-cols-[220px_1fr] gap-4">
              {/* Sidebar of rooms */}
              <aside className="rounded-xl border border-border bg-card p-2 h-fit lg:sticky lg:top-[140px]">
                <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Rooms
                </div>
                {catsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto my-4" />
                ) : (
                  <ul className="space-y-1">
                    {categories.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => setSelectedCat(c.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                            selectedCat === c.id
                              ? "bg-primary/15 text-primary font-semibold"
                              : "hover:bg-secondary text-foreground",
                          )}
                        >
                          <Hash className="w-3.5 h-3.5" />
                          <span className="truncate">{c.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              <section>
                <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                  <TabsList>
                    <TabsTrigger value="feed">Feed</TabsTrigger>
                    <TabsTrigger value="chat" className="gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      Chat
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="feed" className="mt-3">
                    <ClubFeed categoryId={selectedCat} />
                  </TabsContent>

                  <TabsContent value="chat" className="mt-3">
                    <div className="rounded-xl border border-border overflow-hidden h-[70vh]">
                      <ClubChat categoryId={selectedCat} categoryName={selectedName} />
                    </div>
                  </TabsContent>
                </Tabs>
              </section>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
