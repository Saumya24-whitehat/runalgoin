import { useEffect, useRef, useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Loader2, Maximize2, Minimize2, RefreshCw, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    TradingView: any;
    tvWidget: any;
    bars: Record<string, any>;
    studies: Record<string, any>;
    customIndicatorsGetter: any;
    getIndicators: (id?: string) => any;
    ChartPatternPlotter: any;
    CandlestickPatternAnalyzer: any;
    patternPlotter: any;
    patternAnalyzer: any;
  }
}

interface CandlestickPattern {
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

const CandlestickPatternChart = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<CandlestickPattern[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState("15mi");
  const [currentSymbol, setCurrentSymbol] = useState("NIFTY");
  const [isPatternsLoading, setIsPatternsLoading] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);

  // Initialize global variables for custom indicators
  useEffect(() => {
    window.bars = window.bars || {};
    window.studies = window.studies || {};

    try {
      if (window.parent) {
        window.parent.bars = window.bars;
        window.parent.studies = window.studies;
      }
    } catch (e) {
      /* Cross-origin access error */
    }

    try {
      if (window.top) {
        window.top.bars = window.bars;
        window.top.studies = window.studies;
      }
    } catch (e) {
      /* Cross-origin access error */
    }

    (globalThis as any).bars = window.bars;
    (globalThis as any).studies = window.studies;
  }, []);

  // Fetch candlestick patterns from API
  const fetchPatterns = useCallback(async (symbol: string, timeframe: string) => {
    setIsPatternsLoading(true);
    try {
      console.log("🔍 Fetching patterns for:", symbol, timeframe);

      // Use the pattern analyzer if available
      if (window.patternAnalyzer) {
        const patterns = await window.patternAnalyzer.fetchPatternsFromAPI(symbol, timeframe, 50);
        setPatterns(patterns);

        // Plot patterns on chart if plotter is available
        if (window.patternPlotter && patterns.length > 0) {
          window.patternPlotter.plotPatterns(patterns);
        }

        return patterns;
      }

      // Fallback: Direct API call
      const apiUrl = `https://runalgo.xyz/top/chart/api/get_candlestick_patterns.php?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=50`;

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

  // Load TradingView scripts
  useEffect(() => {
    const loadTradingViewScripts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load candlestick pattern analyzer
        const analyzerScript = document.createElement("script");
        analyzerScript.src = "/chart/candlestick_pattern_analyzer.js";
        analyzerScript.async = true;
        await new Promise<void>((resolve, reject) => {
          analyzerScript.onload = () => resolve();
          analyzerScript.onerror = () => reject(new Error("Failed to load pattern analyzer"));
          document.head.appendChild(analyzerScript);
        });

        // Load candlestick chart plotter
        const plotterScript = document.createElement("script");
        plotterScript.src = "/chart/candlestick_chart_plotter.js";
        plotterScript.async = true;
        await new Promise<void>((resolve, reject) => {
          plotterScript.onload = () => resolve();
          plotterScript.onerror = () => reject(new Error("Failed to load chart plotter"));
          document.head.appendChild(plotterScript);
        });

        // Load custom indicators script
        const customIndicatorsScript = document.createElement("script");
        customIndicatorsScript.src = "/chart/customIndicators.js";
        customIndicatorsScript.async = true;
        await new Promise<void>((resolve, reject) => {
          customIndicatorsScript.onload = () => resolve();
          customIndicatorsScript.onerror = () => reject(new Error("Failed to load custom indicators"));
          document.head.appendChild(customIndicatorsScript);
        });

        // Load main charting library
        const mainScript = document.createElement("script");
        mainScript.src = "https://runalgo.xyz/top/chart/charting_library/charting_library.standalone.js";
        mainScript.async = true;
        await new Promise<void>((resolve, reject) => {
          mainScript.onload = () => resolve();
          mainScript.onerror = () => reject(new Error("Failed to load TradingView library"));
          document.head.appendChild(mainScript);
        });

        // Load datafeed
        const datafeedScript = document.createElement("script");
        datafeedScript.src = "https://runalgo.xyz/top/chart/datafeeds/tv-datafeed.js";
        datafeedScript.async = true;
        await new Promise<void>((resolve, reject) => {
          datafeedScript.onload = () => resolve();
          datafeedScript.onerror = () => reject(new Error("Failed to load datafeed"));
          document.head.appendChild(datafeedScript);
        });

        // Wait for TradingView to be available
        let attempts = 0;
        while (!window.TradingView && attempts < 50) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.TradingView) {
          throw new Error("TradingView library not available");
        }

        // Initialize the widget
        initializeWidget();
      } catch (err) {
        console.error("Error loading TradingView:", err);
        setError(err instanceof Error ? err.message : "Failed to load chart");
        setIsLoading(false);
      }
    };

    loadTradingViewScripts();

    return () => {
      if (window.tvWidget) {
        try {
          window.tvWidget.remove();
        } catch (e) {
          console.log("Widget cleanup error:", e);
        }
      }
    };
  }, []);

