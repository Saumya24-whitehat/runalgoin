 import { Navbar } from "@/components/Navbar";
 import { TickerRibbon } from "@/components/TickerRibbon";
 import { Footer } from "@/components/Footer";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { MapPin, Clock, Briefcase } from "lucide-react";
 
 const jobs = [
   {
     title: "Senior Frontend Developer",
     department: "Engineering",
     location: "Mumbai / Remote",
     type: "Full-time",
     experience: "5+ years",
     description: "Build and maintain our trading dashboard using React, TypeScript, and modern web technologies.",
   },
   {
     title: "Backend Engineer",
     department: "Engineering",
     location: "Mumbai / Remote",
     type: "Full-time",
     experience: "3+ years",
     description: "Design and implement scalable APIs and data pipelines for real-time market data processing.",
   },
   {
     title: "Quantitative Analyst",
     department: "Analytics",
     location: "Mumbai",
     type: "Full-time",
     experience: "4+ years",
     description: "Develop trading models and analytics features for options trading strategies.",
   },
   {
     title: "Product Manager",
     department: "Product",
     location: "Mumbai",
     type: "Full-time",
     experience: "3+ years",
     description: "Lead product development and work closely with traders to build features they love.",
   },
   {
     title: "Customer Success Manager",
     department: "Support",
     location: "Remote",
     type: "Full-time",
     experience: "2+ years",
     description: "Help our traders succeed by providing excellent support and training.",
   },
 ];
 
 const Careers = () => {
   return (
     <div className="min-h-screen bg-background flex flex-col">
       <div className="sticky top-0 z-50">
         <TickerRibbon />
         <Navbar />
       </div>
       <main className="flex-1 container mx-auto px-4 py-12">
         <div className="max-w-4xl mx-auto">
           <div className="text-center mb-12">
             <h1 className="text-4xl font-bold mb-4">Join Our Team</h1>
             <p className="text-xl text-muted-foreground">
               Help us build the future of options trading analytics in India.
             </p>
           </div>
 
           <div className="space-y-6">
             {jobs.map((job, index) => (
               <Card key={index} className="hover:border-primary/50 transition-colors">
                 <CardHeader>
                   <div className="flex flex-wrap items-start justify-between gap-4">
                     <div>
                       <CardTitle className="text-xl">{job.title}</CardTitle>
                       <CardDescription>{job.department}</CardDescription>
                     </div>
                     <Button>Apply Now</Button>
                   </div>
                 </CardHeader>
                 <CardContent>
                   <p className="text-muted-foreground mb-4">{job.description}</p>
                   <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                     <span className="flex items-center gap-1">
                       <MapPin className="h-4 w-4" />
                       {job.location}
                     </span>
                     <span className="flex items-center gap-1">
                       <Clock className="h-4 w-4" />
                       {job.type}
                     </span>
                     <span className="flex items-center gap-1">
                       <Briefcase className="h-4 w-4" />
                       {job.experience}
                     </span>
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
 
           <div className="mt-12 text-center">
             <p className="text-muted-foreground mb-4">
               Don't see a role that fits? We're always looking for talented people.
             </p>
             <Button variant="outline">Send General Application</Button>
           </div>
         </div>
       </main>
       <Footer />
     </div>
   );
 };
 
 export default Careers;