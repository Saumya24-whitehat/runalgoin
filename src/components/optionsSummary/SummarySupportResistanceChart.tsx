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
  const isInitialFetch = useRef(true);

  const [loading, setLoading] = useState(true);
  const [kundaliData, setKundaliData] = useState<KundaliTimeData[]>([]);

  const fetchData = useCallback(async () => {
    if (!symbol || !expiry) return;

    // Only show loading on initial fetch
    if (isInitialFetch.current) {
      setLoading(true);
    }

    try {
      const result = await fetchKundaliData(symbol, expiry, 100);
      if (result.dataWhole && result.dataWhole.length > 0) {
        setKundaliData(result.dataWhole);
      }
    } catch (err) {
      console.error("Error fetching kundali data:", err);
    } finally {
      if (isInitialFetch.current) {
        setLoading(false);
        isInitialFetch.current = false;
      }
    }
  }, [symbol, expiry]);

  useEffect(() => {
    // Reset initial fetch flag when symbol/expiry changes
    isInitialFetch.current = true;
    fetchData();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
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
        visible: true,
        timeVisible: true,
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

    // Prepare data. Parse "HH:MM" as IST wall-clock time on today's IST date
    // and encode as a UTC timestamp so lightweight-charts (UTC renderer)
    // displays the correct IST time on the x-axis.
    const spotData: { time: number; value: number }[] = [];
    const resistanceData: { time: number; value: number }[] = [];
    const supportData: { time: number; value: number }[] = [];

    // Today's date in IST (YYYY, MM, DD)
    const nowIST = new Date(Date.now() + 5.5 * 3600 * 1000);
    const y = nowIST.getUTCFullYear();
    const m = nowIST.getUTCMonth();
    const d = nowIST.getUTCDate();

    const seenTimes = new Set<number>();
    kundaliData.forEach((item) => {
      if (!item.time || typeof item.time !== "string") return;
      const parts = item.time.split(":");
      const hh = parseInt(parts[0], 10);
      const mm = parseInt(parts[1] ?? "0", 10);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
      const t = Math.floor(Date.UTC(y, m, d, hh, mm) / 1000);
      if (seenTimes.has(t)) return;
      seenTimes.add(t);
      spotData.push({ time: t, value: item.underlyning || 0 });
      resistanceData.push({ time: t, value: item.max_ce_strike || 0 });
      supportData.push({ time: t, value: item.max_pe_strike || 0 });
    });

    spotData.sort((a, b) => a.time - b.time);
    resistanceData.sort((a, b) => a.time - b.time);
    supportData.sort((a, b) => a.time - b.time);

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
