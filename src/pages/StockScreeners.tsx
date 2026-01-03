import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";

const StockScreeners = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <TickerRibbon />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Stock Screeners</h1>
          <p className="text-muted-foreground">Advanced stock screening and analysis tools</p>
        </div>
        
        <div className="w-full rounded-lg overflow-hidden border border-border bg-card">
          <iframe
            src="http://runalgo.xyz:5000/"
            className="w-full h-[calc(100vh-220px)] min-h-[600px]"
            title="Stock Screeners"
            frameBorder="0"
            allowFullScreen
          />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StockScreeners;
