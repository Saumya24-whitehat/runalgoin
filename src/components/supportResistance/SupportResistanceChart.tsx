import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, IChartApi, ISeriesApi, LineStyle, ColorType, LineSeries } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchKundaliData, KundaliTimeData } from "@/services/kundaliApi";

interface SupportResistanceChartProps {
  symbol: string;
  expiry: string;
}

const SupportResistanceChart = ({ symbol, expiry }: SupportResistanceChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const spotSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const resistanceSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const supportSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const resistance2SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const support2SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [loading, setLoading] = useState(false);
  const [kundaliData, setKundaliData] = useState<KundaliTimeData[]>([]);

  // Fetch Kundali data
  const fetchData = useCallback(async () => {
    if (!symbol || !expiry) return;
    
    setLoading(true);
    try {
      const result = await fetchKundaliData(symbol, expiry, 100);
      if (result.dataWhole && result.dataWhole.length > 0) {
        setKundaliData(result.dataWhole);
        console.log("Chart kundali data:", result.dataWhole.length, "points");
      }
    } catch (err) {
      console.error("Error fetching kundali data for chart:", err);
    } finally {
      setLoading(false);
    }
  }, [symbol, expiry]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || kundaliData.length === 0) return;

    // Create chart if not exists
    if (!chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#9ca3af",
        },
        grid: {
          vertLines: { color: "rgba(255, 255, 255, 0.05)" },
          horzLines: { color: "rgba(255, 255, 255, 0.05)" },
        },
        width: chartContainerRef.current.clientWidth,
        height: 300,
        rightPriceScale: {
          borderColor: "rgba(255, 255, 255, 0.1)",
        },
        timeScale: {
          borderColor: "rgba(255, 255, 255, 0.1)",
          timeVisible: true,
          secondsVisible: false,
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

      // Create spot price line series
      spotSeriesRef.current = chartRef.current.addSeries(LineSeries, {
        color: "#f59e0b",
        lineWidth: 2,
        title: "Spot",
        priceLineVisible: true,
        lastValueVisible: true,
      });

      // Create resistance line series (max CE strike)
      resistanceSeriesRef.current = chartRef.current.addSeries(LineSeries, {
        color: "#ef4444",
        lineWidth: 2,
        title: "R1",
        lineStyle: LineStyle.Solid,
        priceLineVisible: true,
        lastValueVisible: true,
      });

      // Create second resistance line series (max CE strike2) - dashed
      resistance2SeriesRef.current = chartRef.current.addSeries(LineSeries, {
        color: "#f87171",
        lineWidth: 1,
        title: "R2",
        lineStyle: LineStyle.Dashed,
        priceLineVisible: true,
        lastValueVisible: true,
      });

      // Create support line series (max PE strike)
      supportSeriesRef.current = chartRef.current.addSeries(LineSeries, {
        color: "#22c55e",
        lineWidth: 2,
        title: "S1",
        lineStyle: LineStyle.Solid,
        priceLineVisible: true,
        lastValueVisible: true,
      });

      // Create second support line series (max PE strike2) - dashed
      support2SeriesRef.current = chartRef.current.addSeries(LineSeries, {
        color: "#4ade80",
        lineWidth: 1,
        title: "S2",
        lineStyle: LineStyle.Dashed,
        priceLineVisible: true,
        lastValueVisible: true,
      });
    }

    // Prepare data for chart - using index as time
    const spotData: { time: number; value: number }[] = [];
    const resistanceData: { time: number; value: number }[] = [];
    const resistance2Data: { time: number; value: number }[] = [];
    const supportData: { time: number; value: number }[] = [];
    const support2Data: { time: number; value: number }[] = [];

    kundaliData.forEach((item, index) => {
      const timeValue = index; // Use index as time for simplicity
      
      spotData.push({
        time: timeValue,
        value: item.underlyning || 0,
      });
      
      resistanceData.push({
        time: timeValue,
        value: item.max_ce_strike || 0,
      });

      resistance2Data.push({
        time: timeValue,
        value: item.max_ce_strike2 || 0,
      });
      
      supportData.push({
        time: timeValue,
        value: item.max_pe_strike || 0,
      });

      support2Data.push({
        time: timeValue,
        value: item.max_pe_strike2 || 0,
      });
    });

    // Update series data
    if (spotSeriesRef.current && spotData.length > 0) {
      spotSeriesRef.current.setData(spotData as any);
    }
    if (resistanceSeriesRef.current && resistanceData.length > 0) {
      resistanceSeriesRef.current.setData(resistanceData as any);
    }
    if (resistance2SeriesRef.current && resistance2Data.length > 0) {
      resistance2SeriesRef.current.setData(resistance2Data as any);
    }
    if (supportSeriesRef.current && supportData.length > 0) {
      supportSeriesRef.current.setData(supportData as any);
    }
    if (support2SeriesRef.current && support2Data.length > 0) {
      support2SeriesRef.current.setData(support2Data as any);
    }

    // Fit content
    chartRef.current?.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [kundaliData]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Get latest values
  const latestData = kundaliData.length > 0 ? kundaliData[kundaliData.length - 1] : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium">Support & Resistance Chart</CardTitle>
          {latestData && (
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-muted-foreground">Spot:</span>
                <span className="font-medium">{latestData.underlyning?.toFixed(2)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-muted-foreground">R1:</span>
                <span className="font-medium text-red-400">{latestData.max_ce_strike}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400 border border-dashed border-red-300"></span>
                <span className="text-muted-foreground">R2:</span>
                <span className="font-medium text-red-300">{latestData.max_ce_strike2}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-muted-foreground">S1:</span>
                <span className="font-medium text-green-400">{latestData.max_pe_strike}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 border border-dashed border-green-300"></span>
                <span className="text-muted-foreground">S2:</span>
                <span className="font-medium text-green-300">{latestData.max_pe_strike2}</span>
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : kundaliData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        ) : (
          <div ref={chartContainerRef} className="w-full h-[300px]" />
        )}
      </CardContent>
    </Card>
  );
};

export default SupportResistanceChart;
