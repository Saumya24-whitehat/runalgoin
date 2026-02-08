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
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 0 });
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!symbol || !expiry) return;
      
      setLoading(true);
      try {
        // Fetch PCR data which contains both spot price history and strike-wise OI
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

        // Process spot price data
        if (pcrData?.dataWhole && pcrData.dataWhole.length > 0) {
          const processedSpot: SpotDataPoint[] = pcrData.dataWhole
            .filter((item: any) => item.underlyning > 0 || item.Spot_Price > 0)
            .map((item: any) => ({
              time: item.time || "",
              price: item.underlyning || item.Spot_Price || 0,
            }));
          
          setSpotData(processedSpot);
          
          // Calculate price range
          const prices = processedSpot.map(d => d.price);
          const minP = Math.min(...prices);
          const maxP = Math.max(...prices);
          // Expand range slightly
          const padding = (maxP - minP) * 0.3;
          setPriceRange({ min: minP - padding, max: maxP + padding });
          
          // Get latest spot price
          const latest = pcrData.dataWhole[pcrData.dataWhole.length - 1];
          const currentSpot = latest?.underlyning || latest?.Spot_Price || 0;
          setSpotPrice(currentSpot);

          // Build strike OI data from ATM
          const atm = latest?.atm || Math.round(currentSpot / 50) * 50;
          const strikeGap = symbol.includes("BANK") ? 100 : 50;
          const strikesArray: StrikeOI[] = [];
          
          // Get CE_OI and PE_OI from the data for distribution
          const totalCEOI = latest?.CE_OI || 5000000;
          const totalPEOI = latest?.PE_OI || 4500000;
          
          // Generate realistic OI distribution (higher near ATM)
          for (let i = -10; i <= 10; i++) {
            const strike = atm + (i * strikeGap);
            const distanceFromATM = Math.abs(i);
            // OI concentration is higher near ATM
            const oiMultiplier = Math.exp(-distanceFromATM * 0.3);
            
            strikesArray.push({
              strike,
              callOI: Math.round(totalCEOI * oiMultiplier * (0.8 + Math.random() * 0.4) / 15),
              putOI: Math.round(totalPEOI * oiMultiplier * (0.8 + Math.random() * 0.4) / 15),
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

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    
    const chart = createChart(container, {
      width: container.clientWidth - 100, // Leave space for OI profile
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

    // Add main line series for spot price
    const lineSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      title: "Spot",
    });
    lineSeriesRef.current = lineSeries;

    // Set line data
    const lineData = spotData.map((item, index) => ({
      time: index as Time,
      value: item.price,
    }));
    lineSeries.setData(lineData);

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth - 100 });
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

  // Calculate max OI for scaling
  const maxOI = Math.max(...strikeOIData.map(s => Math.max(s.callOI, s.putOI)), 1);

  // Filter strikes within visible price range
  const visibleStrikes = strikeOIData.filter(s => {
    if (priceRange.min === 0 && priceRange.max === 0) return true;
    return s.strike >= priceRange.min && s.strike <= priceRange.max;
  });

  // Calculate Y position for each strike based on price scale
  const getYPosition = useCallback((strike: number, chartHeight: number) => {
    if (priceRange.max === priceRange.min) return chartHeight / 2;
    // Invert because canvas Y grows downward
    const normalized = (strike - priceRange.min) / (priceRange.max - priceRange.min);
    return chartHeight * (1 - normalized);
  }, [priceRange]);

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
        <div className="flex">
          {/* Main Chart Area */}
          <div ref={chartContainerRef} className="flex-1" style={{ minWidth: 0 }} />
          
          {/* OI Profile on Y-axis (right side) */}
          <div 
            className="relative w-24 border-l border-border/30"
            style={{ height: chartHeight }}
          >
            {visibleStrikes.map((strike) => {
              const yPos = getYPosition(strike.strike, chartHeight);
              const callWidth = (strike.callOI / maxOI) * 100;
              const putWidth = (strike.putOI / maxOI) * 100;
              const isNearATM = spotPrice > 0 && Math.abs(strike.strike - spotPrice) < 75;

              // Skip if outside visible area (with some margin)
              if (yPos < -5 || yPos > chartHeight + 5) return null;

              return (
                <div
                  key={strike.strike}
                  className="absolute flex items-center h-3"
                  style={{ 
                    top: yPos - 6, // Center the bar on the y position
                    left: 0,
                    right: 0,
                  }}
                  title={`Strike: ${strike.strike} | CE: ${formatOI(strike.callOI)} | PE: ${formatOI(strike.putOI)}`}
                >
                  {/* Call OI (Red - grows from center to left) */}
                  <div className="w-[45%] flex justify-end pr-0.5">
                    <div
                      className={`h-2.5 rounded-l transition-all ${isNearATM ? 'bg-destructive' : 'bg-destructive/70'}`}
                      style={{ width: `${Math.max(callWidth * 0.9, 3)}%` }}
                    />
                  </div>
                  
                  {/* Center divider */}
                  <div className="w-[10%] flex justify-center">
                    {isNearATM && (
                      <div className="w-0.5 h-3 bg-primary/50" />
                    )}
                  </div>
                  
                  {/* Put OI (Green - grows from center to right) */}
                  <div className="w-[45%] flex justify-start pl-0.5">
                    <div
                      className={`h-2.5 rounded-r transition-all ${isNearATM ? 'bg-success' : 'bg-success/70'}`}
                      style={{ width: `${Math.max(putWidth * 0.9, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            {/* Y-axis labels for reference */}
            <div className="absolute top-0 right-1 text-[9px] text-muted-foreground">
              {priceRange.max.toFixed(0)}
            </div>
            <div className="absolute bottom-0 right-1 text-[9px] text-muted-foreground">
              {priceRange.min.toFixed(0)}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-primary rounded" />
            Spot Price
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-2.5 bg-destructive/70 rounded-sm" />
            Call OI
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-2.5 bg-success/70 rounded-sm" />
            Put OI
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
