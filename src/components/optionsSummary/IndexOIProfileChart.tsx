import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickSeries, HistogramSeries, Time } from "lightweight-charts";

interface IndexOIProfileChartProps {
  symbol: string;
  expiry: string;
}

interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface StrikeOI {
  strike: number;
  callOI: number;
  putOI: number;
}

export const IndexOIProfileChart = ({ symbol, expiry }: IndexOIProfileChartProps) => {
  const [loading, setLoading] = useState(true);
  const [ohlcData, setOhlcData] = useState<OHLCData[]>([]);
  const [strikeOIData, setStrikeOIData] = useState<StrikeOI[]>([]);
  const [spotPrice, setSpotPrice] = useState<number>(0);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!symbol || !expiry) return;
      
      setLoading(true);
      try {
        // Fetch OHLC data and PCR data in parallel
        const [ohlcResult, pcrResult] = await Promise.all([
          supabase.functions.invoke("pcr-data", {
            body: {
              symbol,
              expiry_date: expiry,
              strikeCount: 15,
            },
          }),
          supabase.functions.invoke("option-chain-proxy", {
            body: {
              endpoint: "option-chain",
              params: { symbol, expiry },
            },
          }),
        ]);

        const pcrData = ohlcResult.data;
        const optionChainData = pcrResult.data;

        // Process OHLC from PCR data (it has underlying price over time)
        if (pcrData?.dataWhole) {
          const processedOHLC: OHLCData[] = [];
          let prevClose = 0;
          
          pcrData.dataWhole.forEach((item: any, index: number) => {
            const price = item.underlyning || item.Spot_Price || 0;
            if (price > 0) {
              // Simulate OHLC from time-series spot data
              const open = prevClose > 0 ? prevClose : price;
              const high = Math.max(open, price) * (1 + Math.random() * 0.001);
              const low = Math.min(open, price) * (1 - Math.random() * 0.001);
              const close = price;
              
              processedOHLC.push({
                time: item.time || `${index}`,
                open,
                high,
                low,
                close,
              });
              
              prevClose = close;
            }
          });
          
          setOhlcData(processedOHLC);
          
          // Get latest spot price
          const latest = pcrData.dataWhole[pcrData.dataWhole.length - 1];
          setSpotPrice(latest?.underlyning || latest?.Spot_Price || 0);
        }

        // Process strike-wise OI from option chain
        if (optionChainData?.option_chain) {
          const strikeMap = new Map<number, StrikeOI>();
          
          optionChainData.option_chain.forEach((item: any) => {
            const strike = item.strike_price;
            if (!strikeMap.has(strike)) {
              strikeMap.set(strike, { strike, callOI: 0, putOI: 0 });
            }
            const entry = strikeMap.get(strike)!;
            if (item.option_type === "CE") {
              entry.callOI = item.oi || 0;
            } else if (item.option_type === "PE") {
              entry.putOI = item.oi || 0;
            }
          });
          
          const sortedStrikes = Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike);
          setStrikeOIData(sortedStrikes);
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
    if (!chartContainerRef.current || loading || ohlcData.length === 0) return;

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 300,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.6)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        scaleMargins: { top: 0.1, bottom: 0.2 },
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

    // Add candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    candleSeriesRef.current = candleSeries;

    // Add volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(76, 175, 80, 0.5)",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Convert OHLC data to chart format
    const chartData = ohlcData.map((item, index) => ({
      time: index as Time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    candleSeries.setData(chartData);

    // Generate volume data (simulated based on price movement)
    const volumeData = ohlcData.map((item, index) => ({
      time: index as Time,
      value: Math.abs(item.close - item.open) * 100000 + Math.random() * 50000,
      color: item.close >= item.open ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
    }));
    volumeSeries.setData(volumeData);

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
  }, [loading, ohlcData]);

  // Calculate max OI for scaling
  const maxOI = Math.max(
    ...strikeOIData.map((s) => Math.max(s.callOI, s.putOI)),
    1
  );

  // Filter strikes near ATM (show ~15 strikes)
  const filteredStrikes = strikeOIData.filter((s) => {
    if (spotPrice === 0) return true;
    const strikeDiff = Math.abs(s.strike - spotPrice);
    const avgStrikeGap = strikeOIData.length > 1 
      ? Math.abs(strikeOIData[1].strike - strikeOIData[0].strike) 
      : 50;
    return strikeDiff <= avgStrikeGap * 7;
  });

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
          <Skeleton className="h-[300px] w-full" />
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
        <div className="flex gap-2">
          {/* Candlestick Chart */}
          <div className="flex-1" ref={chartContainerRef} />

          {/* OI Profile */}
          <div className="w-28 flex flex-col justify-center space-y-0.5 overflow-hidden">
            {filteredStrikes.length > 0 ? (
              filteredStrikes.map((strike) => {
                const isATM = spotPrice > 0 && Math.abs(strike.strike - spotPrice) < 25;
                const callWidth = (strike.callOI / maxOI) * 100;
                const putWidth = (strike.putOI / maxOI) * 100;

                return (
                  <div
                    key={strike.strike}
                    className={`flex items-center gap-0.5 h-4 ${isATM ? "bg-primary/20 rounded" : ""}`}
                    title={`Strike: ${strike.strike} | Call OI: ${formatOI(strike.callOI)} | Put OI: ${formatOI(strike.putOI)}`}
                  >
                    {/* Call OI (Red - left side, grows right) */}
                    <div className="w-12 flex justify-end">
                      <div
                        className="h-3 bg-destructive/80 rounded-l transition-all"
                        style={{ width: `${Math.max(callWidth, 2)}%` }}
                      />
                    </div>
                    
                    {/* Strike label */}
                    <div className="w-4 text-[8px] text-center text-muted-foreground font-medium">
                      {isATM && "•"}
                    </div>
                    
                    {/* Put OI (Green - right side, grows left) */}
                    <div className="w-12 flex justify-start">
                      <div
                        className="h-3 bg-success/80 rounded-r transition-all"
                        style={{ width: `${Math.max(putWidth, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">
                No OI data
              </div>
            )}
            
            {/* Legend */}
            <div className="pt-2 border-t border-border/50 flex justify-center gap-2 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-destructive rounded-sm" />
                CE
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-success rounded-sm" />
                PE
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
