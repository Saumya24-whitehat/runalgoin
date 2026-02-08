import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, IChartApi, ISeriesApi, LineStyle, ColorType, LineSeries } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchKundaliData, KundaliTimeData } from "@/services/kundaliApi";
import { Target } from "lucide-react";

interface SummarySupportResistanceChartProps {
  symbol: string;
  expiry: string;
}

export const SummarySupportResistanceChart = ({ symbol, expiry }: SummarySupportResistanceChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const spotSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const resistanceSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const supportSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [loading, setLoading] = useState(false);
  const [kundaliData, setKundaliData] = useState<KundaliTimeData[]>([]);

  const fetchData = useCallback(async () => {
    if (!symbol || !expiry) return;
    
    setLoading(true);
    try {
      const result = await fetchKundaliData(symbol, expiry, 100);
      if (result.dataWhole && result.dataWhole.length > 0) {
        setKundaliData(result.dataWhole);
      }
    } catch (err) {
      console.error("Error fetching kundali data:", err);
    } finally {
      setLoading(false);
    }
  }, [symbol, expiry]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!chartContainerRef.current || kundaliData.length === 0) return;

    // Cleanup previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    chartRef.current = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 200,
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        visible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    // Create series
    spotSeriesRef.current = chartRef.current.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      title: "Spot",
    });

    resistanceSeriesRef.current = chartRef.current.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 1,
      title: "R1",
      lineStyle: LineStyle.Solid,
    });

    supportSeriesRef.current = chartRef.current.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 1,
      title: "S1",
      lineStyle: LineStyle.Solid,
    });

    // Prepare data
    const spotData: { time: number; value: number }[] = [];
    const resistanceData: { time: number; value: number }[] = [];
    const supportData: { time: number; value: number }[] = [];

    kundaliData.forEach((item, index) => {
      spotData.push({ time: index, value: item.underlyning || 0 });
      resistanceData.push({ time: index, value: item.max_ce_strike || 0 });
      supportData.push({ time: index, value: item.max_pe_strike || 0 });
    });

    spotSeriesRef.current.setData(spotData as any);
    resistanceSeriesRef.current.setData(resistanceData as any);
    supportSeriesRef.current.setData(supportData as any);

    chartRef.current?.timeScale().fitContent();

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [kundaliData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  const latestData = kundaliData.length > 0 ? kundaliData[kundaliData.length - 1] : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Support & Resistance
          </CardTitle>
          {latestData && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-medium">{latestData.underlyning?.toFixed(0)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">R:</span>
                <span className="font-medium text-destructive">{latestData.max_ce_strike}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">S:</span>
                <span className="font-medium text-success">{latestData.max_pe_strike}</span>
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {loading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : kundaliData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        ) : (
          <div ref={chartContainerRef} className="w-full h-[200px]" />
        )}
      </CardContent>
    </Card>
  );
};
