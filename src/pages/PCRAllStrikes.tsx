import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Info, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPCRAllStrikesData, PCRAllStrikesTimeData } from "@/services/pcrAllStrikesApi";
import { fetchKundaliData, extractSupportResistance, SupportResistanceData } from "@/services/kundaliApi";

interface SymbolGroup {
  indices: string[];
  stocks: string[];
}

const AUTO_REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes

export default function PCRAllStrikes() {
  const { toast } = useToast();
  const [symbols, setSymbols] = useState<SymbolGroup>({ indices: [], stocks: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [strikeCount, setStrikeCount] = useState(5);
  const [historicalDate, setHistoricalDate] = useState("");
  const [pcrData, setPcrData] = useState<PCRAllStrikesTimeData[]>([]);
  const [supportResistanceData, setSupportResistanceData] = useState<SupportResistanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(AUTO_REFRESH_INTERVAL / 1000);
  const [strikes, setStrikes] = useState<string[]>([]);

  // Fetch symbols on mount
  useEffect(() => {
    const fetchSymbols = async () => {
      const { data } = await supabase.functions.invoke("option-chain", {
        body: { action: "getSymbols" },
      });
      if (data?.indices && data?.stocks) {
        setSymbols({ indices: data.indices, stocks: data.stocks });
      }
    };
    fetchSymbols();
  }, []);

  // Fetch expiry dates when symbol changes
  useEffect(() => {
    const fetchExpiries = async () => {
      if (!selectedSymbol) return;
      const { data } = await supabase.functions.invoke("option-chain", {
        body: { action: "getExpiries", symbol: selectedSymbol },
      });
      if (data?.expiries) {
        setExpiryDates(data.expiries);
        if (data.expiries.length > 0 && !selectedExpiry) {
          setSelectedExpiry(data.expiries[0]);
        }
      }
    };
    fetchExpiries();
  }, [selectedSymbol]);

  const fetchData = useCallback(async (showToast = false) => {
    if (!selectedSymbol || !selectedExpiry) return;
    
    setIsLoading(true);
    try {
      // Fetch both PCR all strikes and Kundali data
      const [pcrResponse, kundaliResponse] = await Promise.all([
        fetchPCRAllStrikesData(selectedSymbol, selectedExpiry, strikeCount, historicalDate || undefined),
        fetchKundaliData(selectedSymbol, selectedExpiry, 100),
      ]);

      if (pcrResponse.data && pcrResponse.data.length > 0) {
        setPcrData(pcrResponse.data);
        
        // Extract strikes from first data point
        const firstEntry = pcrResponse.data[0];
        const strikeKeys = Object.keys(firstEntry.PCR_COI).sort((a, b) => Number(a) - Number(b));
        setStrikes(strikeKeys);
        
        // Extract support/resistance from kundali data
        if (kundaliResponse.dataWhole && kundaliResponse.dataWhole.length > 0) {
          const spotPrice = pcrResponse.data[pcrResponse.data.length - 1].Spot_Price;
          const srData = extractSupportResistance(kundaliResponse.dataWhole, spotPrice);
          setSupportResistanceData(srData);
        }
        
        setLastUpdated(new Date());
        setNextRefreshIn(AUTO_REFRESH_INTERVAL / 1000);
        
        if (showToast) {
          toast({
            title: "Data Refreshed",
            description: `PCR All Strikes data updated for ${selectedSymbol}`,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch PCR All Strikes data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedSymbol, selectedExpiry, strikeCount, historicalDate, toast]);

  const handleGo = () => {
    fetchData(true);
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchData(true);
  };

  // Auto refresh
  useEffect(() => {
    if (!pcrData.length) return;

    const countdownInterval = setInterval(() => {
      setNextRefreshIn((prev) => {
        if (prev <= 1) {
          fetchData();
          return AUTO_REFRESH_INTERVAL / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [pcrData.length, fetchData]);

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

  // Calculate divergence - count of strikes where PCR direction differs from price direction
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
      
      // Divergence: price up but PCR down (bearish divergence) or price down but PCR up (bullish divergence)
      if ((priceUp && !pcrUp) || (!priceUp && pcrUp)) {
        divergenceCount++;
      }
    }
    
    return divergenceCount;
  };

  // Reverse data for display (latest first)
  const displayData = [...pcrData].reverse();

  return (
    <>
      <Helmet>
        <title>PCR All Strikes - Real-time PCR Analysis | Runalgo</title>
        <meta name="description" content="Track PCR (Put-Call Ratio) changes across all strike prices in real-time for Indian indices and stocks." />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <TickerRibbon />

        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Controls Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                {/* Symbol */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Symbol</label>
                  <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                    <SelectTrigger className="w-[140px] bg-secondary border-border">
                      <SelectValue placeholder="Select Symbol" />
                    </SelectTrigger>
                    <SelectContent className="bg-dropdown-bg border-dropdown-border z-50">
                      <SelectItem value="Nifty 50">Nifty 50</SelectItem>
                      {symbols.indices.map((idx) => (
                        <SelectItem key={idx} value={idx}>{idx}</SelectItem>
                      ))}
                      {symbols.stocks.map((stock) => (
                        <SelectItem key={stock} value={stock}>{stock}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expiry Date */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Expiry Date</label>
                  <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
                    <SelectTrigger className="w-[140px] bg-secondary border-border">
                      <SelectValue placeholder="Select Expiry" />
                    </SelectTrigger>
                    <SelectContent className="bg-dropdown-bg border-dropdown-border z-50">
                      {expiryDates.map((date) => (
                        <SelectItem key={date} value={date}>{date}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Historical Date */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Date</label>
                  <Input
                    type="date"
                    value={historicalDate}
                    onChange={(e) => setHistoricalDate(e.target.value)}
                    className="w-[140px] bg-secondary border-border"
                  />
                </div>

                {/* Strike Count */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Strikes</label>
                  <Input
                    type="number"
                    value={strikeCount}
                    onChange={(e) => setStrikeCount(Number(e.target.value))}
                    className="w-[80px] bg-secondary border-border"
                    min={1}
                    max={20}
                  />
                </div>

                {/* Go Button */}
                <Button onClick={handleGo} disabled={isLoading} className="bg-primary text-primary-foreground">
                  {isLoading ? "Loading..." : "Go"}
                </Button>

                {/* Support/Resistance Info */}
                {supportResistanceData && (
                  <div className="flex-1 flex flex-wrap gap-4 ml-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Symbol:</span>{" "}
                      <span className="text-foreground font-medium">{selectedSymbol}</span>
                      <div className="text-xs text-muted-foreground">
                        Time:{displayData[0]?.Time || "--"}
                      </div>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-medium">Support</span>
                      <div className="text-foreground">{supportResistanceData.support}</div>
                      <div className="text-xs">
                        Strong 🛡️ @ {supportResistanceData.strongSupport}
                      </div>
                    </div>
                    <div>
                      <span className="text-red-400 font-medium">Resistance</span>
                      <div className="text-foreground">{supportResistanceData.resistance}</div>
                      <div className="text-xs">
                        WTT <TrendingUp className="h-3 w-3 inline" /> {supportResistanceData.strongResistance} to {supportResistanceData.strongResistance + 100}
                      </div>
                    </div>
                    <div>
                      <span className="text-yellow-400 font-medium">Divergence</span>
                      <div className="text-foreground text-lg">{calculateDivergence()}</div>
                    </div>
                  </div>
                )}

                {/* Info Button */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="ml-auto">
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
            </CardContent>
          </Card>

          {/* Refresh Info Bar */}
          {pcrData.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg">
              <div className="flex items-center gap-4">
                <span>Data Time: {displayData[0]?.Time || "--"}</span>
                <span>Last Updated: {lastUpdated?.toLocaleTimeString() || "--"}</span>
                <span>Next Refresh: {Math.floor(nextRefreshIn / 60)}:{String(nextRefreshIn % 60).padStart(2, "0")}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="border-border"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          )}

          {/* Data Table */}
          {pcrData.length > 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-foreground font-semibold w-[80px]">Time</TableHead>
                        <TableHead className="text-foreground font-semibold w-[100px]">Index</TableHead>
                        <TableHead className="text-foreground font-semibold w-[100px]">MMA</TableHead>
                        {strikes.map((strike) => (
                          <TableHead key={strike} className="text-foreground font-semibold text-center min-w-[80px]">
                            {strike}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayData.map((row, rowIndex) => {
                        const atmStrike = getATMStrike(row.Spot_Price);
                        const previousRow = displayData[rowIndex + 1]; // Previous in display order (next in time order)
                        
                        return (
                          <TableRow key={rowIndex} className="border-border hover:bg-secondary/50">
                            <TableCell className="text-foreground font-mono">{row.Time}</TableCell>
                            <TableCell className="text-foreground font-mono">{row.Spot_Price.toFixed(2)}</TableCell>
                            <TableCell className="text-foreground font-mono">
                              {row.MMA_Data?.BankniftyPrice?.toFixed(2) || "--"}
                            </TableCell>
                            {strikes.map((strike) => {
                              const pcr = row.PCR_COI[strike];
                              const prevPcr = previousRow?.PCR_COI[strike];
                              const isATM = strike === atmStrike;
                              const colorClass = getPCRColorClass(pcr);
                              
                              return (
                                <TableCell
                                  key={strike}
                                  className={`text-center font-mono ${colorClass} ${
                                    isATM ? "ring-2 ring-blue-500 ring-inset" : ""
                                  }`}
                                >
                                  {pcr.toFixed(2)}
                                  {getArrowIndicator(pcr, prevPcr)}
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
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>Select symbol and expiry date, then click "Go" to load PCR All Strikes data.</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </>
  );
}
