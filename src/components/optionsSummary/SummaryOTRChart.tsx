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
  timestamp?: number;
}

export const SummaryOTRChart = ({ symbol, expiry }: SummaryOTRChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const pcrOISeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const pcrCOISeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OTRDataPoint[]>([]);

  const fetchData = useCallback(async () => {
    if (!symbol || !expiry) return;
    
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("otr-data", {
        body: {
          symbol,
          expiry,
          strikeCount: 7,
          tf: "1min",
        },
      });

      if (error) throw error;
      if (result?.data) {
        setData(result.data);
      }
    } catch (err) {
      console.error("Error fetching OTR data:", err);
    } finally {
      setLoading(false);
    }
  }, [symbol, expiry]);

  useEffect(() => {
    fetchData();
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
        visible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    chartRef.current = chart;

    // PCR OI Series
    pcrOISeriesRef.current = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      title: "PCR OI",
    });

    // PCR COI Series
    pcrCOISeriesRef.current = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      title: "PCR COI",
    });

    // Prepare data
    const pcrOIData = data.map((item, idx) => ({
      time: idx as any,
      value: item.Combined_PCR_OI || 0,
    }));

    const pcrCOIData = data.map((item, idx) => ({
      time: idx as any,
      value: item.Combined_PCR_COI || 0,
    }));

    pcrOISeriesRef.current.setData(pcrOIData);
    pcrCOISeriesRef.current.setData(pcrCOIData);

    // Add reference lines
    pcrOISeriesRef.current.createPriceLine({
      price: 1,
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

  const latestData = data.length > 0 ? data[data.length - 1] : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            OTR (PCR Trend)
          </CardTitle>
          {latestData && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">OI:</span>
                <span className="font-medium">{latestData.Combined_PCR_OI?.toFixed(2)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">COI:</span>
                <span className="font-medium">{latestData.Combined_PCR_COI?.toFixed(2)}</span>
              </span>
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
