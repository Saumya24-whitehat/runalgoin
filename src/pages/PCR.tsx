import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HeatMapSymbolSelector } from "@/components/heatmap/HeatMapSymbolSelector";
import { HeatMapExpirySelector } from "@/components/heatmap/HeatMapExpirySelector";
import { PCROptionsChain } from "@/components/pcr/PCROptionsChain";
import { PCRIntradayAnalysis } from "@/components/pcr/PCRIntradayAnalysis";
import { PCRSupportResistance } from "@/components/pcr/PCRSupportResistance";
import { PCRSentimentGauge } from "@/components/pcr/PCRSentimentGauge";
import { fetchPCRData, PCRTimeData, PCRStrikeData } from "@/services/pcrApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, TrendingUp, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

const PCR = () => {
  const { toast } = useToast();
  const [symbols, setSymbols] = useState<SymbolGroup>({ indexSymbols: [], stockSymbols: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [strikeCount, setStrikeCount] = useState(10);
  const [historicalDate, setHistoricalDate] = useState<Date | undefined>();
  
  const [pcrData, setPcrData] = useState<PCRTimeData[]>([]);
  const [latestData, setLatestData] = useState<PCRTimeData | null>(null);
  
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch symbols on mount
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
          body: { endpoint: "symbols" },
        });
        if (error) throw error;
        
        const indexSymbols = data?.indexSymbols || [];
        const stockSymbols = data?.stockSymbols || [];
        setSymbols({ indexSymbols, stockSymbols });
      } catch (err) {
        console.error("Error fetching symbols:", err);
        toast({
          title: "Error",
          description: "Failed to load symbols",
          variant: "destructive",
        });
      } finally {
        setLoadingSymbols(false);
      }
    };
    fetchSymbols();
  }, [toast]);

  // Fetch expiry dates when symbol changes
  useEffect(() => {
    if (!selectedSymbol) return;
    
    const fetchExpiry = async () => {
      setLoadingExpiry(true);
      try {
        const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
          body: { endpoint: "expiry", params: { symbol: selectedSymbol } },
        });
        if (error) throw error;
        
        const dates = data?.expiryDates || [];
        setExpiryDates(dates);
        if (dates.length > 0) {
          setSelectedExpiry(dates[0]);
        }
      } catch (err) {
        console.error("Error fetching expiry dates:", err);
      } finally {
        setLoadingExpiry(false);
      }
    };
    fetchExpiry();
  }, [selectedSymbol]);

  // Fetch PCR data
  const fetchData = useCallback(async () => {
    if (!selectedSymbol || !selectedExpiry) return;
    
    setLoadingData(true);
    try {
      const response = await fetchPCRData(
        selectedSymbol,
        selectedExpiry,
        strikeCount,
        historicalDate ? format(historicalDate, "yyyy-MM-dd") : undefined
      );
      
      if (response.dataWhole && response.dataWhole.length > 0) {
        setPcrData(response.dataWhole);
        setLatestData(response.dataWhole[response.dataWhole.length - 1]);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error("Error fetching PCR data:", err);
      toast({
        title: "Error",
        description: "Failed to load PCR data",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  }, [selectedSymbol, selectedExpiry, strikeCount, historicalDate, toast]);

  // Auto-fetch when selections change
  useEffect(() => {
    if (selectedSymbol && selectedExpiry) {
      fetchData();
    }
  }, [selectedSymbol, selectedExpiry, fetchData]);

  const handleGo = () => {
    fetchData();
  };

  return (
    <div className="min-h-screen bg-background">
      <TickerRibbon />
      <Navbar />
      
      <main className="container py-6 space-y-6">
        {/* Controls Card */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
              {/* Symbol Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Symbol</label>
                <HeatMapSymbolSelector
                  symbols={symbols}
                  value={selectedSymbol}
                  onChange={setSelectedSymbol}
                  loading={loadingSymbols}
                />
              </div>
              
              {/* Expiry Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Expiry Date</label>
                <HeatMapExpirySelector
                  expiryDates={expiryDates}
                  value={selectedExpiry}
                  onChange={setSelectedExpiry}
                  loading={loadingExpiry}
                />
              </div>
              
              {/* Historical Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Historical Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-secondary"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {historicalDate ? format(historicalDate, "dd/MM/yyyy") : "dd/mm/yyyy"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={historicalDate}
                      onSelect={setHistoricalDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Strike Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Strikes</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={strikeCount}
                  onChange={(e) => setStrikeCount(parseInt(e.target.value) || 5)}
                  className="bg-secondary"
                />
              </div>
              
              {/* GO Button */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground invisible">Action</label>
                <Button
                  onClick={handleGo}
                  disabled={loadingData || !selectedSymbol || !selectedExpiry}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {loadingData ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "GO"
                  )}
                </Button>
              </div>
              
              {/* Info Section */}
              <div className="space-y-1 text-right">
                <p className="text-xs text-muted-foreground">
                  Symbol: <span className="text-primary font-medium">{selectedSymbol}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Time: <span className="text-foreground">{latestData?.time || "--:--"}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loadingData && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading PCR data...</p>
            </div>
          </div>
        )}

        {/* Data Display */}
        {!loadingData && latestData && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Card className="bg-card/50 border-border/50 p-4">
                <p className="text-xs text-muted-foreground">PCR (OI)</p>
                <p className={`text-2xl font-bold ${latestData.PCR_OI < 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {latestData.PCR_OI.toFixed(2)}
                </p>
              </Card>
              <Card className="bg-card/50 border-border/50 p-4">
                <p className="text-xs text-muted-foreground">PCR (COI)</p>
                <p className={`text-2xl font-bold ${latestData.PCR_COI < 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {latestData.PCR_COI.toFixed(2)}
                </p>
              </Card>
              <Card className="bg-card/50 border-border/50 p-4">
                <p className="text-xs text-muted-foreground">Spot Price</p>
                <p className="text-2xl font-bold text-foreground">{latestData.underlyning.toFixed(2)}</p>
              </Card>
              <Card className="bg-card/50 border-border/50 p-4">
                <p className="text-xs text-muted-foreground">Future</p>
                <p className="text-2xl font-bold text-foreground">{latestData.Future.toFixed(2)}</p>
              </Card>
              <Card className="bg-card/50 border-border/50 p-4">
                <p className="text-xs text-muted-foreground">VWAP</p>
                <p className="text-2xl font-bold text-foreground">{latestData.VWAP.toFixed(2)}</p>
              </Card>
              <Card className="bg-card/50 border-border/50 p-4">
                <p className="text-xs text-muted-foreground">ATM Strike</p>
                <p className="text-2xl font-bold text-primary">{latestData.atm}</p>
              </Card>
            </div>

            {/* Options Chain */}
            <PCROptionsChain
              data={latestData.dataThis}
              atm={latestData.atm}
              spotPrice={latestData.underlyning}
              pcrOI={latestData.PCR_OI}
              pcrCOI={latestData.PCR_COI}
            />

            {/* Intraday Analysis */}
            <PCRIntradayAnalysis data={pcrData} />

            {/* Support & Resistance */}
            <PCRSupportResistance
              data={latestData.dataThis}
              spotPrice={latestData.underlyning}
              atm={latestData.atm}
            />

            {/* Market Sentiment */}
            <PCRSentimentGauge
              pcrOI={latestData.PCR_OI}
              pcrCOI={latestData.PCR_COI}
            />
          </div>
        )}

        {/* Empty State */}
        {!loadingData && !latestData && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <TrendingUp className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Select Symbol and Expiry to view PCR data</p>
            <p className="text-sm">Put Call Ratio analysis will appear here</p>
          </div>
        )}

        {/* Refresh Info */}
        {lastRefresh && (
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Data Time: {latestData?.time || "--:--"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Last Refreshed: {format(lastRefresh, "hh:mm:ss a")}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PCR;
