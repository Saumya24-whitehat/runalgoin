import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Flame, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HeatMapExpirySelector } from "@/components/heatmap/HeatMapExpirySelector";
import { HeatMapStrikeCountInput } from "@/components/heatmap/HeatMapStrikeCountInput";
import { HeatMapOptionTable } from "@/components/heatmap/HeatMapOptionTable";
import { HeatMapOIChart } from "@/components/heatmap/HeatMapOIChart";
import { HeatMapIVChart } from "@/components/heatmap/HeatMapIVChart";
import { fetchHeatMapSymbols, fetchHeatMapExpiryDates, fetchHeatMapOptionChainData } from "@/services/optionHeatMapApi";
import { OptionChainResponse, GroupedSymbols } from "@/types/optionChain";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";

const REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes

// Check if current time is within market hours (9:15 AM to 3:30 PM IST)
const isMarketHours = (): boolean => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istTime = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);

  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const day = istTime.getDay();

  // Skip weekends (Saturday = 6, Sunday = 0)
  if (day === 0 || day === 6) return false;

  // Market hours: 9:15 AM to 3:30 PM
  const totalMinutes = hours * 60 + minutes;
  const marketOpen = 9 * 60 + 15; // 9:15 AM
  const marketClose = 15 * 60 + 30; // 3:30 PM

  return totalMinutes >= marketOpen && totalMinutes <= marketClose;
};

