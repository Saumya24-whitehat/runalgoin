 import { Navbar } from "@/components/Navbar";
 import { TickerRibbon } from "@/components/TickerRibbon";
 import { Footer } from "@/components/Footer";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Play } from "lucide-react";
 
 const videos = [
   {
     title: "Getting Started with Runalgo",
     duration: "12:34",
     thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=225&fit=crop",
     category: "Beginner",
   },
   {
     title: "Understanding Option Greeks",
     duration: "18:22",
     thumbnail: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=400&h=225&fit=crop",
     category: "Intermediate",
   },
   {
     title: "Building Your First Strategy",
     duration: "24:15",
     thumbnail: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=225&fit=crop",
     category: "Intermediate",
   },
   {
     title: "Advanced PCR Analysis",
     duration: "15:48",
     thumbnail: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=225&fit=crop",
     category: "Advanced",
   },
   {
     title: "Max Pain Strategy Deep Dive",
     duration: "21:33",
     thumbnail: "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=400&h=225&fit=crop",
     category: "Advanced",
   },
   {
     title: "Risk Management Essentials",
     duration: "16:07",
     thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop",
     category: "Beginner",
   },
 ];
 
 const Videos = () => {
   return (
     <div className="min-h-screen bg-background flex flex-col">
       <div className="sticky top-0 z-50">
         <TickerRibbon />
         <Navbar />
       </div>
       <main className="flex-1 container mx-auto px-4 py-12">
         <div className="max-w-6xl mx-auto">
           <h1 className="text-4xl font-bold mb-4">Video Tutorials</h1>
           <p className="text-muted-foreground text-lg mb-8">
             Learn options trading through our comprehensive video library.
           </p>
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
             {videos.map((video, index) => (
               <Card key={index} className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group">
                 <div className="relative">
                   <img src={video.thumbnail} alt={video.title} className="w-full h-48 object-cover" />
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="p-3 rounded-full bg-primary">
                       <Play className="h-8 w-8 text-primary-foreground" fill="currentColor" />
                     </div>
                   </div>
                   <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                     {video.duration}
                   </span>
                   <span className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded">
                     {video.category}
                   </span>
                 </div>
                 <CardHeader>
                   <CardTitle className="text-base">{video.title}</CardTitle>
                 </CardHeader>
               </Card>
             ))}
           </div>
         </div>
       </main>
       <Footer />
     </div>
   );
 };
 
 export default Videos;