  const initializeWidget = () => {
    if (!containerRef.current || !window.TradingView) return;

    const isDark = document.documentElement.classList.contains("dark");

    // Create datafeed
    const datafeed = {
      onReady: (callback: Function) => {
        setTimeout(
          () =>
            callback({
              supports_marks: false,
              supports_timescale_marks: true,
              supported_resolutions: ["1", "3", "5", "15", "30", "45", "60", "120", "180", "240", "1D", "1W", "1M"],
              exchanges: [
                { value: "", name: "All Exchanges", desc: "" },
                { value: "NSE", name: "NSE", desc: "National Stock Exchange" },
                { value: "BSE", name: "BSE", desc: "Bombay Stock Exchange" },
                { value: "MCX", name: "MCX", desc: "Multi Commodity Exchange" },
                { value: "NFO", name: "NFO", desc: "NSE F&O" },
                { value: "BFO", name: "BFO", desc: "BSE F&O" },
                { value: "CDS", name: "CDS", desc: "Currency Derivative Segment" },
              ],
              symbols_types: [
                { name: "All types", value: "" },
                { name: "Stock", value: "EQ" },
                { name: "Stock Future", value: "FUTSTK" },
                { name: "Stock Option", value: "OPTSTK" },
                { name: "Index Future", value: "FUTIDX" },
                { name: "Index Option", value: "OPTIDX" },
                { name: "Commodity Future", value: "FUTCOM" },
                { name: "Commodity Option", value: "OPTCOM" },
                { name: "Currency Future", value: "FUTCUR" },
                { name: "Currency Option", value: "OPTCUR" },
                { name: "Index", value: "IDX" },
              ],
            }),
          0,
        );
      },
      searchSymbols: async (
        userInput: string,
        exchange: string,
        symbolType: string,
        onResultReadyCallback: Function,
      ) => {
        try {
          const response = await fetch(
            `https://runalgo.xyz/top/chart/upstox_symbol_search.php?query=${encodeURIComponent(userInput)}&limit=50&symbolType=${symbolType}`,
          );
          if (response.ok) {
            const data = await response.json();
            onResultReadyCallback(data);
          } else {
            onResultReadyCallback([]);
          }
        } catch (e) {
          console.error("Symbol search error:", e);
          onResultReadyCallback([]);
        }
      },
      resolveSymbol: (symbolName: string, onSymbolResolvedCallback: Function, onResolveErrorCallback: Function) => {
        setTimeout(() => {
          const parts = symbolName.split("|");
          const ticker = parts.length > 1 ? parts[1] : symbolName;
          const exchange = symbolName.includes("NSE") ? "NSE" : "NFO";

          onSymbolResolvedCallback({
            symbol: symbolName,
            full_name: symbolName,
            ticker: ticker,
            name: ticker,
            description: ticker,
            type: symbolName.includes("INDEX") ? "index" : "stock",
            session: "0915-1530",
            timezone: "Asia/Kolkata",
            exchange: exchange,
            minmov: 1,
            pricescale: 100,
            has_intraday: true,
            has_no_volume: false,
            has_weekly_and_monthly: true,
            supported_resolutions: ["1", "3", "5", "15", "30", "45", "60", "120", "180", "240", "1D", "1W", "1M"],
            volume_precision: 0,
            data_status: "streaming",
            instrument_key: symbolName,
          });
        }, 0);
      },
      getBars: async (
        symbolInfo: any,
        resolution: string,
        periodParams: any,
        onHistoryCallback: Function,
        onErrorCallback: Function,
      ) => {
        try {
          const { from, to } = periodParams;

          const intervalMap: Record<string, string> = {
            "1": "1minute",
            "3": "3minute",
            "5": "5minute",
            "10": "10minute",
            "15": "15minute",
            "30": "30minute",
            "45": "30minute",
            "60": "1hour",
            "120": "1hour",
            "180": "1hour",
            "240": "1hour",
            "1D": "1day",
            D: "1day",
            "1W": "1week",
            W: "1week",
            "1M": "1month",
            M: "1month",
          };

          const interval = intervalMap[resolution] || "5minute";
          const fromDate = new Date(from * 1000).toISOString().split("T")[0];
          const toDate = new Date(to * 1000).toISOString().split("T")[0];

          const apiSymbol = symbolInfo.instrument_key || symbolInfo.symbol || "NSE_INDEX|Nifty 50";

          const url = `https://runalgo.xyz/top/chart/upstox_data_fetcher.php?symbol=${encodeURIComponent(apiSymbol)}&interval=${interval}&from=${fromDate}&to=${toDate}`;

          const response = await fetch(url, {
            headers: {
              Accept: "*/*",
              Referer: "https://runalgo.xyz/top/chart/",
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.bars && data.bars.length > 0) {
              const bars = data.bars.map((bar: any) => {
                // Store bars in global window.bars for pattern plotter
                window.bars[(bar.time * 1000).toString()] = bar;
                return {
                  time: bar.time,
                  open: bar.open,
                  high: bar.high,
                  low: bar.low,
                  close: bar.close,
                  volume: bar.volume,
                  oi: bar.oi,
                };
              });

              onHistoryCallback(bars, { noData: false });
            } else {
              onHistoryCallback([], { noData: true });
            }
          } else {
            onHistoryCallback([], { noData: true });
          }
        } catch (e) {
          console.error("getBars error:", e);
          onErrorCallback(e);
        }
      },
      subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: Function, subscriberUID: string) => {
        console.log("Subscribe bars:", symbolInfo.symbol, resolution);
      },
      unsubscribeBars: (subscriberUID: string) => {
        console.log("Unsubscribe bars:", subscriberUID);
      },
    };

    try {
      const widget = new window.TradingView.widget({
        debug: false,
        fullscreen: false,
        autosize: true,
        width: "100%",
        height: "100%",
        symbol: "NSE_INDEX|Nifty 50",
        interval: "15",
        container: containerRef.current,
        datafeed: datafeed,
        library_path: "https://runalgo.xyz/top/chart/charting_library/",
        locale: "en",
        theme: isDark ? "dark" : "light",
        disabled_features: [
          "use_localstorage_for_settings",
          "open_account_manager",
          "trading_account_manager",
          "show_object_tree",
          "dom_widget",
        ],
        enabled_features: [
          "study_templates",
          "show_symbol_logos",
          "show_exchange_logos",
          "studies_overrides",
          "create_volume_indicator_by_default",
          "volume_force_overlay",
          "left_toolbar",
          "header_indicators",
          "header_compare",
          "header_undo_redo",
          "header_screenshot",
          "header_chart_type",
          "header_resolutions",
          "header_settings",
          "legend_context_menu",
          "display_market_status",
          "remove_library_container_border",
          "chart_property_page_style",
          "property_pages",
          "show_chart_property_page",
          "chart_property_page_scales",
          "chart_property_page_background",
          "timeframes_toolbar",
          "edit_buttons_in_legend",
          "context_menus",
          "control_bar",
          "widget_logo",
          "items_favoriting",
          "save_chart_properties_to_local_storage",
          "header_saveload",
          "chart_template_storage",
          "study_template_storage",
        ],
        custom_indicators_getter: window.customIndicatorsGetter,
        overrides: {
          "mainSeriesProperties.candleStyle.upColor": "#4CAF50",
          "mainSeriesProperties.candleStyle.downColor": "#F44336",
          "mainSeriesProperties.candleStyle.borderUpColor": "#4CAF50",
          "mainSeriesProperties.candleStyle.borderDownColor": "#F44336",
          "mainSeriesProperties.candleStyle.wickUpColor": "#4CAF50",
          "mainSeriesProperties.candleStyle.wickDownColor": "#F44336",
        },
      });

      window.tvWidget = widget;

      widget.onChartReady(() => {
        console.log("TradingView chart ready");
        setIsLoading(false);
        setWidgetReady(true);

        // Initialize pattern plotter with widget
        if (window.ChartPatternPlotter) {
          window.patternPlotter = new window.ChartPatternPlotter(widget);
          console.log("✅ Pattern plotter initialized");
        }

        // Initialize pattern analyzer
        if (window.CandlestickPatternAnalyzer) {
          window.patternAnalyzer = new window.CandlestickPatternAnalyzer();
          window.patternAnalyzer.apiBaseUrl = "https://runalgo.xyz/top/chart/api";
          console.log("✅ Pattern analyzer initialized");
        }

        // Setup getIndicators function
        const getIndicatorsFn = (id?: string) => {
          if (id) {
            return widget.activeChart().getStudyById(id);
          }
          return widget.activeChart().getAllStudies();
        };

        window.getIndicators = getIndicatorsFn;
        (globalThis as any).getIndicators = getIndicatorsFn;

        // Listen for symbol changes
        widget
          .activeChart()
          .onSymbolChanged()
          .subscribe(null, () => {
            const symbolInfo = widget.activeChart().symbolExt();
            if (symbolInfo) {
              const symbol = symbolInfo.ticker || symbolInfo.symbol || "NIFTY";
              setCurrentSymbol(symbol);
              console.log("📊 Symbol changed to:", symbol);

              // Fetch patterns for new symbol
              fetchPatterns(symbol, selectedTimeframe);
            }
          });

        // Initial pattern fetch
        fetchPatterns("NIFTY", selectedTimeframe);
      });
    } catch (err) {
      console.error("Widget initialization error:", err);
      setError("Failed to initialize chart");
      setIsLoading(false);
    }
  };

