 import { Navbar } from "@/components/Navbar";
 import { TickerRibbon } from "@/components/TickerRibbon";
 import { Footer } from "@/components/Footer";
 
 const PrivacyPolicy = () => {
   return (
     <div className="min-h-screen bg-background flex flex-col">
       <div className="sticky top-0 z-50">
         <TickerRibbon />
         <Navbar />
       </div>
       <main className="flex-1 container mx-auto px-4 py-12">
         <div className="max-w-3xl mx-auto prose prose-invert">
           <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
           <p className="text-muted-foreground mb-6">Last updated: February 5, 2025</p>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
             <p className="text-muted-foreground mb-4">
               We collect information you provide directly to us, such as when you create an account, subscribe to our services, or contact us for support. This includes:
             </p>
             <ul className="list-disc list-inside text-muted-foreground space-y-2">
               <li>Name and email address</li>
               <li>Account credentials</li>
               <li>Payment information (processed securely by our payment providers)</li>
               <li>Usage data and preferences</li>
             </ul>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
             <p className="text-muted-foreground mb-4">
               We use the information we collect to:
             </p>
             <ul className="list-disc list-inside text-muted-foreground space-y-2">
               <li>Provide, maintain, and improve our services</li>
               <li>Process transactions and send related information</li>
               <li>Send technical notices and support messages</li>
               <li>Respond to your comments and questions</li>
               <li>Analyze usage patterns to improve user experience</li>
             </ul>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">3. Data Security</h2>
             <p className="text-muted-foreground">
               We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. All data transmission is encrypted using SSL/TLS protocols.
             </p>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">4. Data Sharing</h2>
             <p className="text-muted-foreground">
               We do not sell, trade, or rent your personal information to third parties. We may share your information only with service providers who assist us in operating our platform, and only as necessary to provide our services.
             </p>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">5. Cookies</h2>
             <p className="text-muted-foreground">
               We use cookies and similar technologies to enhance your experience, analyze usage patterns, and personalize content. You can control cookie preferences through your browser settings.
             </p>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
             <p className="text-muted-foreground mb-4">
               You have the right to:
             </p>
             <ul className="list-disc list-inside text-muted-foreground space-y-2">
               <li>Access and receive a copy of your personal data</li>
               <li>Rectify inaccurate personal data</li>
               <li>Request deletion of your personal data</li>
               <li>Object to processing of your personal data</li>
               <li>Data portability</li>
             </ul>
           </section>
 
           <section className="mb-8">
             <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
             <p className="text-muted-foreground">
               If you have any questions about this Privacy Policy, please contact us at privacy@runalgo.xyz or through our Contact page.
             </p>
           </section>
         </div>
       </main>
       <Footer />
     </div>
   );
 };
 
 export default PrivacyPolicy;