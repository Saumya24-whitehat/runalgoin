import { useState, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Info, TrendingUp, TrendingDown, ArrowUp, ArrowDown, CalendarIcon, Loader2, Timer, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { fetchPCRAllStrikesData, PCRAllStrikesTimeData } from "@/services/pcrAllStrikesApi";
import { fetchKundaliData, KundaliTimeData } from "@/services/kundaliApi";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

interface SupportResistanceDisplay {
  supportVolOI: string;
  supportStrong: number;
  resistanceVolOI: string;
  resistanceWTT: string;
  resistanceWTTDirection: "up" | "down";
  resistanceRange: string;
}

const AUTO_REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes

export default function PCRAllStrikes() {
  const { toast } = useToast();
  const [symbols, setSymbols] = useState<SymbolGroup>({ indexSymbols: [], stockSymbols: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [strikeCount, setStrikeCount] = useState(5);
  const [historicalDate, setHistoricalDate] = useState<Date | undefined>();
  
  const [pcrData, setPcrData] = useState<PCRAllStrikesTimeData[]>([]);
  const [kundaliData, setKundaliData] = useState<KundaliTimeData[]>([]);
  const [supportResistance, setSupportResistance] = useState<SupportResistanceDisplay | null>(null);
  
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  
  const [strikes, setStrikes] = useState<string[]>([]);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(-1);
  
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

  // Fetch expiry dates when symbol changes
  useEffect(() => {
    if (!selectedSymbol) return;
    
    // Set default strike count based on symbol type
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
        
        let dates: string[] = [];
        if (Array.isArray(data)) {
          dates = data;
        } else if (data?.expiry_dates && Array.isArray(data.expiry_dates)) {
          dates = data.expiry_dates;
        } else if (data?.expiryDates && Array.isArray(data.expiryDates)) {
          dates = data.expiryDates;
        } else if (data?.data && Array.isArray(data.data)) {
          dates = data.data;
        }
        
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
  }, [selectedSymbol, symbols, toast]);

  // Extract support/resistance from kundali data
  const extractSupportResistanceDisplay = (data: KundaliTimeData[]): SupportResistanceDisplay | null => {
    if (!data || data.length === 0) return null;
    
    const latest = data[data.length - 1];
    
    // volumeConditionPE[0] = Vol & OI condition
    // volumeConditionCE[0] = Vol & OI condition for resistance
    const supportVolOI = latest.volumeConditionPE[0];
    const resistanceVolOI = latest.volumeConditionCE[0];
    
    return {
      supportVolOI,
      supportStrong: latest.max_pe_strike2,
      resistanceVolOI,
      resistanceWTT: latest.volumeConditionCE[0],
      resistanceWTTDirection: latest.max_ce_strike > latest.max_ce_strike2 ? "up" : "down",
      resistanceRange: `${latest.max_ce_strike} to ${latest.max_ce_strike + 100}`,
    };
  };

  // Fetch data
  const fetchData = useCallback(async (showLoader = true) => {
    if (!selectedSymbol || !selectedExpiry) return;
    
    if (showLoader) setLoadingData(true);
    
    try {
      const [pcrResponse, kundaliResponse] = await Promise.all([
        fetchPCRAllStrikesData(
          selectedSymbol,
          selectedExpiry,
          strikeCount,
          historicalDate ? format(historicalDate, "yyyy-MM-dd") : undefined
        ),
        fetchKundaliData(selectedSymbol, selectedExpiry, 100),
      ]);

      if (pcrResponse.data && pcrResponse.data.length > 0) {
        setPcrData(pcrResponse.data);
        setSelectedTimeIndex(pcrResponse.data.length - 1);
        
        // Extract strikes from first data point
        const firstEntry = pcrResponse.data[0];
        const strikeKeys = Object.keys(firstEntry.PCR_COI).sort((a, b) => Number(a) - Number(b));
        setStrikes(strikeKeys);
      }
      
      if (kundaliResponse.dataWhole && kundaliResponse.dataWhole.length > 0) {
        setKundaliData(kundaliResponse.dataWhole);
        const srData = extractSupportResistanceDisplay(kundaliResponse.dataWhole);
        setSupportResistance(srData);
      }
      
      setLastRefresh(new Date());
      const next = new Date(Date.now() + AUTO_REFRESH_INTERVAL);
      setNextRefresh(next);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      if (showLoader) {
        toast({
          title: "Error",
          description: "Failed to fetch PCR All Strikes data",
          variant: "destructive",
        });
      }
    } finally {
      if (showLoader) setLoadingData(false);
      setIsRefreshing(false);
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
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      refreshIntervalRef.current = setInterval(() => {
        fetchData(false);
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
    setIsRefreshing(true);
    fetchData(false);
  };

  // Time navigation
  const handlePrevTime = () => {
    if (selectedTimeIndex > 0) {
      setSelectedTimeIndex(selectedTimeIndex - 1);
    }
  };

  const handleNextTime = () => {
    if (selectedTimeIndex < pcrData.length - 1) {
      setSelectedTimeIndex(selectedTimeIndex + 1);
    }
  };

  const handleTimeSelect = (index: string) => {
    setSelectedTimeIndex(parseInt(index));
  };

  // Find ATM strike based on spot price
  const getATMStrike = (spotPrice: number): string => {
    if (strikes.length === 0) return "";
    let closest = strikes[0];
    let minDiff = Math.abs(Number(strikes[0]) - spotPrice);
    
    for (const strike of strikes) {
      const diff = Math.abs(Number(strike) - spotPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closest = strike;
      }
    }
    return closest;
  };

  // Get PCR color class
  const getPCRColorClass = (pcr: number): string => {
    if (pcr >= 1.25) return "bg-emerald-500/20 text-emerald-400";
    if (pcr <= 0.80) return "bg-red-500/20 text-red-400";
    return "";
  };

  // Get arrow indicator
  const getArrowIndicator = (currentPCR: number, previousPCR: number | undefined) => {
    if (previousPCR === undefined) return null;
    if (currentPCR > previousPCR) {
      return <ArrowUp className="h-3 w-3 text-emerald-400 inline ml-1" />;
    } else if (currentPCR < previousPCR) {
      return <ArrowDown className="h-3 w-3 text-red-400 inline ml-1" />;
    }
    return null;
  };

  // Calculate divergence
  const calculateDivergence = (): number => {
    if (pcrData.length < 2) return 0;
    const latest = pcrData[pcrData.length - 1];
    const previous = pcrData[pcrData.length - 2];
    
    let divergenceCount = 0;
    const priceUp = latest.Spot_Price > previous.Spot_Price;
    
    for (const strike of strikes) {
      const currentPCR = latest.PCR_COI[strike];
      const previousPCR = previous.PCR_COI[strike];
      const pcrUp = currentPCR > previousPCR;
      
      if ((priceUp && !pcrUp) || (!priceUp && pcrUp)) {
        divergenceCount++;
      }
    }
    
    return divergenceCount;
  };

  // Reverse data for display (latest first)
  const displayData = [...pcrData].reverse();
  const currentTimeData = pcrData[selectedTimeIndex];

  return (
    <>
      <Helmet>
        <title>PCR All Strikes - Real-time PCR Analysis | Runalgo</title>
        <meta name="description" content="Track PCR (Put-Call Ratio) changes across all strike prices in real-time for Indian indices and stocks." />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <div className="sticky top-0 z-50">
          <TickerRibbon />
          <Navbar />
        </div>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Controls Card */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                {/* Symbol Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Symbol</label>
                  <Select value={selectedSymbol} onValueChange={setSelectedSymbol} disabled={loadingSymbols}>
                    <SelectTrigger className="w-full bg-background/50">
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
                
                {/* Info Button */}
                <div className="space-y-1.5 flex items-end">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Info className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-xl">PCR All Strikes - Information</DialogTitle>
                        <DialogDescription asChild>
                          <div className="space-y-4 text-sm text-muted-foreground mt-4">
                            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-emerald-500 mb-2">📊 What is PCR All Strikes?</h4>
                              <p>This page shows PCR (Put-Call Ratio) changes based on Change in OI (COI) across all strike prices over time. It helps understand option writers' behavior across different strikes.</p>
                            </div>

                            <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-primary mb-2">📈 Color Coding:</h4>
                              <ul className="list-disc list-inside space-y-1">
                                <li><span className="text-emerald-400">Green (PCR {">"} 1.25)</span>: Bullish - Put writers dominating</li>
                                <li><span className="text-red-400">Red (PCR {"<"} 0.80)</span>: Bearish - Call writers dominating</li>
                                <li><span className="text-blue-400">Blue Border</span>: ATM (At The Money) strike</li>
                              </ul>
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-yellow-500 mb-2">🔺🔻 Arrow Indicators:</h4>
                              <ul className="list-disc list-inside space-y-1">
                                <li><span className="text-emerald-400">▲ Up Arrow</span>: PCR increased from previous reading</li>
                                <li><span className="text-red-400">▼ Down Arrow</span>: PCR decreased from previous reading</li>
                              </ul>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-blue-500 mb-2">📋 Table Columns:</h4>
                              <ul className="list-disc list-inside space-y-1">
                                <li><strong>Time:</strong> Timestamp of the data point</li>
                                <li><strong>Index:</strong> Current spot price of the index</li>
                                <li><strong>MMA:</strong> Market Moving Average data</li>
                                <li><strong>Strike Columns:</strong> PCR COI values for each strike</li>
                              </ul>
                            </div>

                            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-red-500 mb-2">💡 Trading Insights:</h4>
                              <ul className="list-disc list-inside space-y-1">
                                <li>Market normally doesn't go below positive OI support</li>
                                <li>If price breaks support but PCR keeps falling → likely stoploss hunting, market may recover</li>
                                <li>If ATM moves to red PCR column and PCR still not rising → market likely to fall further</li>
                                <li>Watch for divergence between price movement and PCR changes</li>
                              </ul>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-amber-500 mb-2">📊 Divergence Count:</h4>
                              <p>Shows number of strikes where PCR direction differs from price direction. High divergence may indicate potential reversal or stoploss hunting moves.</p>
                            </div>
                          </div>
                        </DialogDescription>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
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
                    <SelectTrigger className="w-[100px] h-7 text-xs">
                      <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover max-h-[200px]">
                      {pcrData.map((entry, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {entry.Time}
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
                
                {/* Right side - refresh info */}
                <div className="flex items-center gap-4">
                  {lastRefresh && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Updated: {lastRefresh.toLocaleTimeString()}</span>
                    </div>
                  )}
                  
                  {countdown && (
                    <div className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      <span>Next: {countdown}</span>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Support & Resistance Card */}
          {supportResistance && kundaliData.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-8 text-sm">
                  {/* Support Section */}
                  <div>
                    <span className="text-emerald-400 font-semibold">Support</span>
                    <div className="text-muted-foreground">Vol & OI</div>
                    <div className="text-foreground">
                      Strong 🛡️ @ {supportResistance.supportStrong}
                    </div>
                  </div>
                  
                  {/* Resistance Section */}
                  <div>
                    <span className="text-red-400 font-semibold">Resistance</span>
                    <div className="text-muted-foreground">Vol & OI</div>
                    <div className="text-foreground flex items-center gap-1">
                      WTT {supportResistance.resistanceWTTDirection === "up" ? (
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )} {supportResistance.resistanceRange}
                    </div>
                  </div>
                  
                  {/* Divergence Section */}
                  <div>
                    <span className="text-yellow-400 font-semibold">Divergence</span>
                    <div className="text-2xl font-bold text-foreground">{calculateDivergence()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Table */}
          {pcrData.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="sticky left-0 bg-card z-10">Time</TableHead>
                        <TableHead>Index</TableHead>
                        <TableHead>MMA</TableHead>
                        {strikes.map((strike) => (
                          <TableHead key={strike} className="text-center min-w-[80px]">
                            {strike}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayData.map((row, rowIndex) => {
                        const atmStrike = getATMStrike(row.Spot_Price);
                        const originalIndex = pcrData.length - 1 - rowIndex;
                        const previousRow = originalIndex > 0 ? pcrData[originalIndex - 1] : undefined;
                        
                        return (
                          <TableRow key={rowIndex} className="border-border hover:bg-muted/30">
                            <TableCell className="sticky left-0 bg-card z-10 font-mono text-xs">
                              {row.Time}
                            </TableCell>
                            <TableCell className="font-mono">
                              {row.Spot_Price.toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {row.MMA_Data?.NP?.toFixed(2) || "--"}
                            </TableCell>
                            {strikes.map((strike) => {
                              const pcr = row.PCR_COI[strike];
                              const previousPCR = previousRow?.PCR_COI[strike];
                              const isATM = strike === atmStrike;
                              const colorClass = getPCRColorClass(pcr);
                              
                              return (
                                <TableCell
                                  key={strike}
                                  className={`text-center font-mono text-xs ${colorClass} ${
                                    isATM ? "ring-2 ring-blue-500 ring-inset" : ""
                                  }`}
                                >
                                  {pcr?.toFixed(2) || "--"}
                                  {getArrowIndicator(pcr, previousPCR)}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
          
          {/* Loading State */}
          {loadingData && pcrData.length === 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="mt-2 text-muted-foreground">Loading PCR All Strikes data...</p>
              </CardContent>
            </Card>
          )}
          
          {/* No Data State */}
          {!loadingData && pcrData.length === 0 && selectedExpiry && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No data available. Click GO to fetch data.</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </>
  );
}
