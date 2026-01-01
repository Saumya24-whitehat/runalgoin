import { useEffect, useRef, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, LineSeries, LineStyle } from 'lightweight-charts';

interface OptionBuilderChartProps {
  expiryData: [number, number][];
  todayData: [number, number][];
  currentPrice: number;
}

const OptionBuilderChart = ({ expiryData, todayData, currentPrice }: OptionBuilderChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const expirySeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const todaySeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const chartData = useMemo(() => {
    return expiryData.map(([price, expiryPL], index) => ({
      price,
      expiryPL,
      todayPL: todayData[index]?.[1] ?? 0,
    }));
  }, [expiryData, todayData]);

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    if (Math.abs(value) >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value.toFixed(0)}`;
  };

  useEffect(() => {
    if (!containerRef.current || chartData.length === 0) return;

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
      height: 270,
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

    // Create expiry P/L line (green)
    const expirySeries = chart.addSeries(LineSeries, {
      color: '#22c55e',
      lineWidth: 2,
      title: 'P/L at Expiry',
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => formatValue(price),
      },
    });
    expirySeriesRef.current = expirySeries;

    // Create today P/L line (gray dashed)
    const todaySeries = chart.addSeries(LineSeries, {
      color: '#9ca3af',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      title: 'P/L Today',
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => formatValue(price),
      },
    });
    todaySeriesRef.current = todaySeries;

    // Prepare data
    const expiryLineData = chartData.map((point, index) => ({
      time: index as any,
      value: point.expiryPL,
    }));

    const todayLineData = chartData.map((point, index) => ({
      time: index as any,
      value: point.todayPL,
    }));

    expirySeries.setData(expiryLineData);
    todaySeries.setData(todayLineData);
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
  }, [chartData, currentPrice]);

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Add positions to see P/L chart
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <div className="flex items-center justify-center gap-6 mb-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-500" />
          <span className="text-foreground">P/L at Expiry</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-gray-400 border-b-2 border-dashed border-gray-400" />
          <span className="text-foreground">P/L Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-foreground">Spot: ₹{currentPrice}</span>
        </div>
      </div>
      <div ref={containerRef} className="w-full" style={{ height: 270 }} />
    </div>
  );
};

export default OptionBuilderChart;
