import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface BlogListItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  tags: string[];
  cover_image_url: string | null;
  published_at: string | null;
}

const Blog = () => {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, summary, tags, cover_image_url, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as BlogListItem[];
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Blog — OptionWorld Market Analysis & Insights"
        description="Daily Nifty and Bank Nifty analysis, options market insights, and technical commentary from the OptionWorld team."
        path="/blog"
      />
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Blog</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Market analysis, options insights, and technical commentary.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-16">
              No posts yet. Check back soon.
            </p>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="block group">
                  <Card className="hover:border-primary transition-colors">
                    {post.cover_image_url && (
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    )}
                    <CardContent className="p-6">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {post.tags?.map((t) => (
                          <Badge key={t} variant="secondary">
                            {t}
                          </Badge>
                        ))}
                      </div>
                      <h2 className="text-2xl font-semibold group-hover:text-primary transition-colors mb-2">
                        {post.title}
                      </h2>
                      {post.summary && (
                        <p className="text-muted-foreground mb-3">{post.summary}</p>
                      )}
                      {post.published_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(post.published_at), "dd MMM yyyy")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
