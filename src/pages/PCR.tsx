import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { ProFeatureGate } from "@/components/ProFeatureGate";
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

import { PCROptionsChain } from "@/components/pcr/PCROptionsChain";
import { PCRIntradayAnalysis } from "@/components/pcr/PCRIntradayAnalysis";
import { PCRSupportResistance } from "@/components/pcr/PCRSupportResistance";
import { PCRSentimentGauge } from "@/components/pcr/PCRSentimentGauge";
import { fetchPCRData, PCRTimeData } from "@/services/pcrApi";
import { fetchKundaliData, extractSupportResistance, SupportResistanceData } from "@/services/kundaliApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, TrendingUp, Clock, RefreshCw, Timer, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminPaletteButton } from "@/components/admin/AdminPaletteButton";
import { format } from "date-fns";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

const AUTO_REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes in milliseconds

const PCR = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const urlSymbol = searchParams.get("symbol");
  const urlExpiry = searchParams.get("expiry");
  
  const [symbols, setSymbols] = useState<SymbolGroup>({ indexSymbols: [], stockSymbols: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState(urlSymbol || "Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState(urlExpiry || "");
  const [strikeCount, setStrikeCount] = useState(5);
  const [historicalDate, setHistoricalDate] = useState<Date | undefined>();
  
  const [pcrData, setPcrData] = useState<PCRTimeData[]>([]);
  const [latestData, setLatestData] = useState<PCRTimeData | null>(null);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(-1);
  const [supportResistanceData, setSupportResistanceData] = useState<SupportResistanceData | null>(null);
  const [loadingSR, setLoadingSR] = useState(false);
  
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
        
        // API returns "index symbols" and "symbols" keys
        const indexSymbols = data?.["index symbols"] || [];
        const stockSymbols = data?.symbols || [];
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

  // Fetch expiry dates when symbol changes and update default strike count
  useEffect(() => {
    if (!selectedSymbol) return;
    
    // Set default strike count based on symbol type
    // Only update strike count if symbols list is loaded (not empty)
    if (symbols.indexSymbols.length > 0 || symbols.stockSymbols.length > 0) {
      const isIndexSymbol = symbols.indexSymbols.includes(selectedSymbol);
      setStrikeCount(isIndexSymbol ? 5 : 2);
    }
    
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
        } else if (data?.expiry_dates && Array.isArray(data.expiry_dates)) {
          // API returns expiry_dates (snake_case)
          dates = data.expiry_dates;
        } else if (data?.expiryDates && Array.isArray(data.expiryDates)) {
          dates = data.expiryDates;
        } else if (data?.data && Array.isArray(data.data)) {
          dates = data.data;
        }
        
        console.log("Parsed expiry dates:", dates);
        setExpiryDates(dates);
        
        if (dates.length > 0) {
          // Use URL expiry if valid, otherwise default to first
          if (urlExpiry && dates.includes(urlExpiry)) {
            setSelectedExpiry(urlExpiry);
          } else {
            setSelectedExpiry(dates[0]);
          }
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
    setLoadingSR(true);
    
    try {
      // Fetch PCR data
      const response = await fetchPCRData(
        selectedSymbol,
        selectedExpiry,
        strikeCount,
        historicalDate ? format(historicalDate, "yyyy-MM-dd") : undefined
      );
      
      if (response.dataWhole && response.dataWhole.length > 0) {
        setPcrData(response.dataWhole);
        setSelectedTimeIndex(response.dataWhole.length - 1);
        
        // Get the latest data entry and fill missing Future/VWAP from previous entries
        let latest = { ...response.dataWhole[response.dataWhole.length - 1] };
        let futureFromPrevious = false;
        let vwapFromPrevious = false;
        
        if (latest.Future === 0 || !latest.Future) {
          // Find Future from previous entries
          for (let i = response.dataWhole.length - 2; i >= 0; i--) {
            if (response.dataWhole[i].Future && response.dataWhole[i].Future !== 0) {
              latest.Future = response.dataWhole[i].Future;
              futureFromPrevious = true;
              break;
            }
          }
        }
        
        if (latest.VWAP === 0 || !latest.VWAP) {
          // Find VWAP from previous entries
          for (let i = response.dataWhole.length - 2; i >= 0; i--) {
            if (response.dataWhole[i].VWAP && response.dataWhole[i].VWAP !== 0) {
              latest.VWAP = response.dataWhole[i].VWAP;
              vwapFromPrevious = true;
              break;
            }
          }
        }
        
        // Store flags for UI display
        (latest as any).futureFromPrevious = futureFromPrevious;
        (latest as any).vwapFromPrevious = vwapFromPrevious;
        
        setLatestData(latest);
        setLastRefresh(new Date());
        
        // Set next refresh time
        const next = new Date(Date.now() + AUTO_REFRESH_INTERVAL);
        setNextRefresh(next);
      }
      
      // Fetch Kundali data for Support & Resistance
      try {
        const kundaliResponse = await fetchKundaliData(
          selectedSymbol,
          selectedExpiry,
          100
        );
        
        if (kundaliResponse.dataWhole && kundaliResponse.dataWhole.length > 0) {
          const srData = extractSupportResistance(
            kundaliResponse.dataWhole,
            response.dataWhole[response.dataWhole.length - 1]?.underlyning || 0
          );
          setSupportResistanceData(srData);
        }
      } catch (srErr) {
        console.error("Error fetching Kundali data:", srErr);
        // Don't fail the whole request if SR data fails
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
      setLoadingSR(false);
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

  // Time navigation handlers
  const handlePrevTime = () => {
    if (selectedTimeIndex > 0) {
      const newIndex = selectedTimeIndex - 1;
      setSelectedTimeIndex(newIndex);
      updateSelectedData(newIndex);
    }
  };

  const handleNextTime = () => {
    if (selectedTimeIndex < pcrData.length - 1) {
      const newIndex = selectedTimeIndex + 1;
      setSelectedTimeIndex(newIndex);
      updateSelectedData(newIndex);
    }
  };

  const handleTimeSelect = (index: string) => {
    const newIndex = parseInt(index);
    setSelectedTimeIndex(newIndex);
    updateSelectedData(newIndex);
  };

  const updateSelectedData = (index: number) => {
    if (pcrData[index]) {
      let data = { ...pcrData[index] };
      let futureFromPrevious = false;
      let vwapFromPrevious = false;
      
      if (data.Future === 0 || !data.Future) {
        for (let i = index - 1; i >= 0; i--) {
          if (pcrData[i].Future && pcrData[i].Future !== 0) {
            data.Future = pcrData[i].Future;
            futureFromPrevious = true;
            break;
          }
        }
      }
      
      if (data.VWAP === 0 || !data.VWAP) {
        for (let i = index - 1; i >= 0; i--) {
          if (pcrData[i].VWAP && pcrData[i].VWAP !== 0) {
            data.VWAP = pcrData[i].VWAP;
            vwapFromPrevious = true;
            break;
          }
        }
      }
      
      (data as any).futureFromPrevious = futureFromPrevious;
      (data as any).vwapFromPrevious = vwapFromPrevious;
      setLatestData(data);
    }
  };

  const currentTimeData = pcrData[selectedTimeIndex];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>
      
      <ProFeatureGate featureName="PCR Analysis">
        <main className="container px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Controls Card */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 items-end">
              {/* Symbol Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Symbol</label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol} disabled={loadingSymbols}>
                  <SelectTrigger className="w-full bg-background/50 h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Select Symbol" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] bg-popover">
                    {symbols.indexSymbols.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50">INDEX</div>
                        {symbols.indexSymbols.map((sym) => (
                          <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                        ))}
                      </>
                    )}
                    {symbols.stockSymbols.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50 mt-1">STOCKS</div>
                        {symbols.stockSymbols.map((sym) => (
                          <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Expiry Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Expiry</label>
                <Select
                  value={selectedExpiry}
                  onValueChange={setSelectedExpiry}
                  disabled={loadingExpiry || expiryDates.length === 0}
                >
                  <SelectTrigger className="w-full bg-secondary text-secondary-foreground h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder={loadingExpiry ? "Loading..." : "Select"} />
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
              
              {/* Historical Date - Hidden on mobile by default */}
              <div className="space-y-1.5 hidden sm:block">
                <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Historical</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-secondary h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      {historicalDate ? format(historicalDate, "dd/MM") : "Date"}
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
                <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Strikes</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={strikeCount}
                  onChange={(e) => setStrikeCount(parseInt(e.target.value) || 5)}
                  className="bg-secondary h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              
              {/* GO Button */}
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-xs font-medium text-muted-foreground invisible hidden sm:block">Action</label>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGo}
                    disabled={loadingData || !selectedSymbol || !selectedExpiry}
                    className="flex-1 bg-primary hover:bg-primary/90 h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    {loadingData ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      "GO"
                    )}
                  </Button>
                  <AdminPaletteButton />
                </div>
              </div>
              
            </div>
            
            {/* Refresh Info Bar with Time Navigation */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
              {/* Time Navigation Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handlePrevTime}
                  disabled={selectedTimeIndex <= 0 || pcrData.length === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Select
                  value={selectedTimeIndex.toString()}
                  onValueChange={handleTimeSelect}
                  disabled={pcrData.length === 0}
                >
                  <SelectTrigger className="w-[80px] h-7 bg-secondary text-xs">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50 max-h-[200px]">
                    {pcrData.map((item, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {item.time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleNextTime}
                  disabled={selectedTimeIndex >= pcrData.length - 1 || pcrData.length === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Data Time: <span className="text-foreground font-medium">{currentTimeData?.time || "--:--"}</span></span>
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
                <p className="text-2xl font-bold text-foreground">
                  {latestData.Future.toFixed(2)}
                  {(latestData as any).futureFromPrevious && <span className="text-primary text-sm">*</span>}
                </p>
              </Card>
              <Card className="bg-card/50 border-border/50 p-4">
                <p className="text-xs text-muted-foreground">VWAP</p>
                <p className="text-2xl font-bold text-foreground">
                  {latestData.VWAP.toFixed(2)}
                  {(latestData as any).vwapFromPrevious && <span className="text-primary text-sm">*</span>}
                </p>
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
              supportResistanceData={supportResistanceData}
              spotPrice={latestData.underlyning}
              loading={loadingSR}
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
    </ProFeatureGate>
      <Footer />
    </div>
  );
};

export default PCR;
