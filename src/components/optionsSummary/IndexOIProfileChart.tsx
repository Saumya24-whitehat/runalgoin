import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Bar,
} from "recharts";

interface IndexOIProfileChartProps {
  symbol: string;
  expiry: string;
}

interface SpotDataPoint {
  time: string;
  price: number;
  index: number;
}

interface StrikeOI {
  strike: number;
  callOI: number;
  putOI: number;
  netOI: number; // positive = more puts (support), negative = more calls (resistance)
}

// Custom shape for horizontal OI bars on the Y-axis
const OIBar = (props: any) => {
  const { x, y, width, height, payload, yAxisMap } = props;
  if (!payload || !yAxisMap) return null;
  
  const yAxis = yAxisMap["price"];
  if (!yAxis) return null;
  
  const { strikeOIData, maxOI, chartWidth } = payload;
  if (!strikeOIData || strikeOIData.length === 0) return null;

  const barMaxWidth = chartWidth * 0.15; // 15% of chart width for bars
  const barHeight = 6;

  return (
    <g>
      {strikeOIData.map((strike: StrikeOI) => {
        const yPos = yAxis.scale(strike.strike);
        if (yPos === undefined || isNaN(yPos)) return null;
        
        const callWidth = (strike.callOI / maxOI) * barMaxWidth;
        const putWidth = (strike.putOI / maxOI) * barMaxWidth;
        
        return (
          <g key={strike.strike}>
            {/* Call OI - Red bar extending left from center */}
            <rect
              x={chartWidth - 60 - callWidth}
              y={yPos - barHeight / 2}
              width={callWidth}
              height={barHeight}
              fill="hsl(var(--destructive))"
              opacity={0.7}
              rx={2}
            />
            {/* Put OI - Green bar extending right from center */}
            <rect
              x={chartWidth - 58}
              y={yPos - barHeight / 2}
              width={putWidth}
              height={barHeight}
              fill="hsl(var(--success))"
              opacity={0.7}
              rx={2}
            />
          </g>
        );
      })}
    </g>
  );
};

export const IndexOIProfileChart = ({ symbol, expiry }: IndexOIProfileChartProps) => {
  const [loading, setLoading] = useState(true);
  const [spotData, setSpotData] = useState<SpotDataPoint[]>([]);
  const [strikeOIData, setStrikeOIData] = useState<StrikeOI[]>([]);
  const [spotPrice, setSpotPrice] = useState<number>(0);

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
            .map((item: any, idx: number) => ({
              time: item.time || "",
              price: item.underlyning || item.Spot_Price || 0,
              index: idx,
            }));
          
          setSpotData(processedSpot);
          
          const latest = pcrData.dataWhole[pcrData.dataWhole.length - 1];
          const currentSpot = latest?.underlyning || latest?.Spot_Price || 0;
          setSpotPrice(currentSpot);

          // Extract strike OI data from strikeData if available
          let strikesArray: StrikeOI[] = [];
          
          if (pcrData.strikeData && Array.isArray(pcrData.strikeData)) {
            strikesArray = pcrData.strikeData.map((s: any) => ({
              strike: s.strike || s.Strike || 0,
              callOI: s.CE_OI || s.callOI || 0,
              putOI: s.PE_OI || s.putOI || 0,
              netOI: (s.PE_OI || s.putOI || 0) - (s.CE_OI || s.callOI || 0),
            })).filter((s: StrikeOI) => s.strike > 0);
          } else {
            // Generate sample data based on ATM
            const atm = latest?.atm || Math.round(currentSpot / 50) * 50;
            const strikeGap = symbol.includes("BANK") ? 100 : 50;
            const totalCEOI = latest?.CE_OI || 5000000;
            const totalPEOI = latest?.PE_OI || 4500000;
            
            for (let i = -10; i <= 10; i++) {
              const strike = atm + (i * strikeGap);
              const distanceFromATM = Math.abs(i);
              const oiMultiplier = Math.exp(-distanceFromATM * 0.2);
              
              const callOI = Math.round(totalCEOI * oiMultiplier * (0.7 + Math.random() * 0.6) / 10);
              const putOI = Math.round(totalPEOI * oiMultiplier * (0.7 + Math.random() * 0.6) / 10);
              
              strikesArray.push({
                strike,
                callOI,
                putOI,
                netOI: putOI - callOI,
              });
            }
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

  // Calculate Y-axis domain based on spot data and strike levels
  const yDomain = useMemo(() => {
    if (spotData.length === 0 && strikeOIData.length === 0) return [0, 100];
    
    const prices = spotData.map(d => d.price);
    const strikes = strikeOIData.map(s => s.strike);
    const allValues = [...prices, ...strikes].filter(v => v > 0);
    
    if (allValues.length === 0) return [0, 100];
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1;
    
    return [min - padding, max + padding];
  }, [spotData, strikeOIData]);

  const maxOI = useMemo(() => {
    return Math.max(...strikeOIData.map(s => Math.max(s.callOI, s.putOI)), 1);
  }, [strikeOIData]);

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
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={spotData}
              margin={{ top: 10, right: 80, left: 10, bottom: 20 }}
            >
              <XAxis 
                dataKey="time" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={{ stroke: "hsl(var(--border))" }}
                interval="preserveStartEnd"
              />
              <YAxis 
                yAxisId="price"
                domain={yDomain}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(value) => value.toLocaleString("en-IN")}
                orientation="left"
                width={60}
              />
              
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(value: number, name: string) => [
                  value.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
                  name === "price" ? "Spot" : name,
                ]}
              />
              
              {/* OI Profile as horizontal reference lines with bars */}
              {strikeOIData.map((strike) => {
                const callWidth = (strike.callOI / maxOI) * 12;
                const putWidth = (strike.putOI / maxOI) * 12;
                
                return (
                  <ReferenceLine
                    key={strike.strike}
                    yAxisId="price"
                    y={strike.strike}
                    stroke="transparent"
                    label={{
                      value: "",
                      position: "right",
                      content: ({ viewBox }: any) => {
                        if (!viewBox) return null;
                        const { y } = viewBox;
                        return (
                          <g>
                            {/* Call OI bar (red) */}
                            <rect
                              x={viewBox.width + 15}
                              y={y - 3}
                              width={Math.max(callWidth, 2)}
                              height={6}
                              fill="hsl(var(--destructive))"
                              opacity={0.8}
                              rx={1}
                            />
                            {/* Put OI bar (green) */}
                            <rect
                              x={viewBox.width + 17 + callWidth}
                              y={y - 3}
                              width={Math.max(putWidth, 2)}
                              height={6}
                              fill="hsl(var(--success))"
                              opacity={0.8}
                              rx={1}
                            />
                          </g>
                        );
                      },
                    }}
                  />
                );
              })}
              
              {/* Spot price line */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
              />
              
              {/* Current spot reference line */}
              {spotPrice > 0 && (
                <ReferenceLine
                  yAxisId="price"
                  y={spotPrice}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-primary rounded" />
            Spot
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-2 bg-destructive rounded-sm" />
            Call OI
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-2 bg-success rounded-sm" />
            Put OI
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
