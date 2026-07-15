import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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
  callCOI: number;
  putCOI: number;
  netOI: number;
}


// Format OI for display
const formatOI = (oi: number) => {
  if (oi >= 10000000) return (oi / 10000000).toFixed(2) + " Cr";
  if (oi >= 100000) return (oi / 100000).toFixed(2) + " L";
  if (oi >= 1000) return (oi / 1000).toFixed(1) + " K";
  return oi.toLocaleString("en-IN");
};

export const IndexOIProfileChart = ({ symbol, expiry }: IndexOIProfileChartProps) => {
  const [loading, setLoading] = useState(true);
  const [spotData, setSpotData] = useState<SpotDataPoint[]>([]);
  const [strikeOIData, setStrikeOIData] = useState<StrikeOI[]>([]);
  const [spotPrice, setSpotPrice] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [baseDomain, setBaseDomain] = useState<[number, number]>([0, 100]);
  const [hoveredStrike, setHoveredStrike] = useState<StrikeOI | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isInitialFetch = useRef(true);

  // Fetch data - only on symbol/expiry change, not on every render
  useEffect(() => {
    const fetchData = async () => {
      if (!symbol || !expiry) return;
      
      // Only show loading on initial fetch, not on updates
      if (isInitialFetch.current) {
        setLoading(true);
      }
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

          // Only set base domain on initial fetch to prevent chart jumping
          if (isInitialFetch.current) {
            const prices = processedSpot.map(d => d.price);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            const padding = (max - min) * 0.15;
            setBaseDomain([min - padding, max + padding]);
          }

          // Extract strike OI data from strikeData if available
          let strikesArray: StrikeOI[] = [];
          
          if (pcrData.strikeData && Array.isArray(pcrData.strikeData)) {
            strikesArray = pcrData.strikeData.map((s: any) => ({
              strike: s.strike || s.Strike || 0,
              callOI: s.CE_OI || s.callOI || 0,
              putOI: s.PE_OI || s.putOI || 0,
              callCOI: s.CE_COI ?? s.callCOI ?? 0,
              putCOI: s.PE_COI ?? s.putCOI ?? 0,
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
                callCOI: Math.round(callOI * (Math.random() - 0.4) * 0.3),
                putCOI: Math.round(putOI * (Math.random() - 0.4) * 0.3),
                netOI: putOI - callOI,
              });
            }
          }

          
          setStrikeOIData(strikesArray);
        }
      } catch (err) {
        console.error("Error fetching index OI profile data:", err);
      } finally {
        if (isInitialFetch.current) {
          setLoading(false);
          isInitialFetch.current = false;
        }
      }
    };

    // Reset initial fetch flag when symbol/expiry changes
    isInitialFetch.current = true;
    fetchData();
  }, [symbol, expiry]);

  // Calculate zoomed Y-axis domain centered on spot price
  const yDomain = useMemo((): [number, number] => {
    const range = baseDomain[1] - baseDomain[0];
    const center = spotPrice > 0 ? spotPrice : (baseDomain[0] + baseDomain[1]) / 2;
    const zoomedRange = range / zoomLevel;
    
    return [center - zoomedRange / 2, center + zoomedRange / 2];
  }, [baseDomain, zoomLevel, spotPrice]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev * 1.5, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  // Mouse wheel zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(prev * 1.15, 10));
    } else {
      setZoomLevel(prev => Math.max(prev / 1.15, 0.5));
    }
  }, []);

  const maxOI = useMemo(() => {
    return Math.max(...strikeOIData.map(s => Math.max(s.callOI, s.putOI)), 1);
  }, [strikeOIData]);

  // Filter strikes within visible Y domain
  const visibleStrikes = useMemo(() => {
    return strikeOIData.filter(s => s.strike >= yDomain[0] && s.strike <= yDomain[1]);
  }, [strikeOIData, yDomain]);

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
          <div className="ml-auto flex items-center gap-2">
            {spotPrice > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                Spot: {spotPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
            )}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleResetZoom}
                title="Reset Zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={chartContainerRef}
          className="h-[350px] w-full relative"
          onWheel={handleWheel}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={spotData}
              margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
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
                orientation="right"
                width={70}
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
              
              {/* OI Profile: horizontal bars extending leftward from right edge, Upstox-style */}
              {visibleStrikes.map((strike) => {
                // Determine per-strike bar height in pixels based on strike spacing
                const strikes = visibleStrikes.map(s => s.strike).sort((a, b) => a - b);
                const idx = strikes.indexOf(strike.strike);
                const neighborGap =
                  idx > 0 ? strike.strike - strikes[idx - 1] :
                  idx < strikes.length - 1 ? strikes[idx + 1] - strike.strike : 50;
                const rangePx = 320; // approx plot height
                const priceRange = yDomain[1] - yDomain[0];
                const barTotalH = Math.max(6, Math.min(28, (neighborGap / priceRange) * rangePx * 0.85));
                const halfH = barTotalH / 2;

                // Max bar width (in px) at right edge — occupies right ~35% of plot
                const MAX_BAR_PX = 180;
                const callW = Math.max(1, (strike.callOI / maxOI) * MAX_BAR_PX);
                const putW = Math.max(1, (strike.putOI / maxOI) * MAX_BAR_PX);

                return (
                  <ReferenceLine
                    key={strike.strike}
                    yAxisId="price"
                    y={strike.strike}
                    stroke="transparent"
                    label={{
                      content: ({ viewBox }: any) => {
                        if (!viewBox) return null;
                        const { x, y, width } = viewBox;
                        const rightEdge = x + width;
                        const isHovered = hoveredStrike?.strike === strike.strike;

                        return (
                          <g
                            style={{ cursor: "pointer" }}
                            onMouseEnter={(e) => {
                              setHoveredStrike(strike);
                              const rect = chartContainerRef.current?.getBoundingClientRect();
                              if (rect) {
                                setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                              }
                            }}
                            onMouseLeave={() => {
                              setHoveredStrike(null);
                              setTooltipPos(null);
                            }}
                          >
                            {/* Call OI bar (red/pink) — upper half, extends left */}
                            <rect
                              x={rightEdge - callW}
                              y={y - halfH}
                              width={callW}
                              height={halfH - 0.5}
                              fill="hsl(0 72% 60%)"
                              opacity={isHovered ? 0.9 : 0.55}
                            />
                            {/* Put OI bar (green) — lower half, extends left */}
                            <rect
                              x={rightEdge - putW}
                              y={y + 0.5}
                              width={putW}
                              height={halfH - 0.5}
                              fill="hsl(142 70% 45%)"
                              opacity={isHovered ? 0.9 : 0.55}
                            />
                          </g>
                        );
                      },
                    }}
                  />
                );
              })}
              
              {/* Spot price line - no animation for smooth data updates */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                isAnimationActive={false}
              />
              
              {/* Current spot reference line */}
              {spotPrice > 0 && (
                <ReferenceLine
                  yAxisId="price"
                  y={spotPrice}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                  label={{
                    value: spotPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
                    position: "right",
                    fill: "hsl(var(--primary))",
                    fontSize: 10,
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          
          {/* OI Hover Tooltip */}
          {hoveredStrike && tooltipPos && (
            <div
              className="absolute z-50 pointer-events-none bg-popover border border-border rounded-lg shadow-lg p-3 text-sm"
              style={{
                left: Math.min(tooltipPos.x, (chartContainerRef.current?.clientWidth || 300) - 180),
                top: tooltipPos.y - 80,
              }}
            >
              <div className="font-semibold text-foreground mb-2">
                Strike: {hoveredStrike.strike.toLocaleString("en-IN")}
              </div>
              <div className="flex items-center gap-2 text-destructive">
                <div className="w-2 h-2 rounded-sm bg-destructive" />
                <span>Call OI:</span>
                <span className="font-mono">{formatOI(hoveredStrike.callOI)}</span>
              </div>
              <div className="flex items-center gap-2 text-success">
                <div className="w-2 h-2 rounded-sm bg-success" />
                <span>Put OI:</span>
                <span className="font-mono">{formatOI(hoveredStrike.putOI)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mt-1 pt-1 border-t border-border">
                <span>Net:</span>
                <span className={`font-mono ${hoveredStrike.netOI > 0 ? 'text-success' : 'text-destructive'}`}>
                  {hoveredStrike.netOI > 0 ? '+' : ''}{formatOI(hoveredStrike.netOI)}
                </span>
              </div>
            </div>
          )}
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
          <span className="text-muted-foreground/60 text-[10px]">
            (Scroll to zoom)
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
