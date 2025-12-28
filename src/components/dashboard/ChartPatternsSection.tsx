import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface CandlestickPattern {
  id: number;
  conditionName: string;
  tradingSymbol: string;
  title: string;
  timestamp: number;
  trendType: "Bullish" | "Bearish" | "Neutral";
  thumbnail: string;
  timeFrame: string;
  securityDescription: string;
}

interface ChartPatternsData {
  stocks?: {
    candlesticks?: CandlestickPattern[];
  };
}

export function ChartPatternsSection() {
  const [patterns, setPatterns] = useState<CandlestickPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState<"all" | "Bullish" | "Bearish" | "Neutral">("all");

  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('chart-patterns');
        if (!error && data?.stocks?.candlesticks) {
          setPatterns(data.stocks.candlesticks);
        }
      } catch (err) {
        console.error('Error fetching chart patterns:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatterns();
  }, []);

  const filteredPatterns = selectedTrend === "all" 
    ? patterns 
    : patterns.filter(p => p.trendType === selectedTrend);

  // Get counts for each trend type
  const bullishCount = patterns.filter(p => p.trendType === "Bullish").length;
  const bearishCount = patterns.filter(p => p.trendType === "Bearish").length;
  const neutralCount = patterns.filter(p => p.trendType === "Neutral").length;

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "Bullish": return "text-success bg-success/10";
      case "Bearish": return "text-destructive bg-destructive/10";
      default: return "text-warning bg-warning/10";
    }
  };

  const formatTimeFrame = (tf: string) => {
    switch (tf) {
      case "15mi": return "15M";
      case "1hr": return "1H";
      case "4hr": return "4H";
      case "1D": return "1D";
      default: return tf.toUpperCase();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Chart Patterns</h2>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Chart Patterns</h2>
        <span className="text-muted-foreground text-sm">{patterns.length} patterns found</span>
      </div>

      {/* Trend Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedTrend("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            selectedTrend === "all" 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All ({patterns.length})
        </button>
        <button
          onClick={() => setSelectedTrend("Bullish")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            selectedTrend === "Bullish" 
              ? "bg-success text-success-foreground" 
              : "bg-success/10 text-success hover:bg-success/20"
          }`}
        >
          Bullish ({bullishCount})
        </button>
        <button
          onClick={() => setSelectedTrend("Bearish")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            selectedTrend === "Bearish" 
              ? "bg-destructive text-destructive-foreground" 
              : "bg-destructive/10 text-destructive hover:bg-destructive/20"
          }`}
        >
          Bearish ({bearishCount})
        </button>
        <button
          onClick={() => setSelectedTrend("Neutral")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
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
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-border">
              {filteredPatterns.slice(0, 50).map((pattern) => (
                <div key={pattern.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                  {/* Pattern Icon */}
                  <div className="w-10 h-10 flex-shrink-0">
                    <img 
                      src={pattern.thumbnail} 
                      alt={pattern.conditionName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Pattern Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">
                        {pattern.tradingSymbol}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getTrendColor(pattern.trendType)}`}>
                        {pattern.trendType}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {pattern.conditionName}
                    </div>
                  </div>

                  {/* Time & Frame */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted-foreground">
                      {formatTimeFrame(pattern.timeFrame)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(pattern.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredPatterns.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No patterns found for selected filter
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
