import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, ColorType, LineSeries, LineStyle } from "lightweight-charts";

interface SpotMMAChartProps {
  data: { time: string; spotPrice: number; mma: number }[];
}

const SpotMMAChart = ({ data }: SpotMMAChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const spotSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const mmaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

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
      height: 230,
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

    // Create Spot Price series (blue)
    const spotSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      title: "Spot Price",
      priceLineVisible: true,
      lastValueVisible: true,
    });
    spotSeriesRef.current = spotSeries;

    // Create MMA series (orange, dashed)
    const mmaSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      title: "MMA",
      priceLineVisible: true,
      lastValueVisible: true,
    });
    mmaSeriesRef.current = mmaSeries;

    // Prepare data
    const spotData = data.map((item, idx) => ({
      time: idx as any,
      value: item.spotPrice,
    }));

    const mmaData = data.map((item, idx) => ({
      time: idx as any,
      value: item.mma,
    }));

    spotSeries.setData(spotData);
    mmaSeries.setData(mmaData);

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
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="h-[250px]">
      <div className="flex items-center justify-center gap-4 mb-2 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500" />
          <span className="text-muted-foreground">Spot Price</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-amber-500 border-b border-dashed" />
          <span className="text-muted-foreground">MMA</span>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[230px]" />
    </div>
  );
};

export default SpotMMAChart;
