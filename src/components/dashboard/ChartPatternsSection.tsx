import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
interface PatternItem {
  id: number;
  conditionName: string;
  tradingSymbol: string;
  title: string;
  timestamp: number;
  trendType: "Bullish" | "Bearish" | "Neutral";
  thumbnail?: string;
  timeFrame: string;
  securityDescription: string;
  subTypeLabel?: string;
}

interface ChartPatternsData {
  stocks?: {
    candlesticks?: PatternItem[];
    chartPatterns?: PatternItem[];
  };
  fno?: {
    candlesticks?: PatternItem[];
    chartPatterns?: PatternItem[];
    priceAction?: PatternItem[];
  };
}

type MainTab = "stocks" | "fno";
type StocksSubTab = "candlesticks" | "chartPatterns";
type FnoSubTab = "candlesticks" | "chartPatterns" | "priceAction";

export function ChartPatternsSection() {
  const [data, setData] = useState<ChartPatternsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>("stocks");
  const [stocksSubTab, setStocksSubTab] = useState<StocksSubTab>("candlesticks");
  const [fnoSubTab, setFnoSubTab] = useState<FnoSubTab>("candlesticks");
  const [selectedTrend, setSelectedTrend] = useState<"all" | "Bullish" | "Bearish" | "Neutral">("all");

  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        const { data: responseData, error } = await supabase.functions.invoke("chart-patterns");
        if (!error && responseData) {
          setData(responseData);
        }
      } catch (err) {
        console.error("Error fetching chart patterns:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatterns();
  }, []);

  const getCurrentPatterns = (): PatternItem[] => {
    if (!data) return [];

    if (mainTab === "stocks") {
      const stocksData = data.stocks;
      if (!stocksData) return [];
      return stocksSubTab === "candlesticks" ? stocksData.candlesticks || [] : stocksData.chartPatterns || [];
    } else {
      const fnoData = data.fno;
      if (!fnoData) return [];
      switch (fnoSubTab) {
        case "candlesticks":
          return fnoData.candlesticks || [];
        case "chartPatterns":
          return fnoData.chartPatterns || [];
        case "priceAction":
          return fnoData.priceAction || [];
        default:
          return [];
      }
    }
  };

  const patterns = getCurrentPatterns();
  const filteredPatterns = selectedTrend === "all" ? patterns : patterns.filter((p) => p.trendType === selectedTrend);

  const bullishCount = patterns.filter((p) => p.trendType === "Bullish").length;
  const bearishCount = patterns.filter((p) => p.trendType === "Bearish").length;
  const neutralCount = patterns.filter((p) => p.trendType === "Neutral").length;

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "Bullish":
        return "text-success bg-success/10";
      case "Bearish":
        return "text-destructive bg-destructive/10";
      default:
        return "text-warning bg-warning/10";
    }
  };

  const getPatternIcon = (conditionName: string) => {
    // Use pattern name to construct URL from runalgo.xyz
    const encodedName = encodeURIComponent(conditionName);
    return `https://runalgo.xyz/chartpatterns/svg/${encodedName}.svg`;
  };

  const formatTimeFrame = (tf: string) => {
    switch (tf) {
      case "15mi":
        return "15M";
      case "1hr":
        return "1H";
      case "4hr":
        return "4H";
      case "1D":
        return "1D";
      default:
        return tf.toUpperCase();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Chart Patterns</h2>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Chart Patterns</h2>
        <span className="text-muted-foreground text-sm">{patterns.length} patterns</span>
      </div>

      {/* Main Tabs: Stocks vs F&O */}
      <div className="flex gap-2">
        <button
          onClick={() => setMainTab("stocks")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mainTab === "stocks"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Stocks
        </button>
        <button
          onClick={() => setMainTab("fno")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mainTab === "fno"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          F&O
        </button>
      </div>

      {/* Sub Tabs based on main tab */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {mainTab === "stocks" ? (
          <>
            <button
              onClick={() => setStocksSubTab("candlesticks")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                stocksSubTab === "candlesticks"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Candlesticks
            </button>
            <button
              onClick={() => setStocksSubTab("chartPatterns")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                stocksSubTab === "chartPatterns"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Chart Patterns
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setFnoSubTab("candlesticks")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                fnoSubTab === "candlesticks"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Candlesticks
            </button>
            <button
              onClick={() => setFnoSubTab("chartPatterns")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                fnoSubTab === "chartPatterns"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Chart Patterns
            </button>
            <button
              onClick={() => setFnoSubTab("priceAction")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                fnoSubTab === "priceAction"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Price Action
            </button>
          </>
        )}
      </div>

      {/* Trend Filter */}
      <div className="flex gap-1.5 overflow-x-auto">
        <button
          onClick={() => setSelectedTrend("all")}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            selectedTrend === "all"
              ? "bg-primary/20 text-primary"
              : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
          }`}
        >
          All ({patterns.length})
        </button>
        <button
          onClick={() => setSelectedTrend("Bullish")}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            selectedTrend === "Bullish"
              ? "bg-success text-success-foreground"
              : "bg-success/10 text-success hover:bg-success/20"
          }`}
        >
          Bullish ({bullishCount})
        </button>
        <button
          onClick={() => setSelectedTrend("Bearish")}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            selectedTrend === "Bearish"
              ? "bg-destructive text-destructive-foreground"
              : "bg-destructive/10 text-destructive hover:bg-destructive/20"
          }`}
        >
          Bearish ({bearishCount})
        </button>
        <button
          onClick={() => setSelectedTrend("Neutral")}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            selectedTrend === "Neutral"
              ? "bg-warning text-warning-foreground"
              : "bg-warning/10 text-warning hover:bg-warning/20"
          }`}
        >
          Neutral ({neutralCount})
        </button>
      </div>

      {/* Patterns List */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <ScrollArea className="h-[350px]">
            <div className="divide-y divide-border">
              {filteredPatterns.slice(0, 50).map((pattern) => (
                <div key={pattern.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                  {/* Pattern Icon */}
                  <div className="w-10 h-10 flex-shrink-0 rounded" style={{ backgroundColor: "rgba(255,255,255,0.3)" }}>
                    <img
                      src={getPatternIcon(pattern.conditionName)}
                      alt={pattern.conditionName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>

                  {/* Pattern Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">{pattern.tradingSymbol}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getTrendColor(pattern.trendType)}`}>
                        {pattern.trendType}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{pattern.conditionName}</div>
                    {pattern.securityDescription && (
                      <div className="text-xs text-muted-foreground/70 truncate">{pattern.securityDescription}</div>
                    )}
                  </div>

                  {/* Time & Frame */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted-foreground">{formatTimeFrame(pattern.timeFrame)}</div>
                    <div className="text-xs text-muted-foreground">{formatTime(pattern.timestamp)}</div>
                  </div>
                </div>
              ))}

              {filteredPatterns.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">No patterns found</div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
