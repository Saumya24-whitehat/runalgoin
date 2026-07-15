 import { Navbar } from "@/components/Navbar";
 import { TickerRibbon } from "@/components/TickerRibbon";
 import { Footer } from "@/components/Footer";
 import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
 import { SEO } from "@/components/SEO";
 
 const faqs = [
   {
     question: "What is OptionWorld?",
     answer: "OptionWorld is an advanced options analytics platform designed for Indian markets. We provide real-time data, technical analysis tools, and trading insights to help you make informed trading decisions.",
   },
   {
     question: "How accurate is the data?",
     answer: "We source our data directly from NSE and BSE with minimal latency. Our data is updated in real-time during market hours and is highly accurate for options chain, PCR, OI analysis, and other metrics.",
   },
   {
     question: "What subscription plans are available?",
     answer: "We offer Free, Pro, and Business plans. The Free plan includes basic features, while Pro and Business plans unlock advanced analytics, real-time data, and priority support. Visit our Plans page for detailed pricing.",
   },
   {
     question: "Can I use OptionWorld on mobile?",
     answer: "Yes! OptionWorld is fully responsive and works seamlessly on mobile devices, tablets, and desktops. Access your trading dashboard from anywhere.",
   },
   {
     question: "How do I cancel my subscription?",
     answer: "You can cancel your subscription anytime from your Profile settings. Your access will continue until the end of your billing period.",
   },
   {
     question: "Is my data secure?",
     answer: "Absolutely. We use industry-standard encryption and security practices. We never store your trading credentials and all data transmission is encrypted.",
   },
   {
     question: "Do you provide trading recommendations?",
     answer: "We provide data, analytics, and tools to help you make informed decisions. However, we do not provide specific buy/sell recommendations. All trading decisions should be made based on your own analysis and risk tolerance.",
   },
   {
     question: "How can I contact support?",
     answer: "You can reach our support team via email at support@runalgo.xyz or through the Contact page. Pro and Business subscribers get priority support with faster response times.",
   },
 ];
 
 const FAQ = () => {
   const faqSchema = {
     "@context": "https://schema.org",
     "@type": "FAQPage",
     mainEntity: faqs.map((f) => ({
       "@type": "Question",
       name: f.question,
       acceptedAnswer: { "@type": "Answer", text: f.answer },
     })),
   };
   return (
     <div className="min-h-screen bg-background flex flex-col">
       <SEO
         title="FAQ — OptionWorld Options Analytics"
         description="Answers to common questions about OptionWorld's options analytics platform, data accuracy, plans, and support for Indian NSE traders."
         path="/faq"
         jsonLd={faqSchema}
       />
       <div className="sticky top-0 z-50">
         <TickerRibbon />
         <Navbar />
       </div>
       <main className="flex-1 container mx-auto px-4 py-12">
         <div className="max-w-3xl mx-auto">
           <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
           <p className="text-muted-foreground text-lg mb-8">
             Find answers to common questions about OptionWorld.
           </p>
           <Accordion type="single" collapsible className="w-full">
             {faqs.map((faq, index) => (
               <AccordionItem key={index} value={`item-${index}`}>
                 <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                 <AccordionContent className="text-muted-foreground">
                   {faq.answer}
                 </AccordionContent>
               </AccordionItem>
             ))}
           </Accordion>
         </div>
       </main>
       <Footer />
     </div>
   );
 };
 
 export default FAQ;