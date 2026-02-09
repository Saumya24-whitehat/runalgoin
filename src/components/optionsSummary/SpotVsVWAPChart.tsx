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

    // Spot Price Series
    spotSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 2,
      title: "Spot",
    });

    // VWAP Series
    vwapSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      title: "VWAP",
    });

    // Prepare data - filter out 0 VWAP or use previous value
    const spotData: { time: any; value: number }[] = [];
    const vwapData: { time: any; value: number }[] = [];
    
    let lastValidVWAP = 0;
    
    data.forEach((item, idx) => {
      // Always add spot data
      spotData.push({
        time: idx as any,
        value: item.underlyning || 0,
      });
      
      // Handle VWAP - skip if 0, or use previous valid value
      let vwapValue = item.VWAP || 0;
      
      if (vwapValue === 0) {
        // Use previous valid VWAP if available
        if (lastValidVWAP > 0) {
          vwapValue = lastValidVWAP;
        } else {
          // Skip this point if no valid VWAP yet
          return;
        }
      } else {
        lastValidVWAP = vwapValue;
      }
      
      vwapData.push({
        time: idx as any,
        value: vwapValue,
      });
    });

    spotSeriesRef.current.setData(spotData);
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

  // Get latest data with valid VWAP
  const getLatestData = () => {
    if (data.length === 0) return null;
    
    // Find the last entry with valid VWAP
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].VWAP && data[i].VWAP > 0) {
        return {
          spot: data[data.length - 1].underlyning,
          vwap: data[i].VWAP,
        };
      }
    }
    
    return {
      spot: data[data.length - 1].underlyning,
      vwap: 0,
    };
  };

  const latestData = getLatestData();
  const spotAboveVWAP = latestData && latestData.vwap > 0 ? latestData.spot >= latestData.vwap : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LineChart className="h-4 w-4 text-primary" />
            Spot vs VWAP
          </CardTitle>
          {latestData && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Spot:</span>
                <span className="font-medium">{latestData.spot?.toFixed(2)}</span>
              </span>
              {latestData.vwap > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-muted-foreground">VWAP:</span>
                  <span className="font-medium">{latestData.vwap?.toFixed(2)}</span>
                </span>
              )}
              {spotAboveVWAP !== null && (
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded",
                  spotAboveVWAP ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                )}>
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
