import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, ColorType, LineSeries, LineStyle } from "lightweight-charts";

interface MaxPainChartProps {
  data: { time: string; index: number; maxPain: number }[];
  currentMaxPain: number;
}

const MaxPainChart = ({ data, currentMaxPain }: MaxPainChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const indexSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const maxPainSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

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
      height: 220,
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
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

    // Create Index Price series
    const indexSeries = chart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 2,
      title: "Nifty Price",
      priceLineVisible: true,
      lastValueVisible: true,
    });
    indexSeriesRef.current = indexSeries;

    // Create Max Pain series (step line)
    const maxPainSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      title: "Max Pain",
      priceLineVisible: true,
      lastValueVisible: true,
    });
    maxPainSeriesRef.current = maxPainSeries;

    // Prepare data
    const indexData = data.map((item, idx) => ({
      time: idx as any,
      value: item.index,
    }));

    const maxPainData = data.map((item, idx) => ({
      time: idx as any,
      value: item.maxPain,
    }));

    indexSeries.setData(indexData);
    maxPainSeries.setData(maxPainData);

    // Add current max pain price line
    maxPainSeries.createPriceLine({
      price: currentMaxPain,
      color: "#ef4444",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `Current: ${currentMaxPain}`,
    });

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, currentMaxPain]);

  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="h-[220px]">
      <div className="flex items-center justify-center gap-4 mb-2 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-purple-500" />
          <span className="text-muted-foreground">Nifty Price</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500 border-b border-dashed" />
          <span className="text-muted-foreground">Max Pain</span>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[200px]" />
    </div>
  );
};

export default MaxPainChart;
