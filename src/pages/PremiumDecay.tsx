import { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPremiumDecayStrikes, fetchPremiumDecayData, PremiumDecayDataEntry } from "@/services/premiumDecayApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, RefreshCw, Timer } from "lucide-react";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

const AUTO_REFRESH_INTERVAL = 3 * 60 * 1000;

const PremiumDecay = () => {
  const { toast } = useToast();
  const [symbols, setSymbols] = useState<SymbolGroup>({ indexSymbols: [], stockSymbols: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [availableStrikes, setAvailableStrikes] = useState<number[]>([]);
  const [atmStrike, setAtmStrike] = useState<number>(0);
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [premiumData, setPremiumData] = useState<PremiumDecayDataEntry[]>([]);

  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [loadingStrikes, setLoadingStrikes] = useState(false);
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

  // Fetch expiry dates when symbol and date change
  useEffect(() => {
    if (!selectedSymbol || !selectedDate) return;

    const fetchExpiry = async () => {
      setLoadingExpiry(true);
      setSelectedExpiry("");
      setAvailableStrikes([]);
      setSelectedStrike(null);
      try {
        const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
          body: {
            endpoint: "expiry",
            params: {
              symbol: selectedSymbol,
              date: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            },
          },
        });
        if (error) throw error;

        let dates: string[] = [];
        console.log(data);

        // Filter expiries that are on or after selected date
        const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
        dates = data.latestData[selectedDateStr]["expiries"];
        const filteredDates = dates.filter((d) => d >= selectedDateStr);

        setExpiryDates(filteredDates);
        if (filteredDates.length > 0) {
          setSelectedExpiry(filteredDates[0]);
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
  }, [selectedSymbol, selectedDate, toast]);

  // Fetch strikes when expiry changes
  useEffect(() => {
    if (!selectedSymbol || !selectedExpiry || !selectedDate) return;

    const fetchStrikes = async () => {
      setLoadingStrikes(true);
      setSelectedStrike(null);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const response = await fetchPremiumDecayStrikes(selectedSymbol, selectedExpiry, dateStr);
        setAvailableStrikes(response.strikes || []);
        setAtmStrike(response.MorningAtmStrike || 0);

        // Auto-select ATM strike
        if (response.MorningAtmStrike && response.strikes.includes(response.MorningAtmStrike)) {
          setSelectedStrike(response.MorningAtmStrike);
        } else if (response.strikes.length > 0) {
          setSelectedStrike(response.strikes[Math.floor(response.strikes.length / 2)]);
        }
        setTimeout(fetchData, 100);
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
  }, [selectedSymbol, selectedExpiry, selectedDate, toast]);

  // Fetch data
  const fetchData = useCallback(
    async (showLoader = true) => {
      if (!selectedSymbol || !selectedExpiry || !selectedStrike || !selectedDate) return;

      if (showLoader) setLoadingData(true);

      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const response = await fetchPremiumDecayData(selectedSymbol, selectedExpiry, selectedStrike, dateStr);

        if (response.data && response.data.length > 0) {
          setPremiumData(response.data);
          setLastRefresh(new Date());
          const next = new Date(Date.now() + AUTO_REFRESH_INTERVAL);
          setNextRefresh(next);
        }
      } catch (err) {
        console.error("Error fetching premium decay data:", err);
        if (showLoader) {
          toast({
            title: "Error",
            description: "Failed to load premium decay data",
            variant: "destructive",
          });
        }
      } finally {
        if (showLoader) setLoadingData(false);
      }
    },
    [selectedSymbol, selectedExpiry, selectedStrike, selectedDate, toast],
  );

  // Auto-refresh interval
  useEffect(() => {
    if (selectedSymbol && selectedExpiry && selectedStrike && selectedDate) {
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
  }, [selectedSymbol, selectedExpiry, selectedStrike, selectedDate, fetchData]);

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

  const formatNumber = (value: number): string => {
    if (value === undefined || value === null) return "-";
    return value.toFixed(2);
  };

  const formatTime = (time: string): string => {
    if (!time || time.length < 4) return time;
    return `${time.slice(0, 2)}:${time.slice(2)}`;
  };

  const getColorClass = (value: number): string => {
    if (value > 0) return "text-emerald-500";
    if (value < 0) return "text-red-500";
    return "";
  };

  // Chart data - Premium Decay
  const premiumChartData = premiumData.map((entry) => ({
    time: formatTime(entry.Time),
    ce_delta_ltp_chg: entry.ce_delta_ltp_chg,
    pe_delta_ltp_chg: entry.pe_delta_ltp_chg,
  }));

  // Chart data - Nifty Spot Price
  const spotChartData = premiumData.map((entry) => ({
    time: formatTime(entry.Time),
    spot: entry.Spot_Price,
  }));

  return (
    <div className="min-h-screen bg-background">
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

              {/* Date Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-secondary">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Select Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                  </PopoverContent>
                </Popover>
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

              {/* Strike Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Strike</label>
                <Select
                  value={selectedStrike?.toString() || ""}
                  onValueChange={(v) => setSelectedStrike(Number(v))}
                  disabled={loadingStrikes || availableStrikes.length === 0}
                >
                  <SelectTrigger className="w-full bg-secondary text-secondary-foreground">
                    <SelectValue placeholder={loadingStrikes ? "Loading..." : "Select strike"} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50 max-h-[300px]">
                    {availableStrikes.map((strike) => (
                      <SelectItem key={strike} value={strike.toString()}>
                        {strike} {strike === atmStrike && "(ATM)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* GO Button */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground invisible">Action</label>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGo}
                    disabled={loadingData || !selectedSymbol || !selectedExpiry || !selectedStrike || !selectedDate}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : "GO"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleManualRefresh}
                    disabled={loadingData || premiumData.length === 0}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Refresh Info */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground invisible">Info</label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {lastRefresh && (
                    <>
                      <Timer className="h-3 w-3" />
                      <span>Next: {countdown}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts - Side by Side */}
        {premiumData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Premium Decay Chart */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Premium Decay Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={premiumChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Legend />
                      <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                      <Line
                        type="monotone"
                        dataKey="ce_delta_ltp_chg"
                        name="CE Delta LTP Chg"
                        stroke="hsl(142, 76%, 36%)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="pe_delta_ltp_chg"
                        name="PE Delta LTP Chg"
                        stroke="hsl(0, 84%, 60%)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Nifty Spot Price Chart */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{selectedSymbol} Spot Price</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={spotChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        domain={["auto", "auto"]}
                        tickFormatter={(value) => value.toLocaleString()}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number) => [
                          value.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
                          "Spot Price",
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="spot"
                        name="Spot Price"
                        stroke="hsl(220, 70%, 50%)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Table */}
        {premiumData.length > 0 && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Premium Decay Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="text-center">Time</TableHead>
                      <TableHead className="text-center">Spot Price</TableHead>
                      <TableHead className="text-center">CE Delta</TableHead>
                      <TableHead className="text-center">PE Delta</TableHead>
                      <TableHead className="text-center">CE LTP</TableHead>
                      <TableHead className="text-center">PE LTP</TableHead>
                      <TableHead className="text-center">CE Delta LTP</TableHead>
                      <TableHead className="text-center">PE Delta LTP</TableHead>
                      <TableHead className="text-center">CE Delta LTP Chg</TableHead>
                      <TableHead className="text-center">PE Delta LTP Chg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {premiumData.map((entry, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-center font-mono">{formatTime(entry.Time)}</TableCell>
                        <TableCell className="text-center">{formatNumber(entry.Spot_Price)}</TableCell>
                        <TableCell className="text-center">{formatNumber(entry.ce_delta)}</TableCell>
                        <TableCell className="text-center">{formatNumber(entry.pe_delta)}</TableCell>
                        <TableCell className="text-center">{formatNumber(entry.ce_ltp)}</TableCell>
                        <TableCell className="text-center">{formatNumber(entry.pe_ltp)}</TableCell>
                        <TableCell className="text-center">{formatNumber(entry.ce_delta_ltp)}</TableCell>
                        <TableCell className="text-center">{formatNumber(entry.pe_delta_ltp)}</TableCell>
                        <TableCell className={`text-center font-medium ${getColorClass(entry.ce_delta_ltp_chg)}`}>
                          {formatNumber(entry.ce_delta_ltp_chg)}
                        </TableCell>
                        <TableCell className={`text-center font-medium ${getColorClass(entry.pe_delta_ltp_chg)}`}>
                          {formatNumber(entry.pe_delta_ltp_chg)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {premiumData.length === 0 && !loadingData && (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                Select a symbol, date, expiry, and strike, then click GO to load premium decay data.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PremiumDecay;
