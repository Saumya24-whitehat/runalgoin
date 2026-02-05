 import { Navbar } from "@/components/Navbar";
 import { TickerRibbon } from "@/components/TickerRibbon";
 import { Footer } from "@/components/Footer";
 import { Card, CardContent } from "@/components/ui/card";
 import { TrendingUp, Users, Target, Award } from "lucide-react";
 
 const stats = [
   { label: "Active Traders", value: "50,000+", icon: Users },
   { label: "Data Points Analyzed", value: "10M+", icon: TrendingUp },
   { label: "Accuracy Rate", value: "99.9%", icon: Target },
   { label: "Years of Experience", value: "5+", icon: Award },
 ];
 
 const team = [
   {
     name: "Rajesh Gupta",
     role: "Founder & CEO",
     image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
   },
   {
     name: "Sneha Reddy",
     role: "CTO",
     image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
   },
   {
     name: "Arjun Mehta",
     role: "Head of Analytics",
     image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
   },
   {
     name: "Priya Sharma",
     role: "Head of Product",
     image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
   },
 ];
 
 const About = () => {
   return (
     <div className="min-h-screen bg-background flex flex-col">
       <div className="sticky top-0 z-50">
         <TickerRibbon />
         <Navbar />
       </div>
       <main className="flex-1">
         {/* Hero Section */}
         <section className="container mx-auto px-4 py-16">
           <div className="max-w-3xl mx-auto text-center">
             <h1 className="text-4xl md:text-5xl font-bold mb-6">About Runalgo</h1>
             <p className="text-xl text-muted-foreground">
               Empowering retail traders with institutional-grade analytics and tools for the Indian options market.
             </p>
           </div>
         </section>
 
         {/* Stats Section */}
         <section className="container mx-auto px-4 py-12">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             {stats.map((stat, index) => (
               <Card key={index} className="text-center">
                 <CardContent className="pt-6">
                   <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                   <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                   <p className="text-muted-foreground">{stat.label}</p>
                 </CardContent>
               </Card>
             ))}
           </div>
         </section>
 
         {/* Mission Section */}
         <section className="container mx-auto px-4 py-12">
           <div className="max-w-3xl mx-auto">
             <h2 className="text-3xl font-bold mb-6 text-center">Our Mission</h2>
             <p className="text-lg text-muted-foreground mb-4">
               At Runalgo, we believe every trader deserves access to professional-grade tools. Our mission is to democratize options analytics and give retail traders the same edge that institutions have.
             </p>
             <p className="text-lg text-muted-foreground">
               Founded in 2020, we've grown from a small team of traders and developers to a platform serving thousands of active traders across India. We're committed to continuous innovation and delivering the most accurate, real-time data for informed trading decisions.
             </p>
           </div>
         </section>
 
         {/* Team Section */}
         <section className="container mx-auto px-4 py-12">
           <h2 className="text-3xl font-bold mb-8 text-center">Our Team</h2>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
             {team.map((member, index) => (
               <div key={index} className="text-center">
                 <img
                   src={member.image}
                   alt={member.name}
                   className="w-24 h-24 rounded-full mx-auto mb-3 object-cover"
                 />
                 <h3 className="font-semibold">{member.name}</h3>
                 <p className="text-sm text-muted-foreground">{member.role}</p>
               </div>
             ))}
           </div>
         </section>
       </main>
       <Footer />
     </div>
   );
 };
 
 export default About;