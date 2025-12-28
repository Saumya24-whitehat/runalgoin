import { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HeatMapSymbolSelector } from "@/components/heatmap/HeatMapSymbolSelector";
import { PCROptionsChain } from "@/components/pcr/PCROptionsChain";
import { PCRIntradayAnalysis } from "@/components/pcr/PCRIntradayAnalysis";
import { PCRSupportResistance } from "@/components/pcr/PCRSupportResistance";
import { PCRSentimentGauge } from "@/components/pcr/PCRSentimentGauge";
import { fetchPCRData, PCRTimeData } from "@/services/pcrApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, TrendingUp, Clock, RefreshCw, Timer } from "lucide-react";
import { format } from "date-fns";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

const AUTO_REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes in milliseconds

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
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      setSelectedExpiry("");
      try {
        const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
          body: { endpoint: "expiry", params: { symbol: selectedSymbol } },
        });
        if (error) throw error;
        
        console.log("Expiry data received:", data);
        
        // Handle different response formats
        let dates: string[] = [];
        if (Array.isArray(data)) {
          dates = data;
        } else if (data?.expiryDates && Array.isArray(data.expiryDates)) {
          dates = data.expiryDates;
        } else if (data?.data && Array.isArray(data.data)) {
          dates = data.data;
        } else if (typeof data === 'object') {
          // Try to extract dates from object keys or values
          dates = Object.values(data).filter(v => typeof v === 'string') as string[];
        }
        
        console.log("Parsed expiry dates:", dates);
        setExpiryDates(dates);
        
        if (dates.length > 0) {
          setSelectedExpiry(dates[0]);
        }
      } catch (err) {
        console.error("Error fetching expiry dates:", err);
        toast({
          title: "Error",
          description: "Failed to load expiry dates",
          variant: "destructive",
        });
      } finally {
        setLoadingExpiry(false);
      }
    };
    fetchExpiry();
  }, [selectedSymbol, toast]);

  // Fetch PCR data
  const fetchData = useCallback(async (showLoader = true) => {
    if (!selectedSymbol || !selectedExpiry) return;
    
    if (showLoader) setLoadingData(true);
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
        
        // Set next refresh time
        const next = new Date(Date.now() + AUTO_REFRESH_INTERVAL);
        setNextRefresh(next);
      }
    } catch (err) {
      console.error("Error fetching PCR data:", err);
      if (showLoader) {
        toast({
          title: "Error",
          description: "Failed to load PCR data",
          variant: "destructive",
        });
      }
    } finally {
      if (showLoader) setLoadingData(false);
    }
  }, [selectedSymbol, selectedExpiry, strikeCount, historicalDate, toast]);

  // Auto-fetch when selections change
  useEffect(() => {
    if (selectedSymbol && selectedExpiry) {
      fetchData();
    }
  }, [selectedSymbol, selectedExpiry, fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (selectedSymbol && selectedExpiry) {
      // Clear existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      // Set up new auto-refresh interval
      refreshIntervalRef.current = setInterval(() => {
        fetchData(false); // Silent refresh
      }, AUTO_REFRESH_INTERVAL);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [selectedSymbol, selectedExpiry, fetchData]);

  // Countdown timer
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    countdownIntervalRef.current = setInterval(() => {
      if (nextRefresh) {
        const diff = nextRefresh.getTime() - Date.now();
        if (diff > 0) {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setCountdown("0:00");
        }
      }
    }, 1000);
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [nextRefresh]);

  const handleGo = () => {
    fetchData();
  };

  const handleManualRefresh = () => {
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
                <Select
                  value={selectedExpiry}
                  onValueChange={setSelectedExpiry}
                  disabled={loadingExpiry || expiryDates.length === 0}
                >
                  <SelectTrigger className="w-full bg-secondary text-secondary-foreground">
                    <SelectValue placeholder={loadingExpiry ? "Loading..." : "Select expiry"} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {expiryDates.map((date) => (
                      <SelectItem key={date} value={date}>
                        {date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <PopoverContent className="w-auto p-0 z-50" align="start">
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
                  Data Time: <span className="text-foreground">{latestData?.time || "--:--"}</span>
                </p>
              </div>
            </div>
            
            {/* Refresh Info Bar */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Data Time: <span className="text-foreground font-medium">{latestData?.time || "--:--"}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Last Updated: <span className="text-foreground font-medium">
                    {lastRefresh ? format(lastRefresh, "hh:mm:ss a") : "--:--:--"}
                  </span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5" />
                  <span>Next Refresh: <span className="text-primary font-medium">{countdown || "--:--"}</span></span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                disabled={loadingData}
                className="h-7 px-3"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingData ? 'animate-spin' : ''}`} />
                Refresh Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loadingData && !latestData && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading PCR data...</p>
            </div>
          </div>
        )}

        {/* Data Display */}
        {latestData && (
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
      </main>
    </div>
  );
};

export default PCR;
