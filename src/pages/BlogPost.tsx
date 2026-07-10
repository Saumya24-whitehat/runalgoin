import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { renderMarkdown } from "@/lib/markdown";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  tags: string[];
  cover_image_url: string | null;
  published_at: string | null;
}


const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, summary, content, tags, cover_image_url, published_at")
        .eq("slug", slug!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data as BlogPost | null;
    },
    enabled: !!slug,
  });

  const articleSchema = post
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.summary || post.title,
        image: post.cover_image_url || undefined,
        datePublished: post.published_at || undefined,
        author: { "@type": "Organization", name: "OptionWorld" },
      }
    : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {post && (
        <SEO
          title={`${post.title} — OptionWorld Blog`}
          description={post.summary || post.title}
          path={`/blog/${post.slug}`}
          jsonLd={articleSchema}
        />
      )}
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Link to="/blog">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to blog
            </Button>
          </Link>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error || !post ? (
            <div className="text-center py-16">
              <h1 className="text-2xl font-semibold mb-2">Post not found</h1>
              <p className="text-muted-foreground">
                This article may have been removed or is not yet published.
              </p>
            </div>
          ) : (
            <article>
              {post.cover_image_url && (
                <img
                  src={post.cover_image_url}
                  alt={post.title}
                  className="w-full rounded-lg mb-6"
                />
              )}
              <div className="flex flex-wrap gap-2 mb-3">
                {post.tags?.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
              <h1 className="text-4xl font-bold mb-3">{post.title}</h1>
              {post.published_at && (
                <p className="text-sm text-muted-foreground mb-8">
                  {format(new Date(post.published_at), "dd MMM yyyy")}
                </p>
              )}
              <div
                className="space-y-4 text-foreground"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
              />
            </article>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPostPage;
