 import { Navbar } from "@/components/Navbar";
 import { TickerRibbon } from "@/components/TickerRibbon";
 import { Footer } from "@/components/Footer";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Book, Code, Database, LineChart, Settings, Shield } from "lucide-react";
 
 const docs = [
   {
     icon: LineChart,
     title: "Option Chain Analysis",
     description: "Learn how to read and interpret option chain data for better trading decisions.",
   },
   {
     icon: Database,
     title: "Market Data APIs",
     description: "Integrate real-time market data into your trading strategies.",
   },
   {
     icon: Code,
     title: "Algo Trading Setup",
     description: "Step-by-step guide to setting up automated trading systems.",
   },
   {
     icon: Shield,
     title: "Risk Management",
     description: "Best practices for managing risk in options trading.",
   },
   {
     icon: Settings,
     title: "Platform Configuration",
     description: "Customize your dashboard and trading preferences.",
   },
   {
     icon: Book,
     title: "Getting Started",
     description: "New to Runalgo? Start here for a complete walkthrough.",
   },
 ];
 
 const Documentation = () => {
   return (
     <div className="min-h-screen bg-background flex flex-col">
       <div className="sticky top-0 z-50">
         <TickerRibbon />
         <Navbar />
       </div>
       <main className="flex-1 container mx-auto px-4 py-12">
         <div className="max-w-4xl mx-auto">
           <h1 className="text-4xl font-bold mb-4">Documentation</h1>
           <p className="text-muted-foreground text-lg mb-8">
             Everything you need to master options trading with Runalgo.
           </p>
           <div className="grid md:grid-cols-2 gap-6">
             {docs.map((doc, index) => (
               <Card key={index} className="hover:border-primary/50 transition-colors cursor-pointer">
                 <CardHeader className="flex flex-row items-center gap-4">
                   <div className="p-2 rounded-lg bg-primary/10">
                     <doc.icon className="h-6 w-6 text-primary" />
                   </div>
                   <CardTitle className="text-lg">{doc.title}</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <p className="text-muted-foreground">{doc.description}</p>
                 </CardContent>
               </Card>
             ))}
           </div>
         </div>
       </main>
       <Footer />
     </div>
   );
 };
 
 export default Documentation;