import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SEO } from "@/components/SEO";

interface Video {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  thumbnail_url: string | null;
  duration: string | null;
  category: string | null;
}

const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export default function Videos() {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["public-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, description, youtube_url, thumbnail_url, duration, category")
        .eq("is_published", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Video[];
    },
  });

  // Group videos by category
  const categories = videos.reduce((acc, video) => {
    const cat = video.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(video);
    return acc;
  }, {} as Record<string, Video[]>);

  const getEmbedUrl = (video: Video) => {
    const videoId = extractYouTubeId(video.youtube_url);
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
  };

  const getThumbnail = (video: Video) => {
    if (video.thumbnail_url) return video.thumbnail_url;
    const videoId = extractYouTubeId(video.youtube_url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  };

  const videoSchema = videos.map((v) => {
    const videoId = extractYouTubeId(v.youtube_url);
    return {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: v.title,
      description: v.description || v.title,
      thumbnailUrl: v.thumbnail_url || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined),
      embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : v.youtube_url,
      uploadDate: new Date().toISOString().split("T")[0],
    };
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Video Tutorials — OptionWorld"
        description="Watch OptionWorld video tutorials — walkthroughs of option chain analysis, strategy builder, PCR, max pain, and other platform features."
        path="/videos"
        jsonLd={videoSchema}
      />
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <main className="container py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold mb-2">Video Tutorials</h1>
          <p className="text-muted-foreground">
            Learn how to use Runalgo effectively with our video guides
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No videos available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(categories).map(([category, categoryVideos]) => (
              <section key={category}>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Badge variant="secondary">{category}</Badge>
                  <span className="text-muted-foreground text-sm font-normal">
                    ({categoryVideos.length} video{categoryVideos.length !== 1 ? "s" : ""})
                  </span>
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryVideos.map((video) => (
                    <Card
                      key={video.id}
                      className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <div className="relative aspect-video bg-muted">
                        {getThumbnail(video) ? (
                          <img
                            src={getThumbnail(video)!}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${extractYouTubeId(video.youtube_url)}/hqdefault.jpg`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-primary rounded-full p-4">
                            <Play className="h-8 w-8 text-primary-foreground fill-current" />
                          </div>
                        </div>
                        {video.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {video.duration}
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </h3>
                        {video.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {video.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Video Player Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          {selectedVideo && getEmbedUrl(selectedVideo) && (
            <div className="aspect-video">
              <iframe
                src={getEmbedUrl(selectedVideo)!}
                title={selectedVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {selectedVideo?.description && (
            <div className="p-4 pt-2 text-sm text-muted-foreground">
              {selectedVideo.description}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
