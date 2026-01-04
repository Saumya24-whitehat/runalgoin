import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StockDetailChartProps {
  symbol: string;
}

declare global {
  interface Window {
    TradingView: any;
    tvWidget: any;
    bars: Record<string, any>;
    studies: Record<string, any>;
    customIndicatorsGetter: any;
  }
}

export const StockDetailChart = ({ symbol }: StockDetailChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    window.bars = window.bars || {};
    window.studies = window.studies || {};

    const loadTradingViewScripts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if scripts already loaded
        if (!document.querySelector('script[src="/chart/customIndicators.js"]')) {
          const customIndicatorsScript = document.createElement("script");
          customIndicatorsScript.src = "/chart/customIndicators.js";
          customIndicatorsScript.async = true;
          await new Promise<void>((resolve, reject) => {
            customIndicatorsScript.onload = () => resolve();
            customIndicatorsScript.onerror = () => reject(new Error("Failed to load custom indicators"));
            document.head.appendChild(customIndicatorsScript);
          });
        }

        if (!document.querySelector('script[src*="charting_library.standalone.js"]')) {
          const mainScript = document.createElement("script");
          mainScript.src = "https://runalgo.xyz/top/chart/charting_library/charting_library.standalone.js";
          mainScript.async = true;
          await new Promise<void>((resolve, reject) => {
            mainScript.onload = () => resolve();
            mainScript.onerror = () => reject(new Error("Failed to load TradingView library"));
            document.head.appendChild(mainScript);
          });
        }

        if (!document.querySelector('script[src*="tv-datafeed.js"]')) {
          const datafeedScript = document.createElement("script");
          datafeedScript.src = "https://runalgo.xyz/top/chart/datafeeds/tv-datafeed.js";
          datafeedScript.async = true;
          await new Promise<void>((resolve, reject) => {
            datafeedScript.onload = () => resolve();
            datafeedScript.onerror = () => reject(new Error("Failed to load datafeed"));
            document.head.appendChild(datafeedScript);
          });
        }

        let attempts = 0;
        while (!window.TradingView && attempts < 50) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.TradingView) {
          throw new Error("TradingView library not available");
        }

        initializeWidget();
      } catch (err) {
        console.error("Error loading TradingView:", err);
        setError(err instanceof Error ? err.message : "Failed to load chart");
        setIsLoading(false);
      }
    };

    loadTradingViewScripts();

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.log("Widget cleanup error:", e);
        }
      }
    };
  }, [symbol]);

  const initializeWidget = () => {
    if (!containerRef.current || !window.TradingView) return;

    // Cleanup previous widget
    if (widgetRef.current) {
      try {
        widgetRef.current.remove();
      } catch (e) {}
    }

    const isDark = document.documentElement.classList.contains("dark");
    const chartSymbol = `NSE_EQ|${symbol}`;
    const datafeed = {
      _quotesSubscriptions: {} as Record<string, any>,
      csvSymbols: [] as NseInstrument[],
      csvLoaded: false,
      logoCache: new Map<string, string>(),
      availableLogos: new Set<string>(),

      onReady(callback: (config: any) => void) {
        this._quotesSubscriptions = {};
        this.csvSymbols = [];
        this.csvLoaded = false;
        this.logoCache = new Map();
        this.availableLogos = new Set();

        this.loadAvailableLogos();
        this.loadCSVSymbols();

        setTimeout(() => {
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
          });
        }, 0);
      },

      async loadCSVSymbols(): Promise<void> {
        try {
          const response = await fetch("https://runalgo.xyz/top/chart/NSE.json");

          if (!response.ok) {
            const paths = ["./data/NSE.json", "../NSE.json", "./json/NSE.json", "./assets/NSE.json"];

            for (const path of paths) {
              try {
                const altRes = await fetch(path);
                if (altRes.ok) {
                  const jsonData = (await altRes.json()) as NseInstrument[];
                  this.csvSymbols = this.parseNSEJson(jsonData);
                  this.csvLoaded = true;
                  return;
                }
              } catch {}
            }

            throw new Error("NSE.json not found");
          }

          const jsonData = (await response.json()) as NseInstrument[];
          this.csvSymbols = this.parseNSEJson(jsonData);
          this.csvLoaded = true;
        } catch (error) {
          console.error("❌ Error loading NSE.json:", error);
          this.csvLoaded = false;
          this.csvSymbols = [];
        }
      },

      async searchSymbols(userInput: string, exchange: string, symbolType: string, onResultReadyCallback: Function) {
        try {
          const url = `https://runalgo.xyz/top/chart/upstox_symbol_search.php?query=${encodeURIComponent(userInput)}&limit=50&symbolType=${symbolType}`;
          const res = await fetch(url);

          if (!res.ok) return onResultReadyCallback([]);

          const data = await res.json();
          onResultReadyCallback(data);
        } catch {
          onResultReadyCallback([]);
        }
      },

      // Extract instrument key from display format "Display Name|InstrumentKey"
      extractInstrumentKey(symbolName) {
        if (symbolName && symbolName.includes(":")) {
          return symbolName.split(":")[0];
        }
        if (symbolName && symbolName.includes("|")) {
          const parts = symbolName.split("|");
          if (parts.length >= 2) {
            // Return the instrument key part (everything after first |)
            return parts.slice(1).join("|");
          }
        }
        return symbolName; // Return as-is if no pipe separator
      },

      // Extract display name from format "Display Name|InstrumentKey"
      extractDisplayName(symbolName) {
        // //console.log(symbolName)
        if (symbolName && symbolName.includes("|") && symbolName.includes(":")) {
          return symbolName.split("|")[1].split(":")[1];
        }
        if (symbolName && symbolName.includes("|")) {
          const parts = symbolName.split("|");
          if (parts.length >= 2) {
            return parts[0]; // Return the display name part
          }
        }
        return symbolName; // Return as-is if no pipe separator
      },
      resolveSymbol(symbolName: string, onSymbolResolvedCallback: any, onResolveErrorCallback: any) {
        const instrumentKey = this.extractInstrumentKey(symbolName);
        const displayName = this.extractDisplayName(symbolName);

        let symbolInfo: any = null;

        // Search NSE.json
        if (this.csvLoaded && this.csvSymbols.length > 0) {
          const foundSymbol = this.csvSymbols.find(
            (s) =>
              s.symbol === instrumentKey ||
              s.ticker === instrumentKey ||
              s.full_name === displayName ||
              s.instrument_key === instrumentKey ||
              s.symbol === symbolName ||
              s.ticker === symbolName ||
              s.full_name === symbolName ||
              s.instrument_key === symbolName,
          );

          if (foundSymbol) {
            symbolInfo = foundSymbol;
          }
        }
        console.log(symbolInfo);

        // Handle NSE_INDEX| format
        if (!symbolInfo && symbolName.includes("NSE_INDEX|")) {
          const indexName = symbolName.replace("NSE_INDEX|", "");

          symbolInfo = {
            symbol: symbolName,
            full_name: symbolName,
            ticker: indexName,
            name: indexName,
            description: `${indexName} Index`,
            type: "index",
            session: "0915-1530",
            timezone: "Asia/Kolkata",
            exchange: "NSE",
            minmov: 1,
            pricescale: 100,
            has_intraday: true,
            has_no_volume: false,
            has_weekly_and_monthly: true,
            supported_resolutions: this.configuration.supported_resolutions,
            volume_precision: 0,
            data_status: "streaming",
            instrument_key: symbolName,
            logo_urls: [
              this.getSymbolLogoFast({
                ticker: indexName,
                description: indexName,
                exchange: "NSE",
              })[0],
            ],
          };
        }

        // Fallback if not found
        if (!symbolInfo) {
          let exchange, ticker, instrumentKeyParsed;

          if (symbolName.includes("NSE_INDEX|")) {
            exchange = "NSE";
            ticker = symbolName.replace("NSE_INDEX|", "");
            instrumentKeyParsed = symbolName;
          } else if (symbolName.includes("|")) {
            const parts = symbolName.split("|");
            exchange = parts[0].split("_")[0] || "NSE";
            ticker = parts[1] || parts[0];
            instrumentKeyParsed = symbolName;
          } else {
            const exchangeMatch = symbolName.match(/^([A-Z]+):/);
            exchange = exchangeMatch ? exchangeMatch[1] : "NSE";
            ticker = symbolName.replace(/^[A-Z]+:/, "").replace(/-EQ$/, "");
            instrumentKeyParsed = symbolName;
          }

          const [logoUrl] = this.getSymbolLogoFast({
            ticker,
            description: ticker,
            exchange,
          });

          symbolInfo = {
            symbol: instrumentKeyParsed,
            full_name: displayName !== symbolName ? displayName : symbolName,
            ticker,
            name: displayName !== symbolName ? displayName : symbolName,
            description: displayName !== symbolName ? displayName : ticker,
            type: symbolName.includes("INDEX") ? "index" : "stock",
            session: "0915-1530",
            timezone: "Asia/Kolkata",
            exchange,
            minmov: 1,
            pricescale: 100,
            has_intraday: true,
            has_no_volume: false,
            has_weekly_and_monthly: true,
            supported_resolutions: this.configuration.supported_resolutions,
            volume_precision: 0,
            data_status: "streaming",
            instrument_key: instrumentKeyParsed,
            logo_urls: [logoUrl],
          };

          window.bars = {};
        }

        // Allow internal direct returns
        if (onSymbolResolvedCallback === true) {
          return symbolInfo;
        }

        setTimeout(() => onSymbolResolvedCallback(symbolInfo), 0);
      },

      async getBars(
        symbolInfo: any,
        resolution: string,
        periodParams: any,
        onHistoryCallback: Function,
        onErrorCallback: Function,
      ) {
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

          const interval = intervalMap[resolution] ?? "5minute";
          const fromDate = new Date(from * 1000).toISOString().split("T")[0];
          const toDate = new Date(to * 1000).toISOString().split("T")[0];
          const apiSymbol = symbolInfo.instrument_key || symbolInfo.symbol;

          const url = `https://runalgo.xyz/top/chart/upstox_data_fetcher.php?symbol=${encodeURIComponent(apiSymbol)}&interval=${interval}&from=${fromDate}&to=${toDate}`;

          const res = await fetch(url, {
            headers: { Accept: "*/*", Referer: "https://runalgo.xyz/top/chart/" },
          });

          if (!res.ok) return onHistoryCallback([], { noData: true });

          const data = await res.json();

          if (data?.bars?.length) {
            const bars = data.bars.map((bar: any) => ({
              time: bar.time,
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
              volume: bar.volume,
            }));
            onHistoryCallback(bars, { noData: false });
          } else {
            onHistoryCallback([], { noData: true });
          }
        } catch (e) {
          onErrorCallback(e);
        }
      },

      subscribeBars() {},
      unsubscribeBars() {},

      // Placeholder to avoid TS errors
      loadAvailableLogos() {},
      parseNSEJson(data: NseInstrument[]) {
        return data;
      },
    };

    try {
      const widget = new window.TradingView.widget({
        debug: false,
        fullscreen: false,
        autosize: true,
        symbol: chartSymbol,
        interval: "5",
        container: containerRef.current,
        datafeed: datafeed,
        library_path: "https://runalgo.xyz/top/chart/charting_library/",
        locale: "en",
        theme: isDark ? "dark" : "light",
        disabled_features: ["use_localstorage_for_settings", "open_account_manager", "trading_account_manager"],
        enabled_features: [
          "study_templates",
          "show_symbol_logos",
          "show_exchange_logos",
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
          "timeframes_toolbar",
          "edit_buttons_in_legend",
          "context_menus",
          "control_bar",
          "items_favoriting",
          "save_chart_properties_to_local_storage",
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

      widgetRef.current = widget;

      widget.onChartReady(() => {
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
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <Card className="p-0 overflow-hidden bg-card border-border relative">
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="gap-1.5 bg-background/80 backdrop-blur-sm"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading Chart...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-3 text-center p-4">
            <span className="text-destructive font-medium">{error}</span>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full h-[500px]" />
    </Card>
  );
};