const formatTime = (date: Date | null): string => {
  if (!date) return "--:--:--";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

export function OptionHeatMapDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [strikeCount, setStrikeCount] = useState<number>(10);
  const [optionData, setOptionData] = useState<OptionChainResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const [initialExpirySet, setInitialExpirySet] = useState(false);

  // Fetch symbols
  const {
    data: symbols = { indexSymbols: [], stockSymbols: [] },
    isLoading: symbolsLoading,
    error: symbolsError,
  } = useQuery<GroupedSymbols>({
    queryKey: ["heatmap-symbols"],
    queryFn: fetchHeatMapSymbols,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch expiry dates when symbol changes
  const {
    data: expiryData,
    isLoading: expiryLoading,
    error: expiryError,
  } = useQuery({
    queryKey: ["heatmap-expiry", selectedSymbol],
    queryFn: () => fetchHeatMapExpiryDates(selectedSymbol),
    enabled: !!selectedSymbol,
    staleTime: 5 * 60 * 1000,
  });

  // Auto-select first expiry when expiry data loads
  useEffect(() => {
    if (expiryData?.expiry_dates?.length && !initialExpirySet) {
      setSelectedExpiry(expiryData.expiry_dates[0]);
      setInitialExpirySet(true);
    }
  }, [expiryData, initialExpirySet]);

  // Reset expiry when symbol changes
  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    setSelectedExpiry("");
    setOptionData(null);
    setLastRefreshed(null);
    setInitialExpirySet(false);
  };

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!selectedSymbol || !selectedExpiry) return;

    setIsLoading(true);
    try {
      const data = await fetchHeatMapOptionChainData(selectedSymbol, selectedExpiry, strikeCount);
      setOptionData(data);
      setLastRefreshed(new Date());

      // Set next refresh time
      if (isMarketHours()) {
        setNextRefresh(new Date(Date.now() + REFRESH_INTERVAL));
      } else {
        setNextRefresh(null);
      }
    } catch (error) {
      console.error("Failed to fetch option chain data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSymbol, selectedExpiry, strikeCount]);

  // Auto-fetch when symbol and expiry are selected
  useEffect(() => {
    if (selectedSymbol && selectedExpiry) {
      fetchData();
    }
  }, [selectedSymbol, selectedExpiry, fetchData]);

  // Auto-refresh every 3 minutes during market hours
  useEffect(() => {
    if (!selectedSymbol || !selectedExpiry) return;

    const checkAndRefresh = () => {
      if (isMarketHours()) {
        fetchData();
      }
    };

    const interval = setInterval(checkAndRefresh, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [selectedSymbol, selectedExpiry, fetchData]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <main className="container py-4 md:py-6">
        {/* Controls Section with Title and Refresh Info */}
        <Card className="mb-6 animate-fade-in">
          <CardContent className="pt-4 pb-4">
            {/* Header Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <h1 className="text-lg font-heading font-semibold">Option Heat Map</h1>
              </div>

              {/* Refresh Info */}
              {optionData && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Data: {optionData.Time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    <span>Refreshed: {formatTime(lastRefreshed)}</span>
                  </div>
                  {nextRefresh && isMarketHours() && (
                    <div className="text-primary text-xs">Next: {formatTime(nextRefresh)}</div>
                  )}
                </div>
              )}
            </div>

            {/* Controls Row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-medium text-muted-foreground hidden sm:block">Symbol</label>
                <Select value={selectedSymbol} onValueChange={handleSymbolChange} disabled={symbolsLoading}>
                  <SelectTrigger className="w-full bg-background/50">
                    <SelectValue placeholder="Select Symbol" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] bg-popover">
                    {symbols.indexSymbols.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50">INDEX</div>
                        {symbols.indexSymbols.map((sym) => (
                          <SelectItem key={sym} value={sym}>
                            {sym}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {symbols.stockSymbols.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50 mt-1">STOCKS</div>
                        {symbols.stockSymbols.map((sym) => (
                          <SelectItem key={sym} value={sym}>
                            {sym}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-medium text-muted-foreground hidden sm:block">Expiry</label>
                <HeatMapExpirySelector
                  expiryDates={expiryData?.expiry_dates || []}
                  value={selectedExpiry}
                  onChange={setSelectedExpiry}
                  loading={expiryLoading}
                  disabled={!selectedSymbol}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-medium text-muted-foreground hidden sm:block">Strikes</label>
                <HeatMapStrikeCountInput value={strikeCount} onChange={setStrikeCount} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Symbol Info */}
        {optionData && (
          <div className="mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-center gap-4 text-center sm:gap-8">
                  <div>
                    <p className="text-sm text-muted-foreground">Symbol</p>
                    <p className="text-lg font-heading font-semibold text-primary">{optionData.symbol}</p>
                  </div>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  <div>
                    <p className="text-sm text-muted-foreground">Spot Price</p>
                    <p className="text-lg font-heading font-semibold">₹{optionData.Spot_Price.toFixed(2)}</p>
                  </div>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  <div>
                    <p className="text-sm text-muted-foreground">ATM Strike</p>
                    <p className="text-lg font-heading font-semibold text-atm-highlight">{optionData.atm}</p>
                  </div>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data Time</p>
                    <p className="text-lg font-heading font-semibold">{optionData.Time}</p>
                  </div>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="text-lg font-heading font-semibold">{optionData.date}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tables Section */}
        {optionData && optionData.data.length > 0 && (
          <div className="space-y-6">
            {/* Data Tables Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Open Interest & Change in OI</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2 overflow-x-auto">
                  <HeatMapOptionTable
                    data={optionData.data}
                    atm={optionData.atm}
                    type="oi"
                    spotPrice={optionData.Spot_Price}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Implied Volatility</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2 overflow-x-auto">
                  <HeatMapOptionTable
                    data={optionData.data}
                    atm={optionData.atm}
                    type="iv"
                    spotPrice={optionData.Spot_Price}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">LTP & Price Change</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2 overflow-x-auto">
                  <HeatMapOptionTable
                    data={optionData.data}
                    atm={optionData.atm}
                    type="ltp"
                    spotPrice={optionData.Spot_Price}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-center">OI COMPARISON (CE VS PE)</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  <HeatMapOIChart data={optionData.data} atm={optionData.atm} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-center">IV COMPARISON (CE VS PE)</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  <HeatMapIVChart data={optionData.data} atm={optionData.atm} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!optionData && !isLoading && (
          <Card className="animate-fade-in">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Flame className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-heading font-medium text-muted-foreground mb-2">No Data Selected</h2>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Select a symbol and expiry date to view option heat map data. Data will auto-refresh every 3 minutes
                during market hours (9:15 AM - 3:30 PM).
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && !optionData && (
          <Card className="animate-fade-in">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading option heat map data...</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
