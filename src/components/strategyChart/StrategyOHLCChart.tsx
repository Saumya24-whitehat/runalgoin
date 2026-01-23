import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickSeries, HistogramSeries, LineStyle } from "lightweight-charts";
import { OHLCDataPoint } from "@/services/strategyChartApi";

interface StrategyOHLCChartProps {
  data: OHLCDataPoint[];
}

const StrategyOHLCChart = ({ data }: StrategyOHLCChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // Cleanup previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      width: containerRef.current.clientWidth,
      height: 400,
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "rgba(255, 255, 255, 0.3)",
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.3)",
          width: 1,
          style: LineStyle.Dashed,
        },
      },
    });

    chartRef.current = chart;

    // Create candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    candleSeriesRef.current = candleSeries;

    // Create volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#3b82f6",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Prepare candlestick data
    const candleData = data.map((item) => ({
      time: Math.floor(item.timestamp / 1000) as any,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    // Prepare volume data with colors based on candle direction
    const volumeData = data.map((item) => ({
      time: Math.floor(item.timestamp / 1000) as any,
      value: item.volume,
      color: item.close >= item.open ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && chart) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chart) {
        chart.remove();
      }
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
        No data available
      </div>
    );
  }

  // Calculate summary stats
  const latestCandle = data[data.length - 1];
  const firstCandle = data[0];
  const priceChange = latestCandle.close - firstCandle.open;
  const priceChangePercent = (priceChange / firstCandle.open) * 100;
  const totalVolume = data.reduce((sum, d) => sum + d.volume, 0);

  return (
    <div className="space-y-2">
      {/* Summary stats */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">O:</span>
          <span className="font-mono">{latestCandle.open.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">H:</span>
          <span className="font-mono text-call-color">{latestCandle.high.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">L:</span>
          <span className="font-mono text-put-color">{latestCandle.low.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">C:</span>
          <span className="font-mono">{latestCandle.close.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Chg:</span>
          <span className={`font-mono ${priceChange >= 0 ? "text-call-color" : "text-put-color"}`}>
            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Vol:</span>
          <span className="font-mono">{totalVolume.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Chart container */}
      <div ref={containerRef} className="w-full h-[400px]" />
    </div>
  );
};

export default StrategyOHLCChart;
