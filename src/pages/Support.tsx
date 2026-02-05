 import { Navbar } from "@/components/Navbar";
 import { TickerRibbon } from "@/components/TickerRibbon";
 import { Footer } from "@/components/Footer";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Textarea } from "@/components/ui/textarea";
 import { Label } from "@/components/ui/label";
 import { Mail, MessageSquare, Phone, Clock } from "lucide-react";
 import { useState } from "react";
 import { useToast } from "@/hooks/use-toast";
 
 const Support = () => {
   const { toast } = useToast();
   const [loading, setLoading] = useState(false);
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     setLoading(true);
     setTimeout(() => {
       setLoading(false);
       toast({
         title: "Message Sent",
         description: "We'll get back to you within 24 hours.",
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
           <h1 className="text-4xl font-bold mb-4">Support</h1>
           <p className="text-muted-foreground text-lg mb-8">
             We're here to help. Choose how you'd like to reach us.
           </p>
 
           <div className="grid md:grid-cols-3 gap-6 mb-12">
             <Card>
               <CardHeader>
                 <Mail className="h-8 w-8 text-primary mb-2" />
                 <CardTitle>Email</CardTitle>
                 <CardDescription>support@runalgo.xyz</CardDescription>
               </CardHeader>
               <CardContent>
                 <p className="text-sm text-muted-foreground">Response within 24 hours</p>
               </CardContent>
             </Card>
             <Card>
               <CardHeader>
                 <Phone className="h-8 w-8 text-primary mb-2" />
                 <CardTitle>Phone</CardTitle>
                 <CardDescription>+91 98765 43210</CardDescription>
               </CardHeader>
               <CardContent>
                 <p className="text-sm text-muted-foreground">Mon-Fri, 9AM-6PM IST</p>
               </CardContent>
             </Card>
             <Card>
               <CardHeader>
                 <MessageSquare className="h-8 w-8 text-primary mb-2" />
                 <CardTitle>Live Chat</CardTitle>
                 <CardDescription>Chat with us</CardDescription>
               </CardHeader>
               <CardContent>
                 <p className="text-sm text-muted-foreground">Available during market hours</p>
               </CardContent>
             </Card>
           </div>
 
           <Card className="max-w-2xl mx-auto">
             <CardHeader>
               <CardTitle>Send us a message</CardTitle>
               <CardDescription>Fill out the form below and we'll get back to you.</CardDescription>
             </CardHeader>
             <CardContent>
               <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="name">Name</Label>
                     <Input id="name" placeholder="Your name" required />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="email">Email</Label>
                     <Input id="email" type="email" placeholder="your@email.com" required />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="subject">Subject</Label>
                   <Input id="subject" placeholder="How can we help?" required />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="message">Message</Label>
                   <Textarea id="message" placeholder="Describe your issue or question..." rows={5} required />
                 </div>
                 <Button type="submit" className="w-full" disabled={loading}>
                   {loading ? "Sending..." : "Send Message"}
                 </Button>
               </form>
             </CardContent>
           </Card>
         </div>
       </main>
       <Footer />
     </div>
   );
 };
 
 export default Support;