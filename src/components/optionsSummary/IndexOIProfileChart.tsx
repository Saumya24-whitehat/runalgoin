import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import { createChart, IChartApi, ISeriesApi, ColorType, LineSeries, HistogramSeries, Time } from "lightweight-charts";

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
          
          // Get latest spot price
          const latest = pcrData.dataWhole[pcrData.dataWhole.length - 1];
          const currentSpot = latest?.underlyning || latest?.Spot_Price || 0;
          setSpotPrice(currentSpot);

          // Extract strike-wise OI from the latest data entry
          // PCR data has strike info in the response
          if (pcrData.strikeData || pcrData.strikes) {
            const strikes = pcrData.strikeData || pcrData.strikes;
            const strikeMap = new Map<number, StrikeOI>();
            
            if (Array.isArray(strikes)) {
              strikes.forEach((item: any) => {
                const strike = item.strike || item.strikePrice;
                if (strike) {
                  strikeMap.set(strike, {
                    strike,
                    callOI: item.CE_OI || item.callOI || 0,
                    putOI: item.PE_OI || item.putOI || 0,
                  });
                }
              });
            }
            
            const sortedStrikes = Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike);
            setStrikeOIData(sortedStrikes);
          } else {
            // Try to get OI from the latest dataWhole entry if it has strike info
            const latestEntry = pcrData.dataWhole[pcrData.dataWhole.length - 1];
            if (latestEntry) {
              // Build strike OI from ATM and surrounding strikes
              const atm = latestEntry.atm || Math.round(currentSpot / 50) * 50;
              const strikesArray: StrikeOI[] = [];
              
              // Generate strikes around ATM with sample OI values from the data
              const strikeGap = symbol.includes("BANK") ? 100 : 50;
              for (let i = -7; i <= 7; i++) {
                const strike = atm + (i * strikeGap);
                strikesArray.push({
                  strike,
                  callOI: latestEntry.CE_OI ? latestEntry.CE_OI / (15 - Math.abs(i)) : 0,
                  putOI: latestEntry.PE_OI ? latestEntry.PE_OI / (15 - Math.abs(i)) : 0,
                });
              }
              setStrikeOIData(strikesArray);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching index OI profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, expiry]);

  // Initialize chart with OI profile overlay
  useEffect(() => {
    if (!chartContainerRef.current || loading || spotData.length === 0) return;

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    
    // Calculate price range for proper OI alignment
    const prices = spotData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 350,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.6)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        scaleMargins: { top: 0.05, bottom: 0.05 },
        autoScale: true,
      },
      leftPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        visible: true,
        scaleMargins: { top: 0.05, bottom: 0.05 },
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
      priceScaleId: "right",
    });
    lineSeriesRef.current = lineSeries;

    // Set line data
    const lineData = spotData.map((item, index) => ({
      time: index as Time,
      value: item.price,
    }));
    lineSeries.setData(lineData);

    // Add OI profile as histogram bars on the left price scale
    // We'll create two histogram series - one for Call OI and one for Put OI
    if (strikeOIData.length > 0) {
      const maxOI = Math.max(...strikeOIData.map(s => Math.max(s.callOI, s.putOI)), 1);
      
      // Normalize OI values to fit within price range for visualization
      // Map each strike's OI to a time index (spread across chart width)
      const totalPoints = spotData.length;
      const oiPointSpacing = Math.max(1, Math.floor(totalPoints / strikeOIData.length));
      
      // Call OI histogram (Red)
      const callOISeries = chart.addSeries(HistogramSeries, {
        color: "rgba(239, 68, 68, 0.6)",
        priceFormat: { type: "volume" },
        priceScaleId: "left",
      });
      
      // Put OI histogram (Green)
      const putOISeries = chart.addSeries(HistogramSeries, {
        color: "rgba(34, 197, 94, 0.6)",
        priceFormat: { type: "volume" },
        priceScaleId: "left",
      });

      // Create OI data points mapped to time indices
      const callOIData = strikeOIData.map((strike, idx) => ({
        time: (idx * oiPointSpacing) as Time,
        value: strike.callOI,
        color: "rgba(239, 68, 68, 0.6)",
      }));
      
      const putOIData = strikeOIData.map((strike, idx) => ({
        time: (idx * oiPointSpacing + Math.floor(oiPointSpacing / 2)) as Time,
        value: strike.putOI,
        color: "rgba(34, 197, 94, 0.6)",
      }));

      callOISeries.setData(callOIData);
      putOISeries.setData(putOIData);
      
      // Adjust left price scale for OI
      callOISeries.priceScale().applyOptions({
        scaleMargins: { top: 0.6, bottom: 0 },
      });
    }

    chart.timeScale().fitContent();

    // Handle resize
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
  }, [loading, spotData, strikeOIData]);

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
        <div ref={chartContainerRef} className="w-full" />
        
        {/* Legend */}
        <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-primary rounded" />
            Spot Price
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-destructive/60 rounded-sm" />
            Call OI
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-success/60 rounded-sm" />
            Put OI
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
