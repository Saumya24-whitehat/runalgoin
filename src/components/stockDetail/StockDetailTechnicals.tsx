import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StockDetailTechnicalsProps {
  symbol: string;
}

interface TechnicalData {
  indicator: string;
  value: string | number;
  signal: "buy" | "sell" | "neutral";
}

export const StockDetailTechnicals = ({ symbol }: StockDetailTechnicalsProps) => {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"D" | "W" | "M">("D");
  const [technicals, setTechnicals] = useState<{
    movingAverages: TechnicalData[];
    oscillators: TechnicalData[];
    pivots: { type: string; s1: number; s2: number; s3: number; pivot: number; r1: number; r2: number; r3: number }[];
  }>({
    movingAverages: [],
    oscillators: [],
    pivots: [],
  });

  useEffect(() => {
    const fetchTechnicals = async () => {
      setLoading(true);
      try {
        // Fetch from market-breadth API to get technical data for the stock
        const { data, error } = await supabase.functions.invoke("market-breadth", {
          body: { index: "NIFTY 50" },
        });

        if (data?.content) {
          const stockData = data.content.find((s: any) => s.symbol === symbol);

          if (stockData) {
            // Build technicals from available data
            const movingAverages: TechnicalData[] = [
              {
                indicator: "SMA 5",
                value: stockData.sma5 || "-",
                signal: stockData.ltp > (stockData.sma5 || 0) ? "buy" : "sell",
              },
              {
                indicator: "SMA 10",
                value: stockData.sma10 || "-",
                signal: stockData.ltp > (stockData.sma10 || 0) ? "buy" : "sell",
              },
              {
                indicator: "SMA 20",
                value: stockData.sma20 || "-",
                signal: stockData.ltp > (stockData.sma20 || 0) ? "buy" : "sell",
              },
              {
                indicator: "SMA 50",
                value: stockData.sma50 || "-",
                signal: stockData.ltp > (stockData.sma50 || 0) ? "buy" : "sell",
              },
              {
                indicator: "SMA 100",
                value: stockData.sma100 || "-",
                signal: stockData.ltp > (stockData.sma100 || 0) ? "buy" : "sell",
              },
              {
                indicator: "SMA 200",
                value: stockData.sma200 || "-",
                signal: stockData.ltp > (stockData.sma200 || 0) ? "buy" : "sell",
              },
              {
                indicator: "EMA 5",
                value: stockData.ema5 || "-",
                signal: stockData.ltp > (stockData.ema5 || 0) ? "buy" : "sell",
              },
              {
                indicator: "EMA 10",
                value: stockData.ema10 || "-",
                signal: stockData.ltp > (stockData.ema10 || 0) ? "buy" : "sell",
              },
              {
                indicator: "EMA 20",
                value: stockData.ema20 || "-",
                signal: stockData.ltp > (stockData.ema20 || 0) ? "buy" : "sell",
              },
              {
                indicator: "EMA 50",
                value: stockData.ema50 || "-",
                signal: stockData.ltp > (stockData.ema50 || 0) ? "buy" : "sell",
              },
            ];

            const oscillators: TechnicalData[] = [
              {
                indicator: "RSI (14)",
                value: stockData.rsi || "-",
                signal: (stockData.rsi || 50) > 70 ? "sell" : (stockData.rsi || 50) < 30 ? "buy" : "neutral",
              },
              { indicator: "Stochastic", value: stockData.stoch || "-", signal: "neutral" },
              { indicator: "CCI (20)", value: stockData.cci || "-", signal: "neutral" },
              { indicator: "MFI", value: stockData.mfi || "-", signal: "neutral" },
              { indicator: "ROC", value: stockData.roc || "-", signal: "neutral" },
              { indicator: "Williams %R", value: stockData.wr || "-", signal: "neutral" },
            ];

            const pivots = [
              {
                type: "Classic",
                s1: stockData.pivotS1 || 0,
                s2: stockData.pivotS2 || 0,
                s3: stockData.pivotS3 || 0,
                pivot: stockData.pivot || 0,
                r1: stockData.pivotR1 || 0,
                r2: stockData.pivotR2 || 0,
                r3: stockData.pivotR3 || 0,
              },
            ];

            console.log([movingAverages, oscillators, pivots]);
            setTechnicals({ movingAverages, oscillators, pivots });
          }
        }
      } catch (error) {
        console.error("Error fetching technicals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicals();
  }, [symbol, timeframe]);

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case "buy":
        return "text-emerald-500";
      case "sell":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getSignalBg = (signal: string) => {
    switch (signal) {
      case "buy":
        return "bg-emerald-500/10";
      case "sell":
        return "bg-red-500/10";
      default:
        return "bg-muted";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const buyCount = [...technicals.movingAverages, ...technicals.oscillators].filter((t) => t.signal === "buy").length;
  const sellCount = [...technicals.movingAverages, ...technicals.oscillators].filter((t) => t.signal === "sell").length;
  const neutralCount = [...technicals.movingAverages, ...technicals.oscillators].filter(
    (t) => t.signal === "neutral",
  ).length;

  return (
    <div className="space-y-4">
      {/* Timeframe Selector */}
      <div className="flex gap-2">
        {(["D", "W", "M"] as const).map((tf) => (
          <Button
            key={tf}
            size="sm"
            variant={timeframe === tf ? "default" : "outline"}
            onClick={() => setTimeframe(tf)}
            className="text-xs"
          >
            {tf === "D" ? "Daily" : tf === "W" ? "Weekly" : "Monthly"}
          </Button>
        ))}
      </div>

      {/* Summary */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-foreground">Technical Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-foreground">Buy: {buyCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-muted-foreground"></div>
              <span className="text-sm text-foreground">Neutral: {neutralCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm text-foreground">Sell: {sellCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Moving Averages */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Moving Averages</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {technicals.movingAverages.map((ma, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-1.5 border-b border-border last:border-0"
                >
                  <span className="text-sm text-muted-foreground">{ma.indicator}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-foreground">{ma.value}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${getSignalBg(ma.signal)} ${getSignalColor(ma.signal)}`}
                    >
                      {ma.signal.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Oscillators */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Oscillators</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {technicals.oscillators.map((osc, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-1.5 border-b border-border last:border-0"
                >
                  <span className="text-sm text-muted-foreground">{osc.indicator}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-foreground">{osc.value}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${getSignalBg(osc.signal)} ${getSignalColor(osc.signal)}`}
                    >
                      {osc.signal.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pivot Points */}
      {technicals.pivots.length > 0 && technicals.pivots[0].pivot > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Pivot Points</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-7 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">S3</p>
                <p className="text-sm font-medium text-red-500">{technicals.pivots[0].s3.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">S2</p>
                <p className="text-sm font-medium text-red-400">{technicals.pivots[0].s2.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">S1</p>
                <p className="text-sm font-medium text-red-300">{technicals.pivots[0].s1.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pivot</p>
                <p className="text-sm font-semibold text-foreground">{technicals.pivots[0].pivot.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">R1</p>
                <p className="text-sm font-medium text-emerald-300">{technicals.pivots[0].r1.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">R2</p>
                <p className="text-sm font-medium text-emerald-400">{technicals.pivots[0].r2.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">R3</p>
                <p className="text-sm font-medium text-emerald-500">{technicals.pivots[0].r3.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
