import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    TradingView: any;
    tvWidget: any;
    bars: Record<string, any>;
    studies: Record<string, any>;
    customIndicatorsGetter: any;
    getIndicators: (id?: string) => any;
  }
}

const OptionsChart = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize global variables for custom indicators
    window.bars = window.bars || {};
    window.studies = window.studies || {};

    // Make globals available across frames
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

    // Load TradingView library scripts
    const loadTradingViewScripts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load custom indicators script first
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
              // Convert bars to TradingView format and filter by time range with limits
              const bars = data.bars.map((bar) => ({
                time: bar.time,
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
                volume: bar.volume,
                oi: bar.oi,
              }));

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
      const widget = new window.TradingView.widget({
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

        disabled_features: [
          "use_localstorage_for_settings",
          "open_account_manager",
          "trading_account_manager",
          "show_object_tree",
          "dom_widget",
        ],
        show_object_tree: false,
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

        // Setup getIndicators function
        const getIndicatorsFn = (id?: string) => {
          if (id) {
            return widget.activeChart().getStudyById(id);
          }
          return widget.activeChart().getAllStudies();
        };

        window.getIndicators = getIndicatorsFn;
        (globalThis as any).getIndicators = getIndicatorsFn;

        try {
          if (window.parent) {
            window.parent.getIndicators = getIndicatorsFn;
          }
        } catch (e) {
          /* Cross-origin access error */
        }

        try {
          if (window.top) {
            window.top.getIndicators = getIndicatorsFn;
          }
        } catch (e) {
          /* Cross-origin access error */
        }
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
