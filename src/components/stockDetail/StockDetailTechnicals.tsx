import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StockDetailTechnicalsProps {
  symbol: string;
}

interface TechnicalData {
  indicator: string;
  value: string | number;
  signal: "buy" | "sell" | "neutral";
}

interface PivotData {
  type: string;
  s1: number;
  s2: number;
  s3: number;
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
}

interface PerformanceData {
  period: string;
  value: number;
}

interface TechnicalState {
  movingAverages: TechnicalData[];
  oscillators: TechnicalData[];
  pivots: PivotData[];
  performance: PerformanceData[];
  volatility: { period: string; value: number }[];
  priceRanges: { period: string; high: number; low: number }[];
  bollingerBands: { upper: number; basis: number; lower: number } | null;
  ichimoku: { bLine: number; cLine: number; lead1: number; lead2: number } | null;
  sar: number | null;
  close: number;
}

export const StockDetailTechnicals = ({ symbol }: StockDetailTechnicalsProps) => {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"D" | "W" | "M">("D");
  const [technicals, setTechnicals] = useState<TechnicalState>({
    movingAverages: [],
    oscillators: [],
    pivots: [],
    performance: [],
    volatility: [],
    priceRanges: [],
    bollingerBands: null,
    ichimoku: null,
    sar: null,
    close: 0,
  });

  useEffect(() => {
    const fetchTechnicals = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("market-breadth", {
          body: { index: "All" },
        });

        const stockData = data?.[0]?.content?.find((s: any) => s.name === symbol);
        if (!stockData) return;

        const close = stockData.close || 0;

        const movingAverages: TechnicalData[] = [
          {
            indicator: "SMA 20",
            value: stockData.SMA20 || "-",
            signal: close > (stockData.SMA20 || 0) ? "buy" : "sell",
          },
          {
            indicator: "SMA 50",
            value: stockData.SMA50 || "-",
            signal: close > (stockData.SMA50 || 0) ? "buy" : "sell",
          },
          {
            indicator: "SMA 100",
            value: stockData.SMA100 || "-",
            signal: close > (stockData.SMA100 || 0) ? "buy" : "sell",
          },
          {
            indicator: "SMA 200",
            value: stockData.SMA200 || "-",
            signal: close > (stockData.SMA200 || 0) ? "buy" : "sell",
          },
          {
            indicator: "EMA 20",
            value: stockData.EMA20 || "-",
            signal: close > (stockData.EMA20 || 0) ? "buy" : "sell",
          },
          {
            indicator: "EMA 50",
            value: stockData.EMA50 || "-",
            signal: close > (stockData.EMA50 || 0) ? "buy" : "sell",
          },
          {
            indicator: "EMA 100",
            value: stockData.EMA100 || "-",
            signal: close > (stockData.EMA100 || 0) ? "buy" : "sell",
          },
          {
            indicator: "EMA 200",
            value: stockData.EMA200 || "-",
            signal: close > (stockData.EMA200 || 0) ? "buy" : "sell",
          },
        ];

        const rsi = stockData.RSI;
        const stochK = stockData["Stoch.K_14_1_3"];
        const stochD = stockData["Stoch.D_14_1_3"];
        const cci = stockData.CCI20;
        const mfi = stockData.MoneyFlow;
        const wr = stockData["W.R"];

        const oscillators: TechnicalData[] = [
          {
            indicator: "RSI (14)",
            value: rsi?.toFixed(2) || "-",
            signal: rsi > 70 ? "sell" : rsi < 30 ? "buy" : "neutral",
          },
          {
            indicator: "Stochastic %K",
            value: stochK?.toFixed(2) || "-",
            signal: stochK > 80 ? "sell" : stochK < 20 ? "buy" : "neutral",
          },
          {
            indicator: "Stochastic %D",
            value: stochD?.toFixed(2) || "-",
            signal: stochD > 80 ? "sell" : stochD < 20 ? "buy" : "neutral",
          },
          {
            indicator: "CCI (20)",
            value: cci?.toFixed(2) || "-",
            signal: cci > 100 ? "sell" : cci < -100 ? "buy" : "neutral",
          },
          { indicator: "MFI", value: mfi?.toFixed(2) || "-", signal: mfi > 80 ? "sell" : mfi < 20 ? "buy" : "neutral" },
          {
            indicator: "ROC",
            value: stockData.ROC?.toFixed(2) || "-",
            signal: stockData.ROC > 0 ? "buy" : stockData.ROC < 0 ? "sell" : "neutral",
          },
          {
            indicator: "Williams %R",
            value: wr?.toFixed(2) || "-",
            signal: wr > -20 ? "sell" : wr < -80 ? "buy" : "neutral",
          },
        ];

        const pivots: PivotData[] = [
          {
            type: "Classic",
            s1: stockData["Pivot.M.Classic.S1"],
            s2: stockData["Pivot.M.Classic.S2"],
            s3: stockData["Pivot.M.Classic.S3"],
            pivot: stockData["Pivot.M.Classic.Middle"],
            r1: stockData["Pivot.M.Classic.R1"],
            r2: stockData["Pivot.M.Classic.R2"],
            r3: stockData["Pivot.M.Classic.R3"],
          },
          {
            type: "Fibonacci",
            s1: stockData["Pivot.M.Fibonacci.S1"],
            s2: stockData["Pivot.M.Fibonacci.S2"],
            s3: stockData["Pivot.M.Fibonacci.S3"],
            pivot: stockData["Pivot.M.Fibonacci.Middle"],
            r1: stockData["Pivot.M.Fibonacci.R1"],
            r2: stockData["Pivot.M.Fibonacci.R2"],
            r3: stockData["Pivot.M.Fibonacci.R3"],
          },
          {
            type: "Camarilla",
            s1: stockData["Pivot.M.Camarilla.S1"],
            s2: stockData["Pivot.M.Camarilla.S2"],
            s3: stockData["Pivot.M.Camarilla.S3"],
            pivot: stockData["Pivot.M.Camarilla.Middle"],
            r1: stockData["Pivot.M.Camarilla.R1"],
            r2: stockData["Pivot.M.Camarilla.R2"],
            r3: stockData["Pivot.M.Camarilla.R3"],
          },
          {
            type: "Woodie",
            s1: stockData["Pivot.M.Woodie.S1"],
            s2: stockData["Pivot.M.Woodie.S2"],
            s3: stockData["Pivot.M.Woodie.S3"],
            pivot: stockData["Pivot.M.Woodie.Middle"],
            r1: stockData["Pivot.M.Woodie.R1"],
            r2: stockData["Pivot.M.Woodie.R2"],
            r3: stockData["Pivot.M.Woodie.R3"],
          },
        ];

        const performance: PerformanceData[] = [
          { period: "1 Week", value: stockData["Perf.W"] },
          { period: "1 Month", value: stockData["Perf.1M"] },
          { period: "3 Months", value: stockData["Perf.3M"] },
          { period: "6 Months", value: stockData["Perf.6M"] },
          { period: "YTD", value: stockData["Perf.YTD"] },
          { period: "1 Year", value: stockData["Perf.Y"] },
          { period: "5 Years", value: stockData["Perf.5Y"] },
          { period: "10 Years", value: stockData["Perf.10Y"] },
        ].filter((p) => p.value !== undefined);

        const volatility = [
          { period: "Weekly", value: stockData["Volatility.W"] },
          { period: "Monthly", value: stockData["Volatility.M"] },
        ].filter((v) => v.value !== undefined);

        const priceRanges = [
          { period: "1 Month", high: stockData["High.1M"], low: stockData["Low.1M"] },
          { period: "3 Months", high: stockData["High.3M"], low: stockData["Low.3M"] },
          { period: "6 Months", high: stockData["High.6M"], low: stockData["Low.6M"] },
          { period: "52 Week", high: stockData.price_52_week_high, low: stockData.price_52_week_low },
          { period: "All Time", high: stockData["High.All"], low: stockData["Low.All"] },
        ].filter((r) => r.high && r.low);

        const bollingerBands = stockData["BB.upper"]
          ? {
              upper: stockData["BB.upper"],
              basis: stockData["BB.basis"],
              lower: stockData["BB.lower"],
            }
          : null;

        const ichimoku = stockData["Ichimoku.BLine"]
          ? {
              bLine: stockData["Ichimoku.BLine"],
              cLine: stockData["Ichimoku.CLine"],
              lead1: stockData["Ichimoku.Lead1"],
              lead2: stockData["Ichimoku.Lead2"],
            }
          : null;

        setTechnicals({
          movingAverages,
          oscillators,
          pivots,
          performance,
          volatility,
          priceRanges,
          bollingerBands,
          ichimoku,
          sar: stockData["P.SAR"],
          close,
        });
      } catch (error) {
        console.error("Error fetching technicals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicals();
  }, [symbol, timeframe]);

  // Calculate counts for each category separately
  const oscillatorCounts = {
    buy: technicals.oscillators.filter((x) => x.signal === "buy").length,
    sell: technicals.oscillators.filter((x) => x.signal === "sell").length,
    neutral: technicals.oscillators.filter((x) => x.signal === "neutral").length,
  };

  const maCounts = {
    buy: technicals.movingAverages.filter((x) => x.signal === "buy").length,
    sell: technicals.movingAverages.filter((x) => x.signal === "sell").length,
    neutral: technicals.movingAverages.filter((x) => x.signal === "neutral").length,
  };

  const summaryCounts = {
    buy: oscillatorCounts.buy + maCounts.buy,
    sell: oscillatorCounts.sell + maCounts.sell,
    neutral: oscillatorCounts.neutral + maCounts.neutral,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ------------------ GAUGE COMPONENT ------------------
  const Gauge = ({ label, sell, neutral, buy }: { label: string; sell: number; neutral: number; buy: number }) => {
    const total = sell + neutral + buy;
    const buyPercent = total ? (buy / total) * 100 : 50;
    const sellPercent = total ? (sell / total) * 100 : 50;

    // Calculate needle position: 0% = full sell, 100% = full buy
    const needlePercent = total ? ((buy - sell + total) / (2 * total)) * 100 : 50;

    const getSignalText = () => {
      if (buy > sell + neutral) return "Strong Buy";
      if (buy > sell) return "Buy";
      if (sell > buy + neutral) return "Strong Sell";
      if (sell > buy) return "Sell";
      return "Neutral";
    };

    const getSignalColor = () => {
      if (buy > sell) return "text-emerald-500";
      if (sell > buy) return "text-red-500";
      return "text-muted-foreground";
    };

    return (
      <div className="flex flex-col items-center w-full py-2">
        <p className="text-sm font-medium text-muted-foreground mb-3">{label}</p>

        <div className="relative w-36 h-[72px]">
          <svg viewBox="0 0 100 55" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M10 50 A40 40 0 0 1 90 50"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Sell zone (red) */}
            <path
              d="M10 50 A40 40 0 0 1 30 15"
              fill="none"
              stroke="hsl(var(--destructive))"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.7"
            />
            {/* Neutral zone (gray) */}
            <path
              d="M30 15 A40 40 0 0 1 70 15"
              fill="none"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.5"
            />
            {/* Buy zone (green) */}
            <path
              d="M70 15 A40 40 0 0 1 90 50"
              fill="none"
              stroke="hsl(142 76% 36%)"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.7"
            />
          </svg>

          {/* Needle */}
          <div
            className="absolute bottom-0 left-1/2 w-0.5 h-10 bg-foreground origin-bottom rounded-full"
            style={{
              transform: `translateX(-50%) rotate(${(needlePercent / 100) * 180 - 90}deg)`,
              transition: "transform 0.5s ease-out",
            }}
          />
          {/* Needle center dot */}
          <div className="absolute bottom-0 left-1/2 w-3 h-3 bg-foreground rounded-full -translate-x-1/2 translate-y-1/2" />
        </div>

        <p className={`text-center text-base mt-2 font-semibold ${getSignalColor()}`}>{getSignalText()}</p>

        <div className="flex gap-4 mt-2 text-xs">
          <div className="text-center">
            <p className="text-red-500 font-medium">{sell}</p>
            <p className="text-muted-foreground">Sell</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground font-medium">{neutral}</p>
            <p className="text-muted-foreground">Neutral</p>
          </div>
          <div className="text-center">
            <p className="text-emerald-500 font-medium">{buy}</p>
            <p className="text-muted-foreground">Buy</p>
          </div>
        </div>
      </div>
    );
  };

  const getSignalColor = (signal: string) => {
    if (signal === "buy") return "text-emerald-500";
    if (signal === "sell") return "text-red-500";
    return "text-muted-foreground";
  };

  const getSignalBg = (signal: string) => {
    if (signal === "buy") return "bg-emerald-500/10";
    if (signal === "sell") return "bg-red-500/10";
    return "bg-muted/30";
  };

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || isNaN(num)) return "-";
    return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  const formatPercent = (num: number | undefined) => {
    if (num === undefined || isNaN(num)) return "-";
    const formatted = num.toFixed(2);
    const isPositive = num > 0;
    return (
      <span className={isPositive ? "text-emerald-500" : "text-red-500"}>
        {isPositive ? "+" : ""}
        {formatted}%
      </span>
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

      {/* GAUGES - Now with correct counts for each category */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Gauge
              label="Oscillators"
              sell={oscillatorCounts.sell}
              neutral={oscillatorCounts.neutral}
              buy={oscillatorCounts.buy}
            />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Gauge label="Summary" sell={summaryCounts.sell} neutral={summaryCounts.neutral} buy={summaryCounts.buy} />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Gauge label="Moving Averages" sell={maCounts.sell} neutral={maCounts.neutral} buy={maCounts.buy} />
          </CardContent>
        </Card>
      </div>

      {/* Performance & Volatility Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Performance */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {technicals.performance.map((perf, idx) => (
                <div key={idx} className="flex justify-between items-center py-1.5 px-2 rounded bg-muted/20">
                  <span className="text-xs text-muted-foreground">{perf.period}</span>
                  {formatPercent(perf.value)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Price Ranges */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-emerald-500" />
              <ArrowDown className="h-4 w-4 text-red-500" />
              Price Ranges
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {technicals.priceRanges.map((range, idx) => {
                const rangeWidth = range.high - range.low;
                const currentPos = rangeWidth > 0 ? ((technicals.close - range.low) / rangeWidth) * 100 : 50;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{range.period}</span>
                      <span className="text-muted-foreground">
                        {formatNumber(range.low)} - {formatNumber(range.high)}
                      </span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/50 via-muted-foreground/30 to-emerald-500/50" />
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-foreground rounded-full"
                        style={{ left: `${Math.min(Math.max(currentPos, 2), 98)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technical Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bollinger Bands */}
        {technicals.bollingerBands && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-sm">Bollinger Bands</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Upper</span>
                  <span className="text-sm text-red-400">{formatNumber(technicals.bollingerBands.upper)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Basis (SMA20)</span>
                  <span className="text-sm">{formatNumber(technicals.bollingerBands.basis)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-xs text-muted-foreground">Lower</span>
                  <span className="text-sm text-emerald-400">{formatNumber(technicals.bollingerBands.lower)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ichimoku Cloud */}
        {technicals.ichimoku && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-sm">Ichimoku Cloud</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Base Line</span>
                  <span className="text-sm">{formatNumber(technicals.ichimoku.bLine)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Conversion Line</span>
                  <span className="text-sm">{formatNumber(technicals.ichimoku.cLine)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Leading Span A</span>
                  <span className="text-sm">{formatNumber(technicals.ichimoku.lead1)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-xs text-muted-foreground">Leading Span B</span>
                  <span className="text-sm">{formatNumber(technicals.ichimoku.lead2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Volatility & SAR */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm">Volatility & SAR</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {technicals.volatility.map((vol, idx) => (
                <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">{vol.period} Volatility</span>
                  <span className="text-sm">{vol.value?.toFixed(2)}%</span>
                </div>
              ))}
              {technicals.sar && (
                <div className="flex justify-between py-1">
                  <span className="text-xs text-muted-foreground">Parabolic SAR</span>
                  <span
                    className={`text-sm ${technicals.close > technicals.sar ? "text-emerald-500" : "text-red-500"}`}
                  >
                    {formatNumber(technicals.sar)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Oscillators */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm">Oscillators</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {technicals.oscillators.map((osc, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0"
                >
                  <span className="text-xs text-muted-foreground">{osc.indicator}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular-nums">{osc.value}</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getSignalBg(osc.signal)} ${getSignalColor(osc.signal)}`}
                    >
                      {osc.signal.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Moving Averages */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm">Moving Averages</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {technicals.movingAverages.map((ma, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0"
                >
                  <span className="text-xs text-muted-foreground">{ma.indicator}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular-nums">
                      {typeof ma.value === "number" ? formatNumber(ma.value) : ma.value}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getSignalBg(ma.signal)} ${getSignalColor(ma.signal)}`}
                    >
                      {ma.signal.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PIVOT LEVELS with Tabs */}
      {technicals.pivots.length > 0 && technicals.pivots[0].pivot > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm">Pivot Points</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="Classic" className="w-full">
              <TabsList className="grid grid-cols-4 mb-3 h-8">
                {technicals.pivots.map((pivot) => (
                  <TabsTrigger key={pivot.type} value={pivot.type} className="text-xs">
                    {pivot.type}
                  </TabsTrigger>
                ))}
              </TabsList>
              {technicals.pivots.map((pivot) => (
                <TabsContent key={pivot.type} value={pivot.type} className="mt-0">
                  <div className="grid grid-cols-7 gap-1">
                    {(["s3", "s2", "s1", "pivot", "r1", "r2", "r3"] as const).map((key) => {
                      const value = pivot[key as keyof PivotData];
                      const isSupport = key.startsWith("s");
                      const isResistance = key.startsWith("r");
                      const isPivot = key === "pivot";
                      return (
                        <div
                          key={key}
                          className={`text-center p-2 rounded ${
                            isSupport ? "bg-emerald-500/10" : isResistance ? "bg-red-500/10" : "bg-primary/10"
                          }`}
                        >
                          <p
                            className={`text-[10px] uppercase font-medium ${
                              isSupport ? "text-emerald-500" : isResistance ? "text-red-500" : "text-primary"
                            }`}
                          >
                            {key}
                          </p>
                          <p className="text-xs font-semibold mt-0.5">
                            {typeof value === "number" ? formatNumber(value) : value}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
