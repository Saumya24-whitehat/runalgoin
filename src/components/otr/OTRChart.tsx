import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, ColorType, LineSeries, LineStyle } from "lightweight-charts";

interface ChartDataPoint {
  time: string;
  toi: number;
  ema10: number | null;
  ema30: number | null;
  spotPrice: number;
  trend: "bullish" | "bearish" | "neutral";
}

interface CrossoverPoint {
  index: number;
  type: "bullish" | "bearish";
  time: string;
  toi: number;
}

interface OTRChartProps {
  data: ChartDataPoint[];
  crossoverPoints: CrossoverPoint[];
}

const OTRChart = ({ data, crossoverPoints }: OTRChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const toiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema10SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema30SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const spotSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const formatTOI = (value: number) => {
    if (Math.abs(value) >= 10000000) {
      return (value / 10000000).toFixed(1) + " Cr";
    } else if (Math.abs(value) >= 100000) {
      return (value / 100000).toFixed(1) + " L";
    }
    return value.toLocaleString("en-IN");
  };

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
      height: 480,
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      leftPriceScale: {
        visible: true,
        borderColor: "rgba(255, 255, 255, 0.1)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        visible: true,
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

    // Create TOI series (blue)
    const toiSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      title: "TOI (Put-Call)",
      priceScaleId: "right",
      priceFormat: {
        type: "custom",
        formatter: (price: number) => formatTOI(price),
      },
    });
    toiSeriesRef.current = toiSeries;

    // Create EMA 10 series (green)
    const ema10Series = chart.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 2,
      title: "EMA 10",
      priceScaleId: "right",
      priceFormat: {
        type: "custom",
        formatter: (price: number) => formatTOI(price),
      },
    });
    ema10SeriesRef.current = ema10Series;

    // Create EMA 30 series (red)
    const ema30Series = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 2,
      title: "EMA 30",
      priceScaleId: "right",
      priceFormat: {
        type: "custom",
        formatter: (price: number) => formatTOI(price),
      },
    });
    ema30SeriesRef.current = ema30Series;

    // Create Spot Price series (purple, dashed) on left scale
    const spotSeries = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: "Spot Price",
      priceScaleId: "left",
    });
    spotSeriesRef.current = spotSeries;

    console.log(data);
    // Prepare data - using index as time
    const toiData = data.map((item, idx) => ({
      time: item.displayTime / 1000,
      value: item.toi,
    }));

    // Filter out null values and reindex for EMA series
    let ema10Index = 0;
    const ema10Data: { time: any; value: number }[] = [];
    data.forEach((item, idx) => {
      if (item.ema10 !== null) {
        ema10Data.push({
          time: item.displayTime / 1000,
          value: item.ema10,
        });
      }
    });

    const ema30Data: { time: any; value: number }[] = [];
    data.forEach((item, idx) => {
      if (item.ema30 !== null) {
        ema30Data.push({
          time: item.displayTime / 1000,
          value: item.ema30,
        });
      }
    });

    const spotData = data.map((item, idx) => ({
      time: item.displayTime / 1000,
      value: item.spotPrice,
    }));

    toiSeries.setData(toiData as any);
    ema10Series.setData(ema10Data as any);
    ema30Series.setData(ema30Data as any);
    spotSeries.setData(spotData as any);

    // Add zero line
    toiSeries.createPriceLine({
      price: 0,
      color: "#6b7280",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: "Zero Line",
    });

    chart.timeScale().fitContent();
  }, [data, crossoverPoints]);

  if (data.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
    );
  }

  return (
    <div className="h-[500px]">
      <div className="flex items-center justify-center gap-4 mb-2 text-[10px] flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500" />
          <span className="text-muted-foreground">TOI (Put-Call)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-green-500" />
          <span className="text-muted-foreground">EMA 10</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-500" />
          <span className="text-muted-foreground">EMA 30</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-purple-500 border-b border-dashed" />
          <span className="text-muted-foreground">Spot Price</span>
        </div>
        {crossoverPoints.length > 0 && (
          <div className="flex items-center gap-2 ml-2">
            <span className="text-green-500">▲ Bullish</span>
            <span className="text-red-500">▼ Bearish</span>
          </div>
        )}
      </div>
      <div ref={containerRef} className="w-full h-[480px]" />
    </div>
  );
};

export default OTRChart;
