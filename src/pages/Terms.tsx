 import { Navbar } from "@/components/Navbar";
 import { TickerRibbon } from "@/components/TickerRibbon";
 import { Footer } from "@/components/Footer";
 
 const Terms = () => {
   return (
     <div className="min-h-screen bg-background flex flex-col">
       <div className="sticky top-0 z-50">
         <TickerRibbon />
         <Navbar />
       </div>
       <main className="flex-1 container mx-auto px-4 py-12">
         <div className="max-w-3xl mx-auto prose prose-invert">
           <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
           <p className="text-muted-foreground mb-6">Last updated: February 5, 2025</p>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
             <p className="text-muted-foreground">
               By accessing and using OptionWorld ("the Service"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our Service.
             </p>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
             <p className="text-muted-foreground">
               OptionWorld provides options analytics tools, market data visualization, and trading insights for the Indian stock market. Our platform offers real-time data, charts, and analysis tools to help traders make informed decisions.
             </p>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
             <p className="text-muted-foreground mb-4">
               To access certain features, you must create an account. You agree to:
             </p>
             <ul className="list-disc list-inside text-muted-foreground space-y-2">
               <li>Provide accurate and complete information</li>
               <li>Maintain the security of your account credentials</li>
               <li>Notify us immediately of any unauthorized access</li>
               <li>Accept responsibility for all activities under your account</li>
             </ul>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">4. Subscription and Payments</h2>
             <p className="text-muted-foreground">
               Paid subscriptions are billed on a recurring basis. You may cancel your subscription at any time, and access will continue until the end of the current billing period. Refunds are provided as per our refund policy.
             </p>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">5. Disclaimer</h2>
             <p className="text-muted-foreground">
               The information provided on OptionWorld is for educational and informational purposes only. It does not constitute financial advice, trading recommendations, or an offer to buy or sell securities. Trading involves substantial risk of loss. You should consult with a qualified financial advisor before making any investment decisions.
             </p>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
             <p className="text-muted-foreground">
               OptionWorld shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use our services, including but not limited to trading losses, data loss, or business interruption.
             </p>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
             <p className="text-muted-foreground">
               All content, features, and functionality of the Service are owned by OptionWorld and are protected by international copyright, trademark, and other intellectual property laws.
             </p>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">8. Prohibited Uses</h2>
             <p className="text-muted-foreground mb-4">
               You agree not to:
             </p>
             <ul className="list-disc list-inside text-muted-foreground space-y-2">
               <li>Use the Service for any unlawful purpose</li>
               <li>Attempt to gain unauthorized access to our systems</li>
               <li>Scrape, copy, or redistribute our data without permission</li>
               <li>Interfere with the proper working of the Service</li>
               <li>Share your account credentials with others</li>
             </ul>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">9. Changes to Terms</h2>
             <p className="text-muted-foreground">
               We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the Service. Your continued use of the Service after changes constitutes acceptance of the new terms.
             </p>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
             <p className="text-muted-foreground">
               For any questions regarding these Terms of Service, please contact us at legal@runalgo.xyz.
             </p>
           </section>
         </div>
       </main>
       <Footer />
     </div>
   );
 };
 
 export default Terms;