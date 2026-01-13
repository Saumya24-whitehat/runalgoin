import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface JackpotStock {
  symbol: string;
  trend: string;
  ltp: string;
}

interface JackpotData {
  longBuildup: JackpotStock[];
  longUnwinding: JackpotStock[];
  shortBuildup: JackpotStock[];
  shortCovering: JackpotStock[];
}

const JackpotScanner = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<JackpotData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: response, error } = await supabase.functions.invoke("jackpot-scanner");
        if (!error && response) {
          setData(response);
        }
      } catch (err) {
        console.error("Error fetching jackpot data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const renderTable = (stocks: JackpotStock[], title: string, headerBgColor: string) => (
    <Card className="h-full border-border">
      <CardHeader className="p-0">
        <CardTitle
          className="text-center text-white py-2 text-sm font-medium"
          style={{ backgroundColor: headerBgColor }}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground border-b border-border bg-secondary/30">
          <div className="p-2 text-center">Stock</div>
          <div className="p-2 text-center">Trend</div>
          <div className="p-2 text-center">LTP</div>
        </div>
        <ScrollArea className="h-[280px]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : stocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No data</div>
          ) : (
            stocks.map((stock, idx) => (
              <div
                key={idx}
                className="grid grid-cols-3 text-xs border-b border-border/50 hover:bg-secondary/20 transition-colors"
              >
                <div className="p-2 text-center">
                  <a
                    href={`/jackpot-detail?symbol=${stock.symbol}`}
                    className="text-primary underline hover:text-primary/80"
                  >
                    {stock.symbol}
                  </a>
                </div>
                <div className="p-2 text-center text-foreground">{stock.trend}</div>
                <div className="p-2 text-center text-foreground">{parseFloat(stock.ltp).toLocaleString()}</div>
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TickerRibbon />
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Jackpot Scanner</h1>
          <p className="text-muted-foreground">Real-time stock trends based on futures OI and price analysis</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderTable(data?.longBuildup || [], "Long Buildup", "#4a90a4")}
          {renderTable(data?.longUnwinding || [], "Long Unwinding", "#4a90a4")}
          {renderTable(data?.shortBuildup || [], "Short Buildup", "#d4837a")}
          {renderTable(data?.shortCovering || [], "Short Covering", "#7cb987")}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default JackpotScanner;
