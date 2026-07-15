import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, IChartApi, ISeriesApi, ColorType, LineSeries, LineStyle } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpotVsVWAPChartProps {
  symbol: string;
  expiry: string;
}

interface PCRTimeData {
  time: string;
  underlyning: number;
  VWAP: number;
  Future: number;
  timestamp?: number;
}

export const SpotVsVWAPChart = ({ symbol, expiry }: SpotVsVWAPChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const spotSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const futureSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const isInitialFetch = useRef(true);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PCRTimeData[]>([]);

  const fetchData = useCallback(async () => {
    if (!symbol || !expiry) return;

    // Only show loading on initial fetch
    if (isInitialFetch.current) {
      setLoading(true);
    }

    try {
      const { data: result, error } = await supabase.functions.invoke("pcr-data", {
        body: {
          symbol,
          expiry_date: expiry,
          strikeCount: 5,
        },
      });

      if (error) throw error;
      if (result?.dataWhole) {
        setData(result.dataWhole);
      }
    } catch (err) {
      console.error("Error fetching PCR data for VWAP chart:", err);
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
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      width: containerRef.current.clientWidth,
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

    chartRef.current = chart;

    // Spot Price Series (underlying)
    spotSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 2,
      title: "Spot",
    });

    // Future Price Series
    futureSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      title: "Future",
    });

    // VWAP Series
    vwapSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      title: "VWAP",
    });

    const spotData: { time: any; value: number }[] = [];
    const futureData: { time: any; value: number }[] = [];
    const vwapData: { time: any; value: number }[] = [];

    let lastValidVWAP = 0;
    let lastValidFuture = 0;
    let lastValidSpot = 0;

    // Sort + dedupe by timestamp. Shift by IST offset (+5h30m) so
    // lightweight-charts (which renders in UTC) shows IST wall-clock times.
    const IST_OFFSET_SEC = 5.5 * 3600;
    const seen = new Set<number>();
    const sorted = [...data]
      .filter((d) => Number.isFinite(d.timestamp as number))
      .sort((a, b) => (a.timestamp as number) - (b.timestamp as number))
      .filter((d) => {
        const t = Math.floor((d.timestamp as number) / 1000) + IST_OFFSET_SEC;
        if (seen.has(t)) return false;
        seen.add(t);
        return true;
      });

    sorted.forEach((item) => {
      const t = Math.floor((item.timestamp as number) / 1000) + IST_OFFSET_SEC;

      // Spot (underlying)
      let spotValue = item.underlyning || 0;
      if (spotValue === 0) {
        if (lastValidSpot > 0) spotValue = lastValidSpot;
      } else {
        lastValidSpot = spotValue;
      }
      if (spotValue > 0) spotData.push({ time: t, value: spotValue });

      // Future
      let futureValue = item.Future || 0;
      if (futureValue === 0) {
        if (lastValidFuture > 0) futureValue = lastValidFuture;
      } else {
        lastValidFuture = futureValue;
      }
      if (futureValue > 0) futureData.push({ time: t, value: futureValue });

      // VWAP
      let vwapValue = item.VWAP || 0;
      if (vwapValue === 0) {
        if (lastValidVWAP > 0) vwapValue = lastValidVWAP;
      } else {
        lastValidVWAP = vwapValue;
      }
      if (vwapValue > 0) vwapData.push({ time: t, value: vwapValue });
    });

    spotSeriesRef.current.setData(spotData);
    futureSeriesRef.current.setData(futureData);
    vwapSeriesRef.current.setData(vwapData);

    chart.timeScale().fitContent();

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Get latest data with valid VWAP + Future
  const getLatestData = () => {
    if (data.length === 0) return null;
    let vwap = 0;
    let future = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (!vwap && data[i].VWAP && data[i].VWAP > 0) vwap = data[i].VWAP;
      if (!future && data[i].Future && data[i].Future > 0) future = data[i].Future;
      if (vwap && future) break;
    }
    return {
      spot: data[data.length - 1].underlyning,
      vwap,
      future,
    };
  };

  const latestData = getLatestData();
  const spotAboveVWAP = latestData && latestData.vwap > 0 ? latestData.spot >= latestData.vwap : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LineChart className="h-4 w-4 text-primary" />
            Spot vs Future vs VWAP
          </CardTitle>
          {latestData && (
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Spot:</span>
                <span className="font-medium">{latestData.spot?.toFixed(2)}</span>
              </span>
              {latestData.future > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">Future:</span>
                  <span className="font-medium">{latestData.future?.toFixed(2)}</span>
                </span>
              )}
              {latestData.vwap > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-muted-foreground">VWAP:</span>
                  <span className="font-medium">{latestData.vwap?.toFixed(2)}</span>
                </span>
              )}
              {spotAboveVWAP !== null && (
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded",
                    spotAboveVWAP ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive",
                  )}
                >
                  {spotAboveVWAP ? "Above" : "Below"}
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {loading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        ) : (
          <div ref={containerRef} className="w-full h-[200px]" />
        )}
      </CardContent>
    </Card>
  );
};
