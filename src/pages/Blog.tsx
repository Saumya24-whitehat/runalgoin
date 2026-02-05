 import { Navbar } from "@/components/Navbar";
 import { TickerRibbon } from "@/components/TickerRibbon";
 import { Footer } from "@/components/Footer";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Calendar, Clock, User } from "lucide-react";
 
 const posts = [
   {
     title: "Understanding Implied Volatility in Options Trading",
     excerpt: "A comprehensive guide to IV and how it affects option pricing in the Indian markets.",
     author: "Rahul Sharma",
     date: "Feb 3, 2025",
     readTime: "8 min read",
     category: "Options",
     image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=300&fit=crop",
   },
   {
     title: "Nifty Weekly Options: Strategies for Expiry Day",
     excerpt: "Learn profitable strategies specifically designed for weekly option expiries.",
     author: "Priya Patel",
     date: "Jan 28, 2025",
     readTime: "6 min read",
     category: "Strategies",
     image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=300&fit=crop",
   },
   {
     title: "How to Use PCR for Market Direction",
     excerpt: "Put-Call Ratio analysis for predicting market trends and reversals.",
     author: "Amit Kumar",
     date: "Jan 22, 2025",
     readTime: "5 min read",
     category: "Analysis",
     image: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&h=300&fit=crop",
   },
   {
     title: "Building a Systematic Trading Approach",
     excerpt: "Why systematic trading beats discretionary trading for most retail traders.",
     author: "Vikram Singh",
     date: "Jan 15, 2025",
     readTime: "10 min read",
     category: "Trading",
     image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&h=300&fit=crop",
   },
 ];
 
 const Blog = () => {
   return (
     <div className="min-h-screen bg-background flex flex-col">
       <div className="sticky top-0 z-50">
         <TickerRibbon />
         <Navbar />
       </div>
       <main className="flex-1 container mx-auto px-4 py-12">
         <div className="max-w-4xl mx-auto">
           <h1 className="text-4xl font-bold mb-4">Blog</h1>
           <p className="text-muted-foreground text-lg mb-8">
             Insights, strategies, and market analysis from our experts.
           </p>
           <div className="space-y-8">
             {posts.map((post, index) => (
               <Card key={index} className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer">
                 <div className="md:flex">
                   <div className="md:w-1/3">
                     <img src={post.image} alt={post.title} className="w-full h-48 md:h-full object-cover" />
                   </div>
                   <div className="md:w-2/3 p-6">
                     <Badge variant="secondary" className="mb-3">{post.category}</Badge>
                     <h2 className="text-xl font-semibold mb-2 hover:text-primary transition-colors">{post.title}</h2>
                     <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                     <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                       <span className="flex items-center gap-1">
                         <User className="h-4 w-4" />
                         {post.author}
                       </span>
                       <span className="flex items-center gap-1">
                         <Calendar className="h-4 w-4" />
                         {post.date}
                       </span>
                       <span className="flex items-center gap-1">
                         <Clock className="h-4 w-4" />
                         {post.readTime}
                       </span>
                     </div>
                   </div>
                 </div>
               </Card>
             ))}
           </div>
         </div>
       </main>
       <Footer />
     </div>
   );
 };
 
 export default Blog;