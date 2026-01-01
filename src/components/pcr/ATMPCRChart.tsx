import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, ColorType, LineSeries, AreaSeries, LineStyle } from "lightweight-charts";

interface ATMPCRChartProps {
  data: { time: string; atmPCR: number; atmStrike: string }[];
}

const ATMPCRChart = ({ data }: ATMPCRChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const pcrSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);

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

    // Create ATM PCR area series (purple)
    const pcrSeries = chart.addSeries(AreaSeries, {
      lineColor: "#8b5cf6",
      topColor: "rgba(139, 92, 246, 0.4)",
      bottomColor: "rgba(139, 92, 246, 0.05)",
      lineWidth: 2,
      title: "ATM PCR",
      priceLineVisible: true,
      lastValueVisible: true,
    });
    pcrSeriesRef.current = pcrSeries;

    // Prepare data
    const pcrData = data.map((item, idx) => ({
      time: idx as any,
      value: item.atmPCR,
    }));

    pcrSeries.setData(pcrData);

    // Add reference lines for PCR thresholds
    pcrSeries.createPriceLine({
      price: 1.25,
      color: "#10b981",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "1.25",
    });

    pcrSeries.createPriceLine({
      price: 0.8,
      color: "#ef4444",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "0.80",
    });

    pcrSeries.createPriceLine({
      price: 1.0,
      color: "#6b7280",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
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
          <div className="w-3 h-3 bg-purple-500 rounded" />
          <span className="text-muted-foreground">ATM PCR</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-green-500" />
          <span className="text-muted-foreground">1.25 (Bullish)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-500" />
          <span className="text-muted-foreground">0.80 (Bearish)</span>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[230px]" />
    </div>
  );
};

export default ATMPCRChart;
