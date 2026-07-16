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
import { ClubFeed } from "@/components/club/ClubFeed";
import { ClubPostComposer } from "@/components/club/ClubPostComposer";
import { Loader2, Hash, MessagesSquare, Newspaper } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function OptionWorldClub() {
  const { user, loading: authLoading } = useAuth();
  const { isClub, isAdmin, loading: subLoading } = useSubscription();
  const { categories, loading: catsLoading } = useClubCategories();
  const [activeCat, setActiveCat] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCat && categories.length > 0) setActiveCat(categories[0].id);
  }, [categories, activeCat]);

  const loading = authLoading || subLoading;
  const currentCat = categories.find((c) => c.id === activeCat);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="OptionWorld Club — Community, Ideas & Live Chat"
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
          <div className="container mx-auto px-2 sm:px-4 py-4 max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
              {/* Rooms sidebar */}
              <aside className="rounded-xl border border-border bg-card p-3 h-fit md:sticky md:top-32">
                <div className="text-xs font-semibold uppercase text-muted-foreground px-2 py-1">
                  Rooms
                </div>
                {catsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex md:flex-col gap-1 overflow-x-auto">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setActiveCat(c.id)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm whitespace-nowrap md:w-full text-left transition-colors",
                          activeCat === c.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted",
                        )}
                      >
                        <Hash className="w-3.5 h-3.5" />
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </aside>

              {/* Main area */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold">
                      {currentCat ? `#${currentCat.name}` : "OptionWorld Club"}
                    </h2>
                    {currentCat?.description && (
                      <p className="text-xs text-muted-foreground">{currentCat.description}</p>
                    )}
                  </div>
                  <ClubPostComposer defaultCategoryId={activeCat} />
                </div>

                <Tabs defaultValue="posts" className="w-full">
                  <TabsList>
                    <TabsTrigger value="posts" className="gap-1.5">
                      <Newspaper className="w-4 h-4" /> Posts
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="gap-1.5">
                      <MessagesSquare className="w-4 h-4" /> Live Chat
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="posts" className="mt-3">
                    <ClubFeed categoryId={activeCat} />
                  </TabsContent>

                  <TabsContent value="chat" className="mt-3">
                    <div className="rounded-xl border border-border overflow-hidden h-[calc(100vh-260px)] min-h-[500px] bg-card">
                      {catsLoading || !activeCat ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <ClubChat categoryId={activeCat} categoryName={currentCat?.name} />
                      )}
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
