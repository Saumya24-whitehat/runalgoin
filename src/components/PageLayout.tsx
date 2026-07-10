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
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <div
        className="sticky top-0 z-50"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <TickerRibbon />
        <Navbar />
      </div>
      <main className="flex-1 w-full max-w-full overflow-x-hidden pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>
      {showFooter && (
        <div className="hidden lg:block">
          <Footer />
        </div>
      )}
    </div>
  );
}