  // Handle pattern click - plot on chart
  const handlePatternClick = (pattern: CandlestickPattern) => {
    console.log("🎯 Pattern clicked:", pattern);

    if (window.patternPlotter) {
      // Clear existing patterns
      // window.patternPlotter.clearAllPatterns();

      // Plot the selected pattern
      window.patternPlotter.plotPattern(pattern);
    }
  };

  // Refresh patterns
  const handleRefreshPatterns = () => {
    fetchPatterns(currentSymbol, selectedTimeframe);
  };

  // Handle timeframe change
  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    fetchPatterns(currentSymbol, timeframe);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current?.parentElement) return;

    if (!isFullscreen) {
      containerRef.current.parentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Group patterns by signal type
  const bullishPatterns = patterns.filter((p) => p.signal === "bullish");
  const bearishPatterns = patterns.filter((p) => p.signal === "bearish");
  const neutralPatterns = patterns.filter((p) => p.signal === "neutral");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TickerRibbon />
      <Navbar />

      <ProFeatureGate featureName="Candlestick Pattern Chart">
        <div className="flex-1 flex p-4 gap-4">
          {/* Main Chart Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Candlestick Pattern Chart</h1>
                <p className="text-sm text-muted-foreground">
                  Advanced charting with automatic candlestick pattern detection
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedTimeframe} onValueChange={handleTimeframeChange}>
                  <SelectTrigger className="w-[120px]">
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
                <Button variant="outline" size="sm" onClick={handleRefreshPatterns} disabled={isPatternsLoading}>
                  <RefreshCw className={cn("h-4 w-4", isPatternsLoading && "animate-spin")} />
                </Button>
                <Button variant="outline" size="sm" onClick={toggleFullscreen} className="gap-2">
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="h-4 w-4" />
                      Exit
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-4 w-4" />
                      Fullscreen
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex-1 relative border border-border rounded-lg overflow-hidden bg-card min-h-[600px]">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Loading TradingView Chart...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <div className="flex flex-col items-center gap-3 text-center p-4">
                    <span className="text-destructive font-medium">{error}</span>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Please check your internet connection and try refreshing the page.
                    </p>
                    <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              <div
                ref={containerRef}
                id="tv_chart_container_patterns"
                className="w-full min-h-[600px]"
                style={{ height: "calc(100vh - 250px)" }}
              />
            </div>
          </div>

          {/* Pattern Panel */}
          <Card className="w-80 shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Detected Patterns
                </span>
                {isPatternsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {currentSymbol} • {selectedTimeframe}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="p-4 space-y-4">
                  {/* Bullish Patterns */}
                  {bullishPatterns.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-oc-positive">
                        <TrendingUp className="h-4 w-4" />
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
                      <div className="flex items-center gap-2 text-sm font-medium text-oc-negative">
                        <TrendingDown className="h-4 w-4" />
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
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <BarChart3 className="h-4 w-4" />
                        Neutral ({neutralPatterns.length})
                      </div>
                      {neutralPatterns.map((pattern) => (
                        <PatternItem key={pattern.id} pattern={pattern} onClick={() => handlePatternClick(pattern)} />
                      ))}
                    </div>
                  )}

                  {patterns.length === 0 && !isPatternsLoading && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No patterns detected for {currentSymbol} on {selectedTimeframe} timeframe
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </ProFeatureGate>
    </div>
  );
};

// Pattern Item Component
const PatternItem = ({ pattern, onClick }: { pattern: CandlestickPattern; onClick: () => void }) => {
  const signalColors = {
    bullish: "bg-oc-positive/10 text-oc-positive border-oc-positive/20",
    bearish: "bg-oc-negative/10 text-oc-negative border-oc-negative/20",
    neutral: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
        signalColors[pattern.signal],
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">{pattern.name}</span>
        <Badge variant="outline" className="text-xs">
          {Math.round(pattern.strength * 100)}%
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-xs opacity-70">
        <span>{pattern.symbol}</span>
        <span>•</span>
        <span>{pattern.pattern_type}</span>
      </div>
      {pattern.time && (
        <div className="text-xs opacity-50 mt-1">
          {new Date(pattern.time).toLocaleString("en-IN", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </div>
  );
};

export default CandlestickPatternChart;
