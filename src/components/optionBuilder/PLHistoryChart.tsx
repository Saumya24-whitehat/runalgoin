import { useEffect, useRef, useMemo } from "react";
import { createChart, IChartApi, ISeriesApi, ColorType, LineSeries, LineStyle } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PLHistoryPoint {
  time: string;
  pnl: number;
  spotPrice: number;
}

interface PLHistoryChartProps {
  history: PLHistoryPoint[];
}

const PLHistoryChart = ({ history }: PLHistoryChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const chartData = useMemo(() => {
    return history.map((point, index) => ({
      time: index as any,
      value: point.pnl,
      displayTime: point.time.replace(/^(\d{2})(\d{2})$/, "$1:$2"),
    }));
  }, [history]);

  const currentPnL = chartData[chartData.length - 1]?.value || 0;

  const formatPnL = (value: number) => {
    if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toFixed(0)}`;
  };

  useEffect(() => {
    if (!containerRef.current || history.length === 0) return;

    // Cleanup previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const lineColor = currentPnL >= 0 ? '#22c55e' : '#ef4444';

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
      height: 120,
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

    // Create P&L line series
    const series = chart.addSeries(LineSeries, {
      color: lineColor,
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => formatPnL(price),
      },
    });
    seriesRef.current = series;

    // Set data
    series.setData(chartData);
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
  }, [history, chartData, currentPnL]);

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm">P&L History</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            P&L history will appear as you move through time
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">P&L History</CardTitle>
          <div
            className={`text-sm font-semibold ${
              currentPnL >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {currentPnL >= 0 ? "+" : ""}
            {formatPnL(currentPnL)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div ref={containerRef} className="h-[120px] w-full" />
      </CardContent>
    </Card>
  );
};

export default PLHistoryChart;
