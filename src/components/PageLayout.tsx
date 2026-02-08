import { ReactNode } from "react";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface PageLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export function PageLayout({ children, showFooter = true }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>
      <main className="flex-1">{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}
