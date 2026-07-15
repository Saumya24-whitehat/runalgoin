import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, IChartApi, ISeriesApi, ColorType, LineSeries, LineStyle } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";

interface SummaryOTRChartProps {
  symbol: string;
  expiry: string;
}

interface OTRDataPoint {
  Time: string;
  Combined_PCR_OI: number;
  Combined_PCR_COI: number;
  Spot_Price: number;
  Total_Put_OI: number;
  Total_Call_OI: number;
}

// Calculate EMA
const calculateEMA = (data: number[], period: number): (number | null)[] => {
  const ema: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(null);
    } else if (i === period - 1) {
      // First EMA is SMA
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      ema.push(sum / period);
    } else {
      const prevEma = ema[i - 1];
      if (prevEma !== null) {
        ema.push((data[i] - prevEma) * multiplier + prevEma);
      } else {
        ema.push(null);
      }
    }
  }
  return ema;
};

export const SummaryOTRChart = ({ symbol, expiry }: SummaryOTRChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const toiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema10SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema30SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const isInitialFetch = useRef(true);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OTRDataPoint[]>([]);

  const fetchData = useCallback(async () => {
    if (!symbol || !expiry) return;

    // Only show loading on initial fetch
    if (isInitialFetch.current) {
      setLoading(true);
    }

    try {
      const { data: result, error } = await supabase.functions.invoke("otr-data", {
        body: {
          symbol,
          expiry,
          strikeCount: 7,
          tf: "3min",
        },
      });

      if (error) throw error;
      if (result?.dataFinal) {
        setData(result.dataFinal);
      }
    } catch (err) {
      console.error("Error fetching OTR data:", err);
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
      rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.1)" },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        visible: true,
        timeVisible: true,
      },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    // Normalize + dedupe + sort by time before EMA calculation
    // dataFinal comes as [timestamp_ms, value] tuples
    const normalized = (data as any[])
      .map((d) => ({
        time: Number(d?.[0]),
        value: Number(d?.[1]),
      }))
      .filter((d) => Number.isFinite(d.time) && Number.isFinite(d.value))
      .sort((a, b) => a.time - b.time);

    // Dedupe by timestamp (keep last). Shift by IST offset so the chart
    // (which renders in UTC) displays IST wall-clock times.
    const IST_OFFSET_SEC = 5.5 * 3600;
    const dedupedMap = new Map<number, number>();
    normalized.forEach((d) => dedupedMap.set(Math.floor(d.time / 1000) + IST_OFFSET_SEC, d.value));
    const series = Array.from(dedupedMap.entries())
      .map(([time, value]) => ({ time, value }))
      .sort((a, b) => a.time - b.time);

    const toiValues = series.map((s) => s.value);
    const ema10Values = calculateEMA(toiValues, 10);
    const ema30Values = calculateEMA(toiValues, 30);

    // TOI (dataFinal) Series - Blue
    toiSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      title: "TOI",
    });

    // EMA 10 Series - Green
    ema10SeriesRef.current = chart.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 1,
      title: "EMA 10",
    });

    // EMA 30 Series - Red
    ema30SeriesRef.current = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 1,
      title: "EMA 30",
    });

    const toiData = series.map((s) => ({ time: s.time, value: s.value }));
    const ema10Data = ema10Values
      .map((v, i) => (v !== null && Number.isFinite(v) ? { time: series[i].time, value: v } : null))
      .filter(Boolean) as { time: number; value: number }[];
    const ema30Data = ema30Values
      .map((v, i) => (v !== null && Number.isFinite(v) ? { time: series[i].time, value: v } : null))
      .filter(Boolean) as { time: number; value: number }[];

    toiSeriesRef.current.setData(toiData as any);
    ema10SeriesRef.current.setData(ema10Data as any);
    ema30SeriesRef.current.setData(ema30Data as any);

    // Add zero line
    toiSeriesRef.current.createPriceLine({
      price: 0,
      color: "#6b7280",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
    });

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

  // Calculate latest values
  const getLatestValues = () => {
    if (data.length === 0) return null;

    const toiValues = data.map((d) => (d.Total_Put_OI || 0) - (d.Total_Call_OI || 0));
    const ema10Values = calculateEMA(toiValues, 10);
    const ema30Values = calculateEMA(toiValues, 30);

    const latestTOI = toiValues[toiValues.length - 1];
    const latestEMA10 = ema10Values[ema10Values.length - 1];
    const latestEMA30 = ema30Values[ema30Values.length - 1];

    return { toi: latestTOI, ema10: latestEMA10, ema30: latestEMA30 };
  };

  const latestValues = getLatestValues();

  // Determine trend
  const getTrend = () => {
    if (!latestValues || latestValues.ema10 === null || latestValues.ema30 === null) return null;

    if (latestValues.ema10 > latestValues.ema30 && latestValues.toi > latestValues.ema10) {
      return { text: "Bullish", color: "text-success" };
    }
    if (latestValues.ema10 < latestValues.ema30 && latestValues.toi < latestValues.ema10) {
      return { text: "Bearish", color: "text-destructive" };
    }
    return { text: "Neutral", color: "text-warning" };
  };

  const trend = getTrend();

  // Format TOI value
  const formatTOI = (value: number) => {
    if (Math.abs(value) >= 10000000) {
      return (value / 10000000).toFixed(1) + " Cr";
    } else if (Math.abs(value) >= 100000) {
      return (value / 100000).toFixed(1) + " L";
    }
    return value.toLocaleString("en-IN");
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            OTR (TOI with EMA)
          </CardTitle>
          <div className="flex items-center gap-3 text-xs">
            {latestValues && (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">TOI:</span>
                  <span className="font-medium">{formatTOI(latestValues.toi)}</span>
                </span>
                {trend && <span className={`font-medium ${trend.color}`}>{trend.text}</span>}
              </>
            )}
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] mt-1">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500" />
            <span className="text-muted-foreground">TOI</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-green-500" />
            <span className="text-muted-foreground">EMA 10</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-500" />
            <span className="text-muted-foreground">EMA 30</span>
          </span>
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
