import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchTOIStrikes, fetchTOIData, TOIDataEntry } from "@/services/toiApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarIcon,
  Loader2,
  Clock,
  RefreshCw,
  Timer,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
} from "lucide-react";
import { AdminPaletteButton } from "@/components/admin/AdminPaletteButton";
import { format } from "date-fns";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

const AUTO_REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes

const TOI = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const urlSymbol = searchParams.get("symbol");
  const urlExpiry = searchParams.get("expiry");
  
  const [symbols, setSymbols] = useState<SymbolGroup>({ indexSymbols: [], stockSymbols: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState(urlSymbol || "Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState(urlExpiry || "");
  const [historicalDate, setHistoricalDate] = useState<Date | undefined>();

  // Strikes state
  const [availableStrikes, setAvailableStrikes] = useState<number[]>([]);
  const [atmStrike, setAtmStrike] = useState<number>(0);
  const [selectedStrikes, setSelectedStrikes] = useState<number[]>([]);
  const [strikesDropdownOpen, setStrikesDropdownOpen] = useState(false);

  // Data state
  const [toiData, setToiData] = useState<TOIDataEntry[]>([]);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(-1);

  // Loading states
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [loadingStrikes, setLoadingStrikes] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    const fetchExpiry = async () => {
      setLoadingExpiry(true);
      setSelectedExpiry("");
      setAvailableStrikes([]);
      setSelectedStrikes([]);
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

  // Fetch strikes when expiry changes
  useEffect(() => {
    if (!selectedSymbol || !selectedExpiry) return;

    const fetchStrikes = async () => {
      setLoadingStrikes(true);
      setSelectedStrikes([]);
      try {
        const response = await fetchTOIStrikes(selectedSymbol, selectedExpiry);
        setAvailableStrikes(response.strikes || []);
        setAtmStrike(response.atm || 0);

        // Auto-select ATM strike if available
        if (response.atm && response.strikes.includes(response.atm)) {
          setSelectedStrikes([response.atm]);
        }
      } catch (err) {
        console.error("Error fetching strikes:", err);
        toast({
          title: "Error",
          description: "Failed to load strikes",
          variant: "destructive",
        });
      } finally {
        setLoadingStrikes(false);
      }
    };
    fetchStrikes();
  }, [selectedSymbol, selectedExpiry, toast]);

  // Auto-fetch when all selections are ready
  useEffect(() => {
    if (selectedSymbol && selectedExpiry && selectedStrikes.length > 0 && !loadingStrikes) {
      fetchData();
    }
  }, [selectedSymbol, selectedExpiry, selectedStrikes, loadingStrikes]);

  // Fetch TOI data
  const fetchData = useCallback(
    async (showLoader = true) => {
      if (!selectedSymbol || !selectedExpiry || selectedStrikes.length === 0) return;

      if (showLoader) setLoadingData(true);

      try {
        const response = await fetchTOIData(
          selectedSymbol,
          selectedExpiry,
          selectedStrikes,
          historicalDate ? format(historicalDate, "yyyy-MM-dd") : undefined,
        );

        if (response.data && response.data.length > 0) {
          setToiData(response.data);
          setSelectedTimeIndex(response.data.length - 1);
          setLastRefresh(new Date());

          const next = new Date(Date.now() + AUTO_REFRESH_INTERVAL);
          setNextRefresh(next);
        }
      } catch (err) {
        console.error("Error fetching TOI data:", err);
        if (showLoader) {
          toast({
            title: "Error",
            description: "Failed to load TOI data",
            variant: "destructive",
          });
        }
      } finally {
        if (showLoader) setLoadingData(false);
      }
    },
    [selectedSymbol, selectedExpiry, selectedStrikes, historicalDate, toast],
  );

  // Auto-refresh interval
  useEffect(() => {
    if (selectedSymbol && selectedExpiry && selectedStrikes.length > 0) {
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
  }, [selectedSymbol, selectedExpiry, selectedStrikes, fetchData]);

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
          setCountdown(`${minutes}:${seconds.toString().padStart(2, "0")}`);
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

  // Strike selection handlers
  const toggleStrike = (strike: number) => {
    setSelectedStrikes((prev) =>
      prev.includes(strike) ? prev.filter((s) => s !== strike) : [...prev, strike].sort((a, b) => a - b),
    );
  };

  const selectAllStrikes = () => {
    setSelectedStrikes([...availableStrikes]);
  };

  const clearAllStrikes = () => {
    setSelectedStrikes([]);
  };

  // Time navigation handlers
  const handlePrevTime = () => {
    if (selectedTimeIndex > 0) {
      setSelectedTimeIndex(selectedTimeIndex - 1);
    }
  };

  const handleNextTime = () => {
    if (selectedTimeIndex < toiData.length - 1) {
      setSelectedTimeIndex(selectedTimeIndex + 1);
    }
  };

  const handleTimeSelect = (index: string) => {
    setSelectedTimeIndex(parseInt(index));
  };

  // Format helpers
  const formatNumber = (value: number | string | undefined): string => {
    if (value === undefined || value === "undefined") return "-";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "-";

    if (Math.abs(num) >= 10000000) {
      return (num / 10000000).toFixed(2) + " Cr";
    } else if (Math.abs(num) >= 100000) {
      return (num / 100000).toFixed(2) + " L";
    } else if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(2) + " K";
    }
    return num.toLocaleString("en-IN");
  };

  const formatPCR = (value: number | string | undefined): string => {
    if (value === undefined || value === "undefined") return "-";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "-";
    return num.toFixed(2);
  };

  const getColorClass = (value: number): string => {
    if (value > 0) return "text-emerald-500";
    if (value < 0) return "text-red-500";
    return "";
  };

  const currentTimeData = toiData[selectedTimeIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <main className="container py-6 space-y-6">
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

              {/* Strikes Multi-Select Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Strikes</label>
                <Popover open={strikesDropdownOpen} onOpenChange={setStrikesDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-secondary text-left font-normal"
                      disabled={loadingStrikes || availableStrikes.length === 0}
                    >
                      <span className="truncate">
                        {loadingStrikes
                          ? "Loading..."
                          : selectedStrikes.length === 0
                            ? "Select strikes"
                            : `${selectedStrikes.length} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0 z-50 bg-popover" align="start">
                    <div className="p-2 border-b border-border flex gap-2">
                      <Button size="sm" variant="outline" onClick={selectAllStrikes} className="flex-1 text-xs">
                        Select All
                      </Button>
                      <Button size="sm" variant="outline" onClick={clearAllStrikes} className="flex-1 text-xs">
                        Clear All
                      </Button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2">
                      {availableStrikes.map((strike) => (
                        <div
                          key={strike}
                          className={`flex items-center space-x-2 p-2 rounded-md hover:bg-muted cursor-pointer ${
                            strike === atmStrike ? "bg-primary/10 border border-primary/30" : ""
                          }`}
                          onClick={() => toggleStrike(strike)}
                        >
                          <Checkbox
                            id={`strike-${strike}`}
                            checked={selectedStrikes.includes(strike)}
                            onCheckedChange={() => toggleStrike(strike)}
                          />
                          <label
                            htmlFor={`strike-${strike}`}
                            className="text-sm font-medium leading-none cursor-pointer flex-1"
                          >
                            {strike}
                            {strike === atmStrike && <span className="ml-2 text-xs text-primary">(ATM)</span>}
                          </label>
                          {selectedStrikes.includes(strike) && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Historical Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Historical Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-secondary">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {historicalDate ? format(historicalDate, "dd/MM/yyyy") : "dd/mm/yyyy"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar mode="single" selected={historicalDate} onSelect={setHistoricalDate} defaultMonth={historicalDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              {/* GO Button */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground invisible">Action</label>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGo}
                    disabled={loadingData || !selectedSymbol || !selectedExpiry || selectedStrikes.length === 0}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : "GO"}
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
                  disabled={selectedTimeIndex <= 0 || toiData.length === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Select
                  value={selectedTimeIndex >= 0 ? selectedTimeIndex.toString() : ""}
                  onValueChange={handleTimeSelect}
                  disabled={toiData.length === 0}
                >
                  <SelectTrigger className="h-7 w-[100px] text-xs bg-secondary">
                    <SelectValue placeholder="Time">{currentTimeData ? currentTimeData.Time : "Time"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-[200px]">
                    {toiData.map((entry, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
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
                  disabled={selectedTimeIndex >= toiData.length - 1 || toiData.length === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Refresh info */}
              <div className="flex items-center gap-4">
                {currentTimeData && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Data Time: {currentTimeData.Time}</span>
                  </div>
                )}

                <LastRefreshBadge lastRefresh={lastRefresh} isFetching={loadingData} />

                {countdown && (
                  <div className="flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5" />
                    <span>Next Refresh: {countdown}</span>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={loadingData || selectedStrikes.length === 0}
                  className="h-7 px-2"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : toiData.length > 0 ? (
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Open Interest Data</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[450px]">
                <Table>
                  <TableHeader className="sticky top-0">
                    <TableRow className="bg-muted">
                      <TableHead rowSpan={2} className="text-center border-r border-border/50 align-middle">
                        Time
                      </TableHead>
                      <TableHead rowSpan={2} className="text-center border-r border-border/50 align-middle">
                        Spot Price
                      </TableHead>
                      <TableHead
                        colSpan={4}
                        className="text-center text-call border-r border-border/50 bg-emerald-500/10"
                      >
                        CALL
                      </TableHead>
                      <TableHead colSpan={4} className="text-center text-put border-r border-border/50 bg-red-500/10">
                        PUT
                      </TableHead>
                      <TableHead colSpan={2} className="text-center border-r border-border/50">
                        PCR
                      </TableHead>
                      <TableHead colSpan={2} className="text-center border-r border-border/50">
                        DIFF
                      </TableHead>
                      <TableHead rowSpan={2} className="text-center align-middle">
                        TREND
                      </TableHead>
                    </TableRow>
                    <TableRow className="bg-muted">
                      <TableHead className="text-center text-call">COI</TableHead>
                      <TableHead className="text-center text-call">OI</TableHead>
                      <TableHead className="text-center text-call">VOL/COI</TableHead>
                      <TableHead className="text-center text-call border-r border-border/50">VOLUME</TableHead>
                      <TableHead className="text-center text-put">COI</TableHead>
                      <TableHead className="text-center text-put">OI</TableHead>
                      <TableHead className="text-center text-put">VOL/COI</TableHead>
                      <TableHead className="text-center text-put border-r border-border/50">VOLUME</TableHead>
                      <TableHead className="text-center">COI</TableHead>
                      <TableHead className="text-center border-r border-border/50">OI</TableHead>
                      <TableHead className="text-center">CE OI</TableHead>
                      <TableHead className="text-center border-r border-border/50">PE OI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...toiData].reverse().map((entry, idx) => (
                      <TableRow
                        key={idx}
                        className={`hover:bg-muted/30 ${toiData.length - 1 - idx === selectedTimeIndex ? "bg-primary/10" : ""}`}
                      >
                        <TableCell className="text-center font-medium border-r border-border/50">
                          {entry.Time}
                        </TableCell>
                        <TableCell className="text-center border-r border-border/50">
                          {entry.Spot_Price?.toFixed(2)}
                        </TableCell>

                        {/* CALL */}
                        <TableCell className={`text-center text-call ${getColorClass(entry.CE_COI)}`}>
                          {formatNumber(entry.CE_COI)}
                        </TableCell>
                        <TableCell className="text-center text-call">{formatNumber(entry.CE_OI)}</TableCell>
                        <TableCell className="text-center text-call">{formatPCR(entry["CE_COI/CE_VOLUME"])}</TableCell>
                        <TableCell className="text-center text-call border-r border-border/50">
                          {formatNumber(entry.CE_VOLUME)}
                        </TableCell>

                        {/* PUT */}
                        <TableCell className={`text-center text-put ${getColorClass(entry.PE_COI)}`}>
                          {formatNumber(entry.PE_COI)}
                        </TableCell>
                        <TableCell className="text-center text-put">{formatNumber(entry.PE_OI)}</TableCell>
                        <TableCell className="text-center text-put">{formatPCR(entry["PE_COI/PE_VOLUME"])}</TableCell>
                        <TableCell className="text-center text-put border-r border-border/50">
                          {formatNumber(entry.PE_VOLUME)}
                        </TableCell>

                        {/* PCR */}
                        <TableCell className="text-center">{formatPCR(entry.PCR_COI)}</TableCell>
                        <TableCell className="text-center border-r border-border/50">
                          {formatPCR(entry.PCR_OI)}
                        </TableCell>

                        {/* DIFF */}
                        <TableCell className={`text-center ${getColorClass(entry.CE_OI_CHANGE)}`}>
                          {formatNumber(entry.CE_OI_CHANGE)}
                        </TableCell>
                        <TableCell
                          className={`text-center border-r border-border/50 ${getColorClass(entry.PE_OI_CHANGE)}`}
                        >
                          {formatNumber(entry.PE_OI_CHANGE)}
                        </TableCell>

                        {/* TREND */}
                        <TableCell className={`text-center font-medium ${getColorClass(entry.TREND)}`}>
                          {formatNumber(entry.TREND)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="py-20 text-center">
              <p className="text-muted-foreground">Select symbol, expiry, and strikes, then click GO to load data</p>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TOI;
