import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMarketBreadthData, calculateAdvanceDecline, StockData } from "@/services/marketBreadthApi";
import { TrendingUp, TrendingDown, Minus, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketBreadthCardProps {
  symbol: string;
}

// Map common symbol names to market breadth API symbols
const symbolToBreadthMapping: Record<string, string> = {
  "NIFTY": "SYML:NSE;NIFTY",
  "BANKNIFTY": "SYML:NSE;BANKNIFTY",
  "FINNIFTY": "SYML:NSE;CNXFINANCE",
  "MIDCPNIFTY": "SYML:NSE;NIFTYMIDCAP50",
  "SENSEX": "SYML:BSE;SENSEX",
};

export const MarketBreadthCard = ({ symbol }: MarketBreadthCardProps) => {
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [advances, setAdvances] = useState(0);
  const [declines, setDeclines] = useState(0);
  const [unchanged, setUnchanged] = useState(0);

  useEffect(() => {
    const loadBreadthData = async () => {
      setLoading(true);
      try {
        // Map the symbol to breadth API format
        const breadthSymbol = symbolToBreadthMapping[symbol] || `SYML:NSE;${symbol}`;
        const data = await fetchMarketBreadthData(breadthSymbol);
        
        if (data?.content) {
          setStocks(data.content);
          const { advances: adv, declines: dec, unchanged: unc } = calculateAdvanceDecline(data.content);
          setAdvances(adv);
          setDeclines(dec);
          setUnchanged(unc);
        }
      } catch (err) {
        console.error("Error fetching market breadth:", err);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      loadBreadthData();
    }
  }, [symbol]);

  const total = advances + declines + unchanged;
  const advancePercent = total > 0 ? (advances / total) * 100 : 0;
  const declinePercent = total > 0 ? (declines / total) * 100 : 0;
  const advDecRatio = declines > 0 ? (advances / declines).toFixed(2) : advances > 0 ? "∞" : "0";

  // Get top gainers and losers
  const sortedStocks = [...stocks].sort((a, b) => b.changePct - a.changePct);
  const topGainers = sortedStocks.filter(s => s.changePct > 0).slice(0, 3);
  const topLosers = sortedStocks.filter(s => s.changePct < 0).slice(-3).reverse();

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart className="h-4 w-4 text-primary" />
            Market Breadth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground text-sm py-4">
            No breadth data available for {symbol}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart className="h-4 w-4 text-primary" />
          Market Breadth
          <span className="text-xs text-muted-foreground font-normal">({total} stocks)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Advance/Decline Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-success flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Advances: {advances} ({advancePercent.toFixed(1)}%)
            </span>
            <span className="text-destructive flex items-center gap-1">
              Declines: {declines} ({declinePercent.toFixed(1)}%)
              <TrendingDown className="h-3 w-3" />
            </span>
          </div>
          <div className="h-4 flex rounded-full overflow-hidden bg-muted">
            <div 
              className="bg-success transition-all duration-500" 
              style={{ width: `${advancePercent}%` }}
            />
            {unchanged > 0 && (
              <div 
                className="bg-muted-foreground/30" 
                style={{ width: `${(unchanged / total) * 100}%` }}
              />
            )}
            <div 
              className="bg-destructive transition-all duration-500" 
              style={{ width: `${declinePercent}%` }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-success/10 rounded-lg p-2">
            <div className="text-lg font-bold text-success">{advances}</div>
            <div className="text-[10px] text-muted-foreground">Advancing</div>
          </div>
          <div className="bg-muted rounded-lg p-2">
            <div className="text-lg font-bold text-foreground">{advDecRatio}</div>
            <div className="text-[10px] text-muted-foreground">A/D Ratio</div>
          </div>
          <div className="bg-destructive/10 rounded-lg p-2">
            <div className="text-lg font-bold text-destructive">{declines}</div>
            <div className="text-[10px] text-muted-foreground">Declining</div>
          </div>
        </div>

        {/* Top Gainers/Losers */}
        <div className="grid grid-cols-2 gap-3">
          {/* Top Gainers */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-success flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Top Gainers
            </div>
            {topGainers.map((stock, i) => (
              <div key={i} className="flex justify-between text-[10px] bg-success/5 rounded px-2 py-1">
                <span className="truncate max-w-[60%]">{stock.name}</span>
                <span className="text-success font-medium">+{(stock.changePct * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          {/* Top Losers */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-destructive flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Top Losers
            </div>
            {topLosers.map((stock, i) => (
              <div key={i} className="flex justify-between text-[10px] bg-destructive/5 rounded px-2 py-1">
                <span className="truncate max-w-[60%]">{stock.name}</span>
                <span className="text-destructive font-medium">{(stock.changePct * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
