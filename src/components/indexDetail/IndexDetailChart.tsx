import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    TradingView: any;
    tvWidgetIndexDetail: any;
  }
}

interface IndexDetailChartProps {
  indexName: string;
}

export const IndexDetailChart = ({ indexName }: IndexDetailChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map index name to TradingView symbol
  const getChartSymbol = (name: string): string => {
    const symbolMap: Record<string, string> = {
      'NIFTY 50': 'NSE_INDEX|Nifty 50',
      'Nifty 50': 'NSE_INDEX|Nifty 50',
      'NIFTY BANK': 'NSE_INDEX|Nifty Bank',
      'Nifty Bank': 'NSE_INDEX|Nifty Bank',
      'NIFTY IT': 'NSE_INDEX|Nifty IT',
      'NIFTY METAL': 'NSE_INDEX|Nifty Metal',
      'NIFTY PHARMA': 'NSE_INDEX|Nifty Pharma',
      'NIFTY AUTO': 'NSE_INDEX|Nifty Auto',
      'NIFTY ENERGY': 'NSE_INDEX|Nifty Energy',
      'NIFTY FMCG': 'NSE_INDEX|Nifty FMCG',
      'NIFTY REALTY': 'NSE_INDEX|Nifty Realty',
      'NIFTY INFRA': 'NSE_INDEX|Nifty Infra',
      'NIFTY PSE': 'NSE_INDEX|Nifty PSE',
      'NIFTY MEDIA': 'NSE_INDEX|Nifty Media',
      'NIFTY PRIVATE BANK': 'NSE_INDEX|Nifty Private Bank',
      'NIFTY PSU BANK': 'NSE_INDEX|Nifty PSU Bank',
      'NIFTY FIN SERVICE': 'NSE_INDEX|Nifty Financial Services',
    };
    return symbolMap[name] || `NSE_INDEX|${name}`;
  };

  useEffect(() => {
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
          if (!document.querySelector(`script[src="${mainScript.src}"]`)) {
            document.head.appendChild(mainScript);
          } else {
            resolve();
          }
        });

        // Load datafeed
        const datafeedScript = document.createElement("script");
        datafeedScript.src = "https://runalgo.xyz/top/chart/datafeeds/tv-datafeed.js";
        datafeedScript.async = true;

        await new Promise<void>((resolve, reject) => {
          datafeedScript.onload = () => resolve();
          datafeedScript.onerror = () => reject(new Error("Failed to load datafeed"));
          if (!document.querySelector(`script[src="${datafeedScript.src}"]`)) {
            document.head.appendChild(datafeedScript);
          } else {
            resolve();
          }
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

        initializeWidget();
      } catch (err) {
        console.error("Error loading TradingView:", err);
        setError(err instanceof Error ? err.message : "Failed to load chart");
        setIsLoading(false);
      }
    };

    loadTradingViewScripts();

    return () => {
      if (window.tvWidgetIndexDetail) {
        try {
          window.tvWidgetIndexDetail.remove();
        } catch (e) {
          console.log("Widget cleanup error:", e);
        }
      }
    };
  }, [indexName]);

  const initializeWidget = () => {
    if (!containerRef.current || !window.TradingView) return;

    const isDark = document.documentElement.classList.contains("dark");
    const chartSymbol = getChartSymbol(indexName);

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
              ],
              symbols_types: [
                { name: "All types", value: "" },
                { name: "Index", value: "index" },
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
          onResultReadyCallback([]);
        }
      },
      resolveSymbol: (symbolName: string, onSymbolResolvedCallback: Function, onResolveErrorCallback: Function) => {
        setTimeout(() => {
          const parts = symbolName.split("|");
          const ticker = parts.length > 1 ? parts[1] : symbolName;

          onSymbolResolvedCallback({
            symbol: symbolName,
            full_name: symbolName,
            ticker: ticker,
            name: ticker,
            description: ticker,
            type: "index",
            session: "0915-1530",
            timezone: "Asia/Kolkata",
            exchange: "NSE",
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
            "1": "1minute", "3": "3minute", "5": "5minute", "10": "10minute",
            "15": "15minute", "30": "30minute", "45": "30minute", "60": "1hour",
            "120": "1hour", "180": "1hour", "240": "1hour", "1D": "1day",
            D: "1day", "1W": "1week", W: "1week", "1M": "1month", M: "1month",
          };

          const interval = intervalMap[resolution] || "5minute";
          const fromDate = new Date(from * 1000).toISOString().split("T")[0];
          const toDate = new Date(to * 1000).toISOString().split("T")[0];

          const apiSymbol = symbolInfo.instrument_key || symbolInfo.symbol || chartSymbol;
          const url = `https://runalgo.xyz/top/chart/upstox_data_fetcher.php?symbol=${encodeURIComponent(apiSymbol)}&interval=${interval}&from=${fromDate}&to=${toDate}`;

          const response = await fetch(url, {
            headers: { Accept: "*/*", Referer: "https://runalgo.xyz/top/chart/" },
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.bars && data.bars.length > 0) {
              const bars = data.bars.map((bar: any) => ({
                time: bar.time, open: bar.open, high: bar.high,
                low: bar.low, close: bar.close, volume: bar.volume, oi: bar.oi,
              }));
              onHistoryCallback(bars, { noData: false });
            } else {
              onHistoryCallback([], { noData: true });
            }
          } else {
            onHistoryCallback([], { noData: true });
          }
        } catch (e) {
          onErrorCallback(e);
        }
      },
      subscribeBars: () => {},
      unsubscribeBars: () => {},
    };

    try {
      const widget = new window.TradingView.widget({
        debug: false,
        fullscreen: false,
        autosize: true,
        width: "100%",
        height: "100%",
        symbol: chartSymbol,
        interval: "5",
        container: containerRef.current,
        datafeed: datafeed,
        library_path: "https://runalgo.xyz/top/chart/charting_library/",
        locale: "en",
        timezone: "Asia/Kolkata",
        theme: isDark ? "dark" : "light",
        disabled_features: ["use_localstorage_for_settings"],
        enabled_features: [
          "study_templates", "show_symbol_logos", "create_volume_indicator_by_default",
          "header_indicators", "header_chart_type", "header_resolutions",
          "timeframes_toolbar", "context_menus", "control_bar",
        ],
        overrides: {
          "mainSeriesProperties.candleStyle.upColor": "#4CAF50",
          "mainSeriesProperties.candleStyle.downColor": "#F44336",
          "mainSeriesProperties.candleStyle.borderUpColor": "#4CAF50",
          "mainSeriesProperties.candleStyle.borderDownColor": "#F44336",
          "mainSeriesProperties.candleStyle.wickUpColor": "#4CAF50",
          "mainSeriesProperties.candleStyle.wickDownColor": "#F44336",
        },
      });

      window.tvWidgetIndexDetail = widget;

      widget.onChartReady(() => {
        setIsLoading(false);
      });
    } catch (err) {
      setError("Failed to initialize chart");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative border border-border rounded-lg overflow-hidden bg-card min-h-[500px]">
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

      <div
        ref={containerRef}
        className="w-full min-h-[500px]"
        style={{ height: "calc(100vh - 300px)" }}
      />
    </div>
  );
};
