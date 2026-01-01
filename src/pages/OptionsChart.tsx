import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    TradingView: any;
    tvWidget: any;
    customIndicatorsGetter: any;
    bars: Record<number, any>;
  }
}

const OptionsChart = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load TradingView library scripts
    const loadTradingViewScripts = async () => {
      try {
        setIsLoading(true);
        setError(null);

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

        // Load custom indicators
        const customIndicatorsScript = document.createElement("script");
        customIndicatorsScript.src = "/chart/customIndicators.js";
        customIndicatorsScript.async = true;

        await new Promise<void>((resolve, reject) => {
          customIndicatorsScript.onload = () => resolve();
          customIndicatorsScript.onerror = () => {
            console.warn("Custom indicators failed to load, continuing without them");
            resolve(); // Don't reject, just continue without custom indicators
          };
          document.head.appendChild(customIndicatorsScript);
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
      // Cleanup widget on unmount
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

    // Create datafeed with basic configuration
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
                { value: "NFO", name: "NFO", desc: "NSE F&O" },
                { value: "BSE", name: "BSE", desc: "Bombay Stock Exchange" },
                { value: "MCX", name: "MCX", desc: "Multi Commodity Exchange" },
              ],
              symbols_types: [
                { name: "All types", value: "" },
                { name: "Stock", value: "stock" },
                { name: "Index", value: "index" },
                { name: "Futures", value: "futures" },
                { name: "Options", value: "option" },
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

          // Map TradingView resolution to API interval
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

          // Use full_name which contains the proper symbol format (e.g., NSE_INDEX|Nifty 50)
          const apiSymbol = symbolInfo.instrument_key || symbolInfo.symbol || "NSE_INDEX|Nifty 50";

          console.log(symbolInfo);
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
              // API returns candles in format: [timestamp, open, high, low, close, volume, oi]
              // Convert bars to TradingView format and store for custom indicators
              const bars = data.bars.map((bar: any) => {
                // Store bar data for custom indicators
                window.bars[bar.time] = {
                  time: bar.time,
                  open: bar.open,
                  high: bar.high,
                  low: bar.low,
                  close: bar.close,
                  volume: bar.volume,
                  oi: bar.oi,
                };
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
        // Realtime subscription placeholder
        console.log("Subscribe bars:", symbolInfo.symbol, resolution);
      },
      unsubscribeBars: (subscriberUID: string) => {
        console.log("Unsubscribe bars:", subscriberUID);
      },
    };

    try {
      const widgetOptions: any = {
        debug: false,
        fullscreen: false,
        autosize: true,
        width: "100%",
        height: "100%",
        symbol: "NSE_INDEX|Nifty 50",
        interval: "5",
        container: containerRef.current,
        datafeed: datafeed,
        library_path: "https://runalgo.xyz/top/chart/charting_library/",
        locale: "en",
        theme: isDark ? "dark" : "light",
        disabled_features: ["use_localstorage_for_settings", "header_saveload"],
        enabled_features: [
          "study_templates",
          "show_symbol_logos",
          "show_exchange_logos",
          "create_volume_indicator_by_default",
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
          "timeframes_toolbar",
          "edit_buttons_in_legend",
          "context_menus",
          "control_bar",
        ],
        overrides: {
          "mainSeriesProperties.candleStyle.upColor": "#22c55e",
          "mainSeriesProperties.candleStyle.downColor": "#ef4444",
          "mainSeriesProperties.candleStyle.borderUpColor": "#22c55e",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
          "mainSeriesProperties.candleStyle.wickUpColor": "#22c55e",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
          "paneProperties.background": isDark ? "#0a0a0b" : "#ffffff",
          "paneProperties.backgroundType": "solid",
        },
      };

      // Add custom indicators if available
      if (window.customIndicatorsGetter) {
        widgetOptions.custom_indicators_getter = window.customIndicatorsGetter;
      }

      const widget = new window.TradingView.widget(widgetOptions);

      window.tvWidget = widget;

      widget.onChartReady(() => {
        console.log("TradingView chart ready");
        setIsLoading(false);
      });
    } catch (err) {
      console.error("Widget initialization error:", err);
      setError("Failed to initialize chart");
      setIsLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TickerRibbon />
      <Navbar />

      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Options Chart</h1>
            <p className="text-sm text-muted-foreground">Advanced TradingView charting with NSE/NFO data</p>
          </div>
          <Button variant="outline" size="sm" onClick={toggleFullscreen} className="gap-2">
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                Fullscreen
              </>
            )}
          </Button>
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
            id="tv_chart_container"
            className="w-full  min-h-[600px]"
            style={{ height: "100vh" }}
          />
        </div>
      </div>
    </div>
  );
};

export default OptionsChart;
