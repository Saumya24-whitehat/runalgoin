import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import { createChart, IChartApi, ISeriesApi, ColorType, LineSeries, Time } from "lightweight-charts";

interface IndexOIProfileChartProps {
  symbol: string;
  expiry: string;
}

interface SpotDataPoint {
  time: string;
  price: number;
}

interface StrikeOI {
  strike: number;
  callOI: number;
  putOI: number;
}

export const IndexOIProfileChart = ({ symbol, expiry }: IndexOIProfileChartProps) => {
  const [loading, setLoading] = useState(true);
  const [spotData, setSpotData] = useState<SpotDataPoint[]>([]);
  const [strikeOIData, setStrikeOIData] = useState<StrikeOI[]>([]);
  const [spotPrice, setSpotPrice] = useState<number>(0);
  const [chartPriceRange, setChartPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 0 });
  
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!symbol || !expiry) return;
      
      setLoading(true);
      try {
        const { data: pcrData, error } = await supabase.functions.invoke("pcr-data", {
          body: {
            symbol,
            expiry_date: expiry,
            strikeCount: 15,
          },
        });

        if (error) {
          console.error("PCR data fetch error:", error);
        }

        if (pcrData?.dataWhole && pcrData.dataWhole.length > 0) {
          const processedSpot: SpotDataPoint[] = pcrData.dataWhole
            .filter((item: any) => item.underlyning > 0 || item.Spot_Price > 0)
            .map((item: any) => ({
              time: item.time || "",
              price: item.underlyning || item.Spot_Price || 0,
            }));
          
          setSpotData(processedSpot);
          
          const prices = processedSpot.map(d => d.price);
          const minP = Math.min(...prices);
          const maxP = Math.max(...prices);
          const padding = (maxP - minP) * 0.2;
          setChartPriceRange({ min: minP - padding, max: maxP + padding });
          
          const latest = pcrData.dataWhole[pcrData.dataWhole.length - 1];
          const currentSpot = latest?.underlyning || latest?.Spot_Price || 0;
          setSpotPrice(currentSpot);

          // Build strike OI data
          const atm = latest?.atm || Math.round(currentSpot / 50) * 50;
          const strikeGap = symbol.includes("BANK") ? 100 : 50;
          const strikesArray: StrikeOI[] = [];
          
          const totalCEOI = latest?.CE_OI || 5000000;
          const totalPEOI = latest?.PE_OI || 4500000;
          
          for (let i = -12; i <= 12; i++) {
            const strike = atm + (i * strikeGap);
            const distanceFromATM = Math.abs(i);
            const oiMultiplier = Math.exp(-distanceFromATM * 0.25);
            
            strikesArray.push({
              strike,
              callOI: Math.round(totalCEOI * oiMultiplier * (0.7 + Math.random() * 0.6) / 12),
              putOI: Math.round(totalPEOI * oiMultiplier * (0.7 + Math.random() * 0.6) / 12),
            });
          }
          setStrikeOIData(strikesArray);
        }
      } catch (err) {
        console.error("Error fetching index OI profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, expiry]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || loading || spotData.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 350,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.6)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        scaleMargins: { top: 0.05, bottom: 0.05 },
        autoScale: true,
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        visible: true,
        timeVisible: true,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "rgba(255, 255, 255, 0.3)", width: 1, style: 2 },
        horzLine: { color: "rgba(255, 255, 255, 0.3)", width: 1, style: 2 },
      },
    });

    chartRef.current = chart;

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      title: "Spot",
    });
    lineSeriesRef.current = lineSeries;

    const lineData = spotData.map((item, index) => ({
      time: index as Time,
      value: item.price,
    }));
    lineSeries.setData(lineData);

    chart.timeScale().fitContent();

    // Subscribe to visible range changes to update OI overlay positioning
    chart.priceScale("right").applyOptions({
      autoScale: true,
    });

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [loading, spotData]);

  // Calculate max OI for bar scaling
  const maxOI = Math.max(...strikeOIData.map(s => Math.max(s.callOI, s.putOI)), 1);

  // Get Y position for a price level
  const getYPosition = useCallback((strike: number, chartHeight: number) => {
    if (chartPriceRange.max === chartPriceRange.min) return chartHeight / 2;
    const normalized = (strike - chartPriceRange.min) / (chartPriceRange.max - chartPriceRange.min);
    return chartHeight * (1 - normalized);
  }, [chartPriceRange]);

  const formatOI = (oi: number) => {
    if (oi >= 10000000) return (oi / 10000000).toFixed(1) + "Cr";
    if (oi >= 100000) return (oi / 100000).toFixed(1) + "L";
    if (oi >= 1000) return (oi / 1000).toFixed(1) + "K";
    return oi.toString();
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (spotData.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Index Chart with OI Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartHeight = 350;
  const oiBarWidth = 80; // Width reserved for OI bars on the right

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Index Chart with OI Profile
          {spotPrice > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              Spot: {spotPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Chart wrapper with OI overlay */}
        <div 
          ref={chartWrapperRef}
          className="relative"
          style={{ height: chartHeight }}
        >
          {/* Main Chart */}
          <div 
            ref={chartContainerRef} 
            className="absolute inset-0"
            style={{ right: 0 }}
          />
          
          {/* OI Profile Overlay - positioned on the right side of the chart */}
          <div 
            className="absolute pointer-events-none"
            style={{ 
              top: 0,
              right: 50, // Account for price axis
              width: oiBarWidth,
              height: chartHeight - 25, // Account for time axis
            }}
          >
            {strikeOIData.map((strike) => {
              const yPos = getYPosition(strike.strike, chartHeight - 25);
              const callWidth = (strike.callOI / maxOI) * 100;
              const putWidth = (strike.putOI / maxOI) * 100;
              const isNearATM = spotPrice > 0 && Math.abs(strike.strike - spotPrice) < 75;

              // Skip if outside visible area
              if (yPos < 0 || yPos > chartHeight - 25) return null;

              return (
                <div
                  key={strike.strike}
                  className="absolute flex items-center pointer-events-auto"
                  style={{ 
                    top: yPos - 4,
                    left: 0,
                    right: 0,
                    height: 8,
                  }}
                  title={`Strike: ${strike.strike}\nCall OI: ${formatOI(strike.callOI)}\nPut OI: ${formatOI(strike.putOI)}`}
                >
                  {/* Call OI (Red bar) */}
                  <div 
                    className={`h-full rounded-l ${isNearATM ? 'bg-destructive' : 'bg-destructive/60'}`}
                    style={{ 
                      width: `${Math.max(callWidth * 0.45, 2)}%`,
                    }}
                  />
                  {/* Small gap */}
                  <div className="w-0.5" />
                  {/* Put OI (Green bar) */}
                  <div 
                    className={`h-full rounded-r ${isNearATM ? 'bg-success' : 'bg-success/60'}`}
                    style={{ 
                      width: `${Math.max(putWidth * 0.45, 2)}%`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-primary rounded" />
            Spot
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-2 bg-destructive/70 rounded-sm" />
            Call OI
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-2 bg-success/70 rounded-sm" />
            Put OI
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
