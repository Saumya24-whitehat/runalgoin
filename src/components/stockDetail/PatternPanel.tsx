import { useState, useCallback, useEffect } from "react";
import { TrendingUp, TrendingDown, BarChart3, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    patternPlotter: any;
    patternAnalyzer: any;
    ChartPatternPlotter: any;
    CandlestickPatternAnalyzer: any;
  }
}

export interface CandlestickPattern {
  id: string;
  name: string;
  signal: "bullish" | "bearish" | "neutral";
  strength: number;
  trend_type: string;
  time: number;
  timeframe: string;
  symbol: string;
  pattern_type: string;
  title: string;
  description: string;
  original: any;
}

interface PatternPanelProps {
  symbol: string;
  widgetReady: boolean;
  widgetRef: React.MutableRefObject<any>;
}

export const PatternPanel = ({ symbol, widgetReady, widgetRef }: PatternPanelProps) => {
  const [patterns, setPatterns] = useState<CandlestickPattern[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState("15mi");
  const [isPatternsLoading, setIsPatternsLoading] = useState(false);

  // Normalize API response to standard format
  const normalizePatterns = (rawData: any[]): CandlestickPattern[] => {
    if (!Array.isArray(rawData)) {
      console.warn("⚠️ Expected array response, got:", typeof rawData);
      return [];
    }

    return rawData.map((item, index) => ({
      id: item.id || `pattern_${index}`,
      name: item.conditionName || "Unknown Pattern",
      signal:
        (item.trendType || "").toLowerCase() === "bullish"
          ? "bullish"
          : (item.trendType || "").toLowerCase() === "bearish"
            ? "bearish"
            : "neutral",
      strength: calculatePatternStrength(item),
      trend_type: item.trendType || "",
      time: item.timestamp,
      timeframe: item.timeFrame || "",
      symbol: item.tradingSymbol || "",
      pattern_type: item.subTypeLabel || "Candlesticks",
      title: item.title || "",
      description: item.securityDescription || "",
      original: item,
    }));
  };

  // Calculate pattern strength
  const calculatePatternStrength = (item: any): number => {
    let strength = 0.7;

    if (item.subTypeLabel === "Candlesticks") {
      strength = 0.75;
    } else if (item.subTypeLabel === "Chart Patterns") {
      strength = 0.65;
    }

    const highStrengthPatterns = [
      "Bullish Engulfing",
      "Bearish Engulfing",
      "Morning Star",
      "Evening Star",
      "Three White Soldiers",
      "Three Black Crows",
      "Double Bottom",
      "Double Top",
    ];

    if (highStrengthPatterns.some((p) => item.conditionName?.includes(p))) {
      strength += 0.15;
    }

    return Math.min(strength, 1.0);
  };

  // Fetch candlestick patterns from API
  const fetchPatterns = useCallback(async (symbolName: string, timeframe: string) => {
    setIsPatternsLoading(true);
    try {
      console.log("🔍 Fetching patterns for:", symbolName, timeframe);

      // Use the pattern analyzer if available
      if (window.patternAnalyzer) {
        const patterns = await window.patternAnalyzer.fetchPatternsFromAPI(symbolName, timeframe, 50);
        setPatterns(patterns);
        return patterns;
      }

      // Fallback: Direct API call
      const apiUrl = `https://runalgo.xyz/top/chart/api/get_candlestick_patterns.php?symbol=${encodeURIComponent(symbolName)}&timeframe=${encodeURIComponent(timeframe)}&limit=50`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();
      console.log("📨 Raw API Response:", rawData);

      // Normalize the response
      const normalizedPatterns = normalizePatterns(rawData);
      setPatterns(normalizedPatterns);

      return normalizedPatterns;
    } catch (error) {
      console.error("❌ Error fetching patterns:", error);
      return [];
    } finally {
      setIsPatternsLoading(false);
    }
  }, []);

  // Initialize pattern plotter when widget is ready
  useEffect(() => {
    if (widgetReady && widgetRef.current) {
      // Initialize pattern plotter with widget
      if (window.ChartPatternPlotter && !window.patternPlotter) {
        window.patternPlotter = new window.ChartPatternPlotter(widgetRef.current);
        console.log("✅ Pattern plotter initialized for stock detail");
      }

      // Initialize pattern analyzer
      if (window.CandlestickPatternAnalyzer && !window.patternAnalyzer) {
        window.patternAnalyzer = new window.CandlestickPatternAnalyzer();
        window.patternAnalyzer.apiBaseUrl = "https://runalgo.xyz/top/chart/api";
        console.log("✅ Pattern analyzer initialized");
      }

      // Fetch patterns for current symbol
      fetchPatterns(symbol, selectedTimeframe);
    }
  }, [widgetReady, widgetRef, symbol, selectedTimeframe, fetchPatterns]);

  // Refetch patterns when symbol changes
  useEffect(() => {
    if (widgetReady) {
      fetchPatterns(symbol, selectedTimeframe);
    }
  }, [symbol, widgetReady, selectedTimeframe, fetchPatterns]);

  // Handle pattern click - plot on chart
  const handlePatternClick = (pattern: CandlestickPattern) => {
    console.log("🎯 Pattern clicked:", pattern);
    console.log("🎯 Pattern original data:", pattern.original);

    if (window.patternPlotter) {
      console.log("🎨 Using patternPlotter.plotPattern()");
      window.patternPlotter.plotPattern(pattern);
    } else {
      console.error("❌ patternPlotter not available");
    }
  };

  // Handle timeframe change
  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    fetchPatterns(symbol, timeframe);
  };

  // Group patterns by signal type
  const bullishPatterns = patterns.filter((p) => p.signal === "bullish");
  const bearishPatterns = patterns.filter((p) => p.signal === "bearish");
  const neutralPatterns = patterns.filter((p) => p.signal === "neutral");

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Select value={selectedTimeframe} onValueChange={handleTimeframeChange}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5mi">5 Min</SelectItem>
            <SelectItem value="15mi">15 Min</SelectItem>
            <SelectItem value="30mi">30 Min</SelectItem>
            <SelectItem value="1hr">1 Hour</SelectItem>
            <SelectItem value="4hr">4 Hour</SelectItem>
            <SelectItem value="1day">Daily</SelectItem>
            <SelectItem value="1week">Weekly</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchPatterns(symbol, selectedTimeframe)}
          disabled={isPatternsLoading}
          className="h-8 px-2"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isPatternsLoading && "animate-spin")} />
        </Button>
        {patterns.length > 0 && (
          <Badge variant="secondary" className="text-xs ml-auto">
            {patterns.length} patterns
          </Badge>
        )}
        {isPatternsLoading && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
      </div>

      {/* Pattern List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Bullish Patterns */}
          {bullishPatterns.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-oc-positive">
                <TrendingUp className="h-3.5 w-3.5" />
                Bullish ({bullishPatterns.length})
              </div>
              {bullishPatterns.map((pattern) => (
                <PatternItem key={pattern.id} pattern={pattern} onClick={() => handlePatternClick(pattern)} />
              ))}
            </div>
          )}

          {/* Bearish Patterns */}
          {bearishPatterns.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-oc-negative">
                <TrendingDown className="h-3.5 w-3.5" />
                Bearish ({bearishPatterns.length})
              </div>
              {bearishPatterns.map((pattern) => (
                <PatternItem key={pattern.id} pattern={pattern} onClick={() => handlePatternClick(pattern)} />
              ))}
            </div>
          )}

          {/* Neutral Patterns */}
          {neutralPatterns.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                Neutral ({neutralPatterns.length})
              </div>
              {neutralPatterns.map((pattern) => (
                <PatternItem key={pattern.id} pattern={pattern} onClick={() => handlePatternClick(pattern)} />
              ))}
            </div>
          )}

          {patterns.length === 0 && !isPatternsLoading && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No patterns detected for <strong>{symbol}</strong> on {selectedTimeframe} timeframe
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Pattern Item Component
const PatternItem = ({ pattern, onClick }: { pattern: CandlestickPattern; onClick: () => void }) => {
  const signalColors = {
    bullish: "bg-oc-positive/10 text-oc-positive border-oc-positive/20 hover:bg-oc-positive/20",
    bearish: "bg-oc-negative/10 text-oc-negative border-oc-negative/20 hover:bg-oc-negative/20",
    neutral: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-2.5 rounded-md border cursor-pointer transition-all text-xs",
        signalColors[pattern.signal],
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium">{pattern.name}</span>
        <Badge variant="outline" className="text-[10px] h-5">
          {Math.round(pattern.strength * 100)}%
        </Badge>
      </div>
      <div className="flex items-center gap-1.5 opacity-70">
        <span>{pattern.symbol}</span>
        <span>•</span>
        <span>{pattern.pattern_type}</span>
      </div>
    </div>
  );
};
