 import { Navbar } from "@/components/Navbar";
 import { TickerRibbon } from "@/components/TickerRibbon";
 import { Footer } from "@/components/Footer";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Textarea } from "@/components/ui/textarea";
 import { Label } from "@/components/ui/label";
 import { Mail, Phone, MapPin } from "lucide-react";
 import { useState } from "react";
 import { useToast } from "@/hooks/use-toast";
 
 const Contact = () => {
   const { toast } = useToast();
   const [loading, setLoading] = useState(false);
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     setLoading(true);
     setTimeout(() => {
       setLoading(false);
       toast({
         title: "Message Sent",
         description: "We'll get back to you soon.",
       });
     }, 1000);
   };
 
   return (
     <div className="min-h-screen bg-background flex flex-col">
       <div className="sticky top-0 z-50">
         <TickerRibbon />
         <Navbar />
       </div>
       <main className="flex-1 container mx-auto px-4 py-12">
         <div className="max-w-5xl mx-auto">
           <div className="text-center mb-12">
             <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
             <p className="text-xl text-muted-foreground">
               Have questions? We'd love to hear from you.
             </p>
           </div>
 
           <div className="grid md:grid-cols-2 gap-8">
             {/* Contact Info */}
             <div className="space-y-6">
               <Card>
                 <CardHeader>
                   <div className="flex items-center gap-3">
                     <div className="p-2 rounded-lg bg-primary/10">
                       <Mail className="h-5 w-5 text-primary" />
                     </div>
                     <div>
                       <CardTitle className="text-lg">Email</CardTitle>
                       <CardDescription>support@runalgo.xyz</CardDescription>
                     </div>
                   </div>
                 </CardHeader>
               </Card>
               <Card>
                 <CardHeader>
                   <div className="flex items-center gap-3">
                     <div className="p-2 rounded-lg bg-primary/10">
                       <Phone className="h-5 w-5 text-primary" />
                     </div>
                     <div>
                       <CardTitle className="text-lg">Phone</CardTitle>
                       <CardDescription>+91 98765 43210</CardDescription>
                     </div>
                   </div>
                 </CardHeader>
               </Card>
               <Card>
                 <CardHeader>
                   <div className="flex items-center gap-3">
                     <div className="p-2 rounded-lg bg-primary/10">
                       <MapPin className="h-5 w-5 text-primary" />
                     </div>
                     <div>
                       <CardTitle className="text-lg">Office</CardTitle>
                       <CardDescription>
                         Runalgo Technologies<br />
                         Bandra Kurla Complex<br />
                         Mumbai 400051, India
                       </CardDescription>
                     </div>
                   </div>
                 </CardHeader>
               </Card>
             </div>
 
             {/* Contact Form */}
             <Card>
               <CardHeader>
                 <CardTitle>Send a Message</CardTitle>
                 <CardDescription>Fill out the form and we'll respond within 24 hours.</CardDescription>
               </CardHeader>
               <CardContent>
                 <form onSubmit={handleSubmit} className="space-y-4">
                   <div className="space-y-2">
                     <Label htmlFor="name">Name</Label>
                     <Input id="name" placeholder="Your name" required />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="email">Email</Label>
                     <Input id="email" type="email" placeholder="your@email.com" required />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="subject">Subject</Label>
                     <Input id="subject" placeholder="How can we help?" required />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="message">Message</Label>
                     <Textarea id="message" placeholder="Your message..." rows={4} required />
                   </div>
                   <Button type="submit" className="w-full" disabled={loading}>
                     {loading ? "Sending..." : "Send Message"}
                   </Button>
                 </form>
               </CardContent>
             </Card>
           </div>
         </div>
       </main>
       <Footer />
     </div>
   );
 };
 
 export default Contact;