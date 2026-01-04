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
    pivots: {
      type: string;
      s1: number;
      s2: number;
      s3: number;
      pivot: number;
      r1: number;
      r2: number;
      r3: number;
    }[];
  }>({
    movingAverages: [],
    oscillators: [],
    pivots: [],
  });

  useEffect(() => {
    const fetchTechnicals = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("market-breadth", {
          body: { index: "NIFTY 50" },
        });

        const stockData = data?.[0]?.content?.find((s: any) => s.name === symbol);
        if (!stockData) return;

        const movingAverages: TechnicalData[] = [
          {
            indicator: "SMA 20",
            value: stockData.SMA20 || "-",
            signal: stockData.close > (stockData.SMA20 || 0) ? "buy" : "sell",
          },
          {
            indicator: "SMA 50",
            value: stockData.SMA50 || "-",
            signal: stockData.close > (stockData.SMA50 || 0) ? "buy" : "sell",
          },
          {
            indicator: "SMA 100",
            value: stockData.SMA100 || "-",
            signal: stockData.close > (stockData.SMA100 || 0) ? "buy" : "sell",
          },
          {
            indicator: "SMA 200",
            value: stockData.SMA200 || "-",
            signal: stockData.close > (stockData.SMA200 || 0) ? "buy" : "sell",
          },
          {
            indicator: "EMA 20",
            value: stockData.EMA20 || "-",
            signal: stockData.close > (stockData.EMA20 || 0) ? "buy" : "sell",
          },
          {
            indicator: "EMA 50",
            value: stockData.EMA50 || "-",
            signal: stockData.close > (stockData.EMA50 || 0) ? "buy" : "sell",
          },
          {
            indicator: "EMA 100",
            value: stockData.EMA100 || "-",
            signal: stockData.close > (stockData.EMA100 || 0) ? "buy" : "sell",
          },
          {
            indicator: "EMA 200",
            value: stockData.EMA200 || "-",
            signal: stockData.close > (stockData.EMA200 || 0) ? "buy" : "sell",
          },
        ];

        const oscillators: TechnicalData[] = [
          {
            indicator: "RSI (14)",
            value: stockData.RSI?.toFixed(2) || "-",
            signal: stockData.RSI > 70 ? "sell" : stockData.RSI < 30 ? "buy" : "neutral",
          },
          {
            indicator: "Stochastic",
            value: `${stockData["Stoch.D_14_1_3"]?.toFixed(2)} / ${stockData["Stoch.K_14_1_3"]?.toFixed(2)}`,
            signal: stockData["Stoch.D_14_1_3"] > stockData["Stoch.K_14_1_3"] ? "buy" : "sell",
          },
          { indicator: "CCI (20)", value: stockData.CCI20?.toFixed(2) || "-", signal: "neutral" },
          { indicator: "MFI", value: stockData.MoneyFlow?.toFixed(2) || "-", signal: "neutral" },
          { indicator: "ROC", value: stockData.ROC?.toFixed(2) || "-", signal: "neutral" },
          { indicator: "Williams %R", value: stockData["W.R"]?.toFixed(2) || "-", signal: "neutral" },
        ];

        const pivots = [
          {
            type: "Classic",
            s1: stockData.pivotS1,
            s2: stockData.pivotS2,
            s3: stockData.pivotS3,
            pivot: stockData.pivot,
            r1: stockData.pivotR1,
            r2: stockData.pivotR2,
            r3: stockData.pivotR3,
          },
        ];

        setTechnicals({ movingAverages, oscillators, pivots });
      } catch (error) {
        console.error("Error fetching technicals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicals();
  }, [symbol, timeframe]);

  const getSignalColor = (signal: string) => {
    if (signal === "buy") return "text-emerald-500";
    if (signal === "sell") return "text-red-500";
    return "text-muted-foreground";
  };

  const getSignalBg = (signal: string) => {
    if (signal === "buy") return "bg-emerald-500/10";
    if (signal === "sell") return "bg-red-500/10";
    return "bg-muted/20";
  };

  const buyCount = [...technicals.movingAverages, ...technicals.oscillators].filter((x) => x.signal === "buy").length;
  const sellCount = [...technicals.movingAverages, ...technicals.oscillators].filter((x) => x.signal === "sell").length;
  const neutralCount = [...technicals.movingAverages, ...technicals.oscillators].filter(
    (x) => x.signal === "neutral",
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ------------------ GAUGE COMPONENT ------------------
  const Gauge = ({ label, sell, neutral, buy }: any) => {
    const total = sell + neutral + buy;
    const percent = total ? (buy / total) * 100 : 50;

    return (
      <div className="flex flex-col items-center w-full">
        <p className="text-sm text-muted-foreground mb-2">{label}</p>

        <div className="relative w-40 h-20">
          <svg viewBox="0 0 100 50" className="w-full h-full">
            <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="#6b7280" strokeWidth="8" strokeLinecap="round" />
            <path
              d="M10 50 A40 40 0 0 1 90 50"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${percent * 1.25}, 500`}
            />
          </svg>

          <div
            className="absolute bottom-0 left-1/2 w-1 h-16 bg-white origin-bottom"
            style={{ transform: `rotate(${(percent / 100) * 180 - 90}deg)` }}
          />
        </div>

        <p className="text-center text-lg mt-1 font-semibold">{buy > sell ? "Buy" : sell > buy ? "Sell" : "Neutral"}</p>

        <div className="flex gap-6 mt-1 text-xs">
          <div className="text-center">
            <p className="text-muted-foreground">Sell</p>
            <p>{sell}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Neutral</p>
            <p>{neutral}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Buy</p>
            <p>{buy}</p>
          </div>
        </div>
      </div>
    );
  };

  // ------------------ UI START ------------------

  return (
    <div className="space-y-4">
      {/* Timeframe Buttons */}
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

      {/* GAUGES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border p-4">
          <Gauge label="Oscillators" sell={sellCount} neutral={neutralCount} buy={buyCount} />
        </Card>

        <Card className="bg-card border-border p-4">
          <Gauge label="Summary" sell={sellCount} neutral={neutralCount} buy={buyCount} />
        </Card>

        <Card className="bg-card border-border p-4">
          <Gauge label="Moving Averages" sell={sellCount} neutral={neutralCount} buy={buyCount} />
        </Card>
      </div>

      {/* TABLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Oscillators */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-md">Oscillators</CardTitle>
          </CardHeader>
          <CardContent>
            {technicals.oscillators.map((osc, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{osc.indicator}</span>
                <div className="flex items-center gap-3">
                  <span>{osc.value}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${getSignalBg(osc.signal)} ${getSignalColor(osc.signal)}`}
                  >
                    {osc.signal.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Moving Averages */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-md">Moving Averages</CardTitle>
          </CardHeader>
          <CardContent>
            {technicals.movingAverages.map((ma, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{ma.indicator}</span>
                <div className="flex items-center gap-3">
                  <span>{typeof ma.value === "number" ? ma.value.toFixed(2) : ma.value}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${getSignalBg(ma.signal)} ${getSignalColor(ma.signal)}`}
                  >
                    {ma.signal.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* PIVOT LEVELS */}
      {technicals.pivots.length > 0 && technicals.pivots[0].pivot > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-md">Pivot Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center">
              {["s3", "s2", "s1", "pivot", "r1", "r2", "r3"].map((key) => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground uppercase">{key}</p>
                  <p className="text-sm font-semibold">
                    {technicals.pivots[0][key as keyof (typeof technicals.pivots)[0]]?.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
