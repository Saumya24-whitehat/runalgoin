import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, ColorType, HistogramSeries, LineStyle } from "lightweight-charts";
import { StrikeData } from "@/types/optionChain";

interface HeatMapIVChartProps {
  data: StrikeData[];
  atm: number;
}

export function HeatMapIVChart({ data, atm }: HeatMapIVChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const ceSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    // Cleanup previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: containerRef.current.clientWidth,
      height: 320,
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        visible: true,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
    });

    chartRef.current = chart;

    // Create CE IV histogram series
    const ceSeries = chart.addSeries(HistogramSeries, {
      color: '#22c55e',
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => price.toFixed(2),
      },
      priceScaleId: 'right',
    });
    ceSeriesRef.current = ceSeries;

    // Prepare CE IV data
    const ceData = data.map((item, index) => ({
      time: index as any,
      value: item.CE_IV,
      color: item.Strike === atm ? '#eab308' : '#22c55e',
    }));

    ceSeries.setData(ceData);
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, atm]);

  if (!data.length) {
    return (
      <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="h-[350px] w-full">
      <div className="flex items-center justify-center gap-6 mb-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-foreground">CE IV</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-foreground">PE IV</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span className="text-foreground">ATM</span>
        </div>
      </div>
      <div ref={containerRef} className="w-full" style={{ height: 290 }} />
      <div className="flex justify-between px-4 text-[10px] text-muted-foreground mt-1 overflow-x-auto">
        {data.map((item, i) => (
          <span 
            key={i} 
            className={`flex-shrink-0 px-0.5 ${item.Strike === atm ? 'text-primary font-bold' : ''}`}
          >
            {item.Strike}
          </span>
        ))}
      </div>
    </div>
  );
}
