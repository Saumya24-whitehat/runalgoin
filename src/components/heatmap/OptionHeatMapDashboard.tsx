import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, Flame, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeatMapSymbolSelector } from "@/components/heatmap/HeatMapSymbolSelector";
import { HeatMapExpirySelector } from "@/components/heatmap/HeatMapExpirySelector";
import { HeatMapStrikeCountInput } from "@/components/heatmap/HeatMapStrikeCountInput";
import { HeatMapOptionTable } from "@/components/heatmap/HeatMapOptionTable";
import { HeatMapOIChart } from "@/components/heatmap/HeatMapOIChart";
import { HeatMapIVChart } from "@/components/heatmap/HeatMapIVChart";
import {
  fetchHeatMapSymbols,
  fetchHeatMapExpiryDates,
  fetchHeatMapOptionChainData,
} from "@/services/optionHeatMapApi";
import { OptionChainResponse, GroupedSymbols } from "@/types/optionChain";

export function OptionHeatMapDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [strikeCount, setStrikeCount] = useState<number>(10);
  const [optionData, setOptionData] = useState<OptionChainResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (expiryData?.expiry_dates?.length && !selectedExpiry) {
      setSelectedExpiry(expiryData.expiry_dates[0]);
    }
  }, [expiryData, selectedExpiry]);

  // Reset expiry when symbol changes
  useEffect(() => {
    setSelectedExpiry("");
    setOptionData(null);
  }, [selectedSymbol]);

  const handleSubmit = async () => {
    if (!selectedSymbol || !selectedExpiry) return;

    setIsSubmitting(true);
    try {
      const data = await fetchHeatMapOptionChainData(
        selectedSymbol,
        selectedExpiry,
        strikeCount
      );
      setOptionData(data);
    } catch (error) {
      console.error("Failed to fetch option chain data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = () => {
    handleSubmit();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Link>
            <Flame className="h-6 w-6 text-orange-500" />
            <h1 className="text-xl font-heading font-semibold">Option Heat Map</h1>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* Controls Section */}
        <Card className="mb-6 animate-fade-in">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Symbol
                </label>
                <HeatMapSymbolSelector
                  symbols={symbols}
                  value={selectedSymbol}
                  onChange={setSelectedSymbol}
                  loading={symbolsLoading}
                />
                {symbolsError && (
                  <p className="text-xs text-destructive">Failed to load symbols</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Expiry Date
                </label>
                <HeatMapExpirySelector
                  expiryDates={expiryData?.expiry_dates || []}
                  value={selectedExpiry}
                  onChange={setSelectedExpiry}
                  loading={expiryLoading}
                  disabled={!selectedSymbol}
                />
                {expiryError && (
                  <p className="text-xs text-destructive">Failed to load expiry dates</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Strike Count
                </label>
                <HeatMapStrikeCountInput
                  value={strikeCount}
                  onChange={setStrikeCount}
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedSymbol || !selectedExpiry || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>

              {optionData && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isSubmitting ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              )}
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
                    <p className="text-lg font-heading font-semibold text-primary">
                      {optionData.symbol}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  <div>
                    <p className="text-sm text-muted-foreground">Spot Price</p>
                    <p className="text-lg font-heading font-semibold">
                      ₹{optionData.Spot_Price.toFixed(2)}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  <div>
                    <p className="text-sm text-muted-foreground">ATM Strike</p>
                    <p className="text-lg font-heading font-semibold text-atm-highlight">
                      {optionData.atm}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
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
            <div
              className="grid grid-cols-1 gap-4 lg:grid-cols-3 animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">
                    Open Interest & Change in OI
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2 overflow-x-auto">
                  <HeatMapOptionTable
                    data={optionData.data}
                    atm={optionData.atm}
                    type="oi"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">
                    Implied Volatility
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2 overflow-x-auto">
                  <HeatMapOptionTable
                    data={optionData.data}
                    atm={optionData.atm}
                    type="iv"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">
                    LTP & Price Change
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2 overflow-x-auto">
                  <HeatMapOptionTable
                    data={optionData.data}
                    atm={optionData.atm}
                    type="ltp"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div
              className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-center">
                    OI COMPARISON (CE VS PE)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  <HeatMapOIChart data={optionData.data} atm={optionData.atm} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-center">
                    IV COMPARISON (CE VS PE)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  <HeatMapIVChart data={optionData.data} atm={optionData.atm} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!optionData && !isSubmitting && (
          <Card className="animate-fade-in">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Flame className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-heading font-medium text-muted-foreground mb-2">
                No Data Selected
              </h2>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Select a symbol and expiry date, then click Submit to view option heat map data with detailed analysis and charts.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isSubmitting && (
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
