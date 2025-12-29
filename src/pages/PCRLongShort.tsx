import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Activity, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { fetchPCRLongShortData, LongShortTimeData, LongShortStrikeData } from "@/services/pcrLongShortApi";
import { toast } from "sonner";

interface SymbolsData {
  indexSymbols: string[];
  stockSymbols: string[];
}

const formatNumber = (value: number): string => {
  if (value === 0) return "0";
  if (Math.abs(value) >= 10000000) return (value / 10000000).toFixed(2) + " Cr";
  if (Math.abs(value) >= 100000) return (value / 100000).toFixed(2) + " L";
  if (Math.abs(value) >= 1000) return (value / 1000).toFixed(2) + " K";
  return value.toFixed(2);
};

const formatLTP = (value: number): string => {
  return value.toFixed(2);
};

const formatRatio = (value: number): string => {
  if (isNaN(value) || !isFinite(value)) return "0.00";
  return value.toFixed(2);
};

const PCRLongShort = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [symbols, setSymbols] = useState<SymbolsData>({ indexSymbols: [], stockSymbols: [] });
  const [selectedSymbol, setSelectedSymbol] = useState<string>("Nifty 50");
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [strikeCount, setStrikeCount] = useState<string>("5");
  const [data, setData] = useState<LongShortTimeData[]>([]);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(0);

  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch symbols
  useEffect(() => {
    fetchSymbols();
  }, []);

  // Fetch expiry when symbol changes
  useEffect(() => {
    if (selectedSymbol) {
      fetchExpiryDates(selectedSymbol);
    }
  }, [selectedSymbol]);

  // Fetch data when expiry changes
  useEffect(() => {
    if (selectedExpiry && selectedSymbol) {
      fetchData();
    }
  }, [selectedExpiry]);

  const fetchSymbols = async () => {
    setLoadingSymbols(true);
    try {
      const { data, error } = await supabase.functions.invoke("option-chain", {
        body: { action: "getSymbols" },
      });

      if (error) throw error;

      const idxSymbols = data?.["index symbols"] || data?.index_symbols || [];
      const stkSymbols = data?.symbols || [];
      setSymbols({ indexSymbols: idxSymbols, stockSymbols: stkSymbols });
    } catch (error) {
      console.error("Error fetching symbols:", error);
      toast.error("Failed to fetch symbols");
    } finally {
      setLoadingSymbols(false);
    }
  };

  const fetchExpiryDates = async (symbol: string) => {
    setLoadingExpiry(true);
    try {
      const { data, error } = await supabase.functions.invoke("option-chain", {
        body: { action: "getExpiryDates", symbol },
      });

      if (error) throw error;

      const dates = data.expiry_dates || [];
      setExpiryDates(dates);
      if (dates.length > 0) {
        setSelectedExpiry(dates[0]);
      }
    } catch (error) {
      console.error("Error fetching expiry dates:", error);
      toast.error("Failed to fetch expiry dates");
    } finally {
      setLoadingExpiry(false);
    }
  };

  const fetchData = async () => {
    if (!selectedSymbol || !selectedExpiry) return;

    setLoadingData(true);
    try {
      const response = await fetchPCRLongShortData(
        selectedSymbol,
        selectedExpiry,
        parseInt(strikeCount)
      );

      if (response.dataWhole && response.dataWhole.length > 0) {
        setData(response.dataWhole);
        setSelectedTimeIndex(response.dataWhole.length - 1); // Latest time
      } else {
        setData([]);
        toast.error("No data available");
      }
    } catch (error) {
      console.error("Error fetching PCR Long/Short data:", error);
      toast.error("Failed to fetch data");
      setData([]);
    } finally {
      setLoadingData(false);
    }
  };

  // Current time data
  const currentTimeData = useMemo(() => {
    if (data.length === 0 || selectedTimeIndex < 0) return null;
    return data[selectedTimeIndex];
  }, [data, selectedTimeIndex]);

  // Calculate Long/Short ratios for each strike
  const calculateRatio = (long: number, short: number): number => {
    if (short === 0) return long > 0 ? Infinity : 0;
    return long / short;
  };

  // Get cell background color based on value
  const getHighlightClass = (value: number, isHighValue: boolean = false): string => {
    if (value === 0) return "";
    if (isHighValue) {
      return "bg-emerald-500/20 text-emerald-400";
    }
    return "";
  };

  // Intraday analysis data (reversed for latest first)
  const intradayData = useMemo(() => {
    return [...data].reverse();
  }, [data]);

  // Get PCR color
  const getPCRColor = (pcr: number): string => {
    if (pcr > 1) return "bg-emerald-500 text-white";
    if (pcr < 1) return "bg-red-500 text-white";
    return "bg-yellow-500 text-black";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 space-y-4">
        {/* Controls Card */}
        <Card className="bg-card/50 backdrop-blur border-border/30">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Symbol Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Symbol</label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol} disabled={loadingSymbols}>
                  <SelectTrigger className="w-[140px] sm:w-[160px] bg-background/50">
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
                <label className="text-xs font-medium text-muted-foreground">Expiry</label>
                <Select value={selectedExpiry} onValueChange={setSelectedExpiry} disabled={loadingExpiry}>
                  <SelectTrigger className="w-[120px] sm:w-[140px] bg-background/50">
                    <SelectValue placeholder="Select Expiry" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {expiryDates.map((date) => (
                      <SelectItem key={date} value={date}>{date}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Strike Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Strikes</label>
                <Select value={strikeCount} onValueChange={setStrikeCount}>
                  <SelectTrigger className="w-[70px] bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {["3", "5", "7", "9", "11"].map((count) => (
                      <SelectItem key={count} value={count}>{count}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Go Button */}
              <Button
                onClick={fetchData}
                disabled={loadingData || !selectedExpiry}
                className="bg-primary hover:bg-primary/90"
              >
                {loadingData ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Go
              </Button>

              {/* Symbol Info */}
              {currentTimeData && (
                <div className="ml-auto flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">Symbol: {selectedSymbol}</div>
                    <div className="text-xs text-muted-foreground">Time: {currentTimeData.time}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : currentTimeData ? (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CE Table */}
            <Card className="bg-card/50 backdrop-blur border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  CE (Call Options)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-center font-semibold">Strike</TableHead>
                        <TableHead className="text-center font-semibold">LTP</TableHead>
                        <TableHead className="text-center font-semibold">LONG</TableHead>
                        <TableHead className="text-center font-semibold">SHORT</TableHead>
                        <TableHead className="text-center font-semibold">Ratio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentTimeData.dataThis.map((strike, idx) => {
                        const ratio = calculateRatio(strike["Call Buying"], strike["Call Writing"]);
                        const isATM = strike.Strike === currentTimeData.atm;
                        return (
                          <TableRow 
                            key={idx} 
                            className={isATM ? "bg-primary/20 border-l-4 border-l-primary" : "hover:bg-muted/20"}
                          >
                            <TableCell className="text-center font-medium">{strike.Strike}</TableCell>
                            <TableCell className="text-center">{formatLTP(strike["CE LTP"])}</TableCell>
                            <TableCell className={`text-center ${strike["Call Buying"] > 0 ? "bg-emerald-500/20 text-emerald-400" : ""}`}>
                              {formatNumber(strike["Call Buying"])}
                            </TableCell>
                            <TableCell className={`text-center ${strike["Call Writing"] > 0 ? "bg-red-500/20 text-red-400" : ""}`}>
                              {formatNumber(strike["Call Writing"])}
                            </TableCell>
                            <TableCell className="text-center font-semibold">{formatRatio(ratio)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Totals Row */}
                      <TableRow className="bg-muted/50 font-semibold border-t-2">
                        <TableCell className="text-center">Total</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-center text-emerald-400">
                          {formatNumber(currentTimeData.CE_Buy_OI)}
                        </TableCell>
                        <TableCell className="text-center text-red-400">
                          {formatNumber(currentTimeData.CE_Sell_OI)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* PE Table */}
            <Card className="bg-card/50 backdrop-blur border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  PE (Put Options)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-center font-semibold">Strike</TableHead>
                        <TableHead className="text-center font-semibold">LTP</TableHead>
                        <TableHead className="text-center font-semibold">LONG</TableHead>
                        <TableHead className="text-center font-semibold">SHORT</TableHead>
                        <TableHead className="text-center font-semibold">Ratio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentTimeData.dataThis.map((strike, idx) => {
                        const ratio = calculateRatio(strike["Put Buying"], strike["Put Writing"]);
                        const isATM = strike.Strike === currentTimeData.atm;
                        return (
                          <TableRow 
                            key={idx} 
                            className={isATM ? "bg-primary/20 border-l-4 border-l-primary" : "hover:bg-muted/20"}
                          >
                            <TableCell className="text-center font-medium">{strike.Strike}</TableCell>
                            <TableCell className="text-center">{formatLTP(strike["PE LTP"])}</TableCell>
                            <TableCell className={`text-center ${strike["Put Buying"] > 0 ? "bg-emerald-500/20 text-emerald-400" : ""}`}>
                              {formatNumber(strike["Put Buying"])}
                            </TableCell>
                            <TableCell className={`text-center ${strike["Put Writing"] > 0 ? "bg-red-500/20 text-red-400" : ""}`}>
                              {formatNumber(strike["Put Writing"])}
                            </TableCell>
                            <TableCell className="text-center font-semibold">{formatRatio(ratio)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Totals Row */}
                      <TableRow className="bg-muted/50 font-semibold border-t-2">
                        <TableCell className="text-center">Total</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-center text-emerald-400">
                          {formatNumber(currentTimeData.PE_Buy_OI)}
                        </TableCell>
                        <TableCell className="text-center text-red-400">
                          {formatNumber(currentTimeData.PE_Sell_OI)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Intraday Analysis Table - Full Width Below */}
          <Card className="bg-card/50 backdrop-blur border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Intraday Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-center font-semibold">Time</TableHead>
                      <TableHead className="text-center font-semibold">Index</TableHead>
                      <TableHead colSpan={2} className="text-center font-semibold border-l border-border">CE</TableHead>
                      <TableHead colSpan={2} className="text-center font-semibold border-l border-border">PE</TableHead>
                      <TableHead className="text-center font-semibold border-l border-border">PCR</TableHead>
                    </TableRow>
                    <TableRow className="bg-muted/20">
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      <TableHead className="text-center text-xs border-l border-border">BUYING</TableHead>
                      <TableHead className="text-center text-xs">SELLING</TableHead>
                      <TableHead className="text-center text-xs border-l border-border">BUYING</TableHead>
                      <TableHead className="text-center text-xs">SELLING</TableHead>
                      <TableHead className="text-center text-xs border-l border-border">L/S</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {intradayData.map((timeData, idx) => {
                      const ceLongShort = timeData.CE_Sell_OI > 0 
                        ? timeData.CE_Buy_OI / timeData.CE_Sell_OI 
                        : 0;
                      const peLongShort = timeData.PE_Sell_OI > 0 
                        ? timeData.PE_Buy_OI / timeData.PE_Sell_OI 
                        : 0;
                      
                      return (
                        <TableRow 
                          key={idx} 
                          className="hover:bg-muted/20 cursor-pointer"
                          onClick={() => setSelectedTimeIndex(data.length - 1 - idx)}
                        >
                          <TableCell className="text-center text-xs font-medium">{timeData.time}</TableCell>
                          <TableCell className="text-center text-xs">{timeData.underlyning.toFixed(2)}</TableCell>
                          <TableCell className="text-center text-xs border-l border-border text-emerald-400">
                            {formatNumber(timeData.CE_Buy_OI)}
                          </TableCell>
                          <TableCell className="text-center text-xs text-red-400">
                            {formatNumber(timeData.CE_Sell_OI)}
                          </TableCell>
                          <TableCell className="text-center text-xs border-l border-border text-emerald-400">
                            {formatNumber(timeData.PE_Buy_OI)}
                          </TableCell>
                          <TableCell className="text-center text-xs text-red-400">
                            {formatNumber(timeData.PE_Sell_OI)}
                          </TableCell>
                          <TableCell className="text-center border-l border-border">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getPCRColor(timeData.PCR_OI)}`}>
                              {formatRatio(timeData.PCR_OI)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          </>
        ) : (
          <Card className="bg-card/50 backdrop-blur border-border/30">
            <CardContent className="py-20">
              <div className="text-center text-muted-foreground">
                <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a symbol and expiry date to view PCR Long & Short data</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PCRLongShort;
