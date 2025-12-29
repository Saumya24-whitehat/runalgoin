import { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { fetchMaxPainData, MaxPainTimeEntry, MaxPainStrikeData } from "@/services/maxPainApi";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, RefreshCw, Timer, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Cell,
} from "recharts";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

const AUTO_REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes

const MaxPain = () => {
  const { toast } = useToast();
  const [symbols, setSymbols] = useState<SymbolGroup>({ indexSymbols: [], stockSymbols: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [historicalDate, setHistoricalDate] = useState<Date | undefined>();

  const [maxPainData, setMaxPainData] = useState<MaxPainTimeEntry[]>([]);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(-1);
  const [latestEntry, setLatestEntry] = useState<MaxPainTimeEntry | null>(null);

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
  }, [selectedSymbol, toast]);

  // Fetch Max Pain data
  const fetchData = useCallback(async (showLoader = true) => {
    if (!selectedSymbol || !selectedExpiry) return;

    if (showLoader) setLoadingData(true);

    try {
      const response = await fetchMaxPainData(
        selectedSymbol,
        selectedExpiry,
        "1min",
        historicalDate ? format(historicalDate, "yyyy-MM-dd") : undefined
      );

      if (response.DataWhole && response.DataWhole.length > 0) {
        setMaxPainData(response.DataWhole);
        setSelectedTimeIndex(response.DataWhole.length - 1);
        setLatestEntry(response.DataWhole[response.DataWhole.length - 1]);
        setLastRefresh(new Date());
        setNextRefresh(new Date(Date.now() + AUTO_REFRESH_INTERVAL));
      }
    } catch (err) {
      console.error("Error fetching Max Pain data:", err);
      if (showLoader) {
        toast({
          title: "Error",
          description: "Failed to load Max Pain data",
          variant: "destructive",
        });
      }
    } finally {
      if (showLoader) setLoadingData(false);
    }
  }, [selectedSymbol, selectedExpiry, historicalDate, toast]);

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

  const handlePrevTime = () => {
    if (selectedTimeIndex > 0) {
      const newIndex = selectedTimeIndex - 1;
      setSelectedTimeIndex(newIndex);
      setLatestEntry(maxPainData[newIndex]);
    }
  };

  const handleNextTime = () => {
    if (selectedTimeIndex < maxPainData.length - 1) {
      const newIndex = selectedTimeIndex + 1;
      setSelectedTimeIndex(newIndex);
      setLatestEntry(maxPainData[newIndex]);
    }
  };

  const handleTimeSelect = (index: string) => {
    const newIndex = parseInt(index);
    setSelectedTimeIndex(newIndex);
    setLatestEntry(maxPainData[newIndex]);
  };

  // Prepare table and chart data
  const tableData = latestEntry
    ? Object.entries(latestEntry.data)
        .map(([strike, values]) => ({
          strike: parseInt(strike),
          CE: values.CE,
          PE: values.PE,
          Total: values.Total,
        }))
        .sort((a, b) => a.strike - b.strike)
    : [];

  const chartData = tableData.map((row) => ({
    strike: row.strike.toString(),
    CE: row.CE / 1e9, // Convert to billions for readability
    PE: row.PE / 1e9,
  }));

  // Price history chart data (Max Pain over time)
  const priceHistoryData = maxPainData.map((entry) => ({
    time: entry.Time,
    index: entry.index,
    maxPain: entry.maxPainStrike,
  }));

  const formatLargeNumber = (value: number) => {
    if (value >= 1e9) return (value / 1e9).toFixed(2) + "B";
    if (value >= 1e7) return (value / 1e7).toFixed(2) + "Cr";
    if (value >= 1e5) return (value / 1e5).toFixed(2) + "L";
    return value.toLocaleString("en-IN");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <main className="container py-4 space-y-4">
        {/* Controls Card */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end">
              {/* Symbol Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Symbol</label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol} disabled={loadingSymbols}>
                  <SelectTrigger className="w-full bg-background/50 h-8 text-[11px]">
                    <SelectValue placeholder="Select Symbol" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] bg-popover">
                    {symbols.indexSymbols.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] font-semibold text-primary bg-muted/50">INDEX</div>
                        {symbols.indexSymbols.map((sym) => (
                          <SelectItem key={sym} value={sym} className="text-[11px]">{sym}</SelectItem>
                        ))}
                      </>
                    )}
                    {symbols.stockSymbols.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] font-semibold text-primary bg-muted/50 mt-1">STOCKS</div>
                        {symbols.stockSymbols.map((sym) => (
                          <SelectItem key={sym} value={sym} className="text-[11px]">{sym}</SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Expiry</label>
                <Select
                  value={selectedExpiry}
                  onValueChange={setSelectedExpiry}
                  disabled={loadingExpiry || expiryDates.length === 0}
                >
                  <SelectTrigger className="w-full bg-secondary text-secondary-foreground h-8 text-[11px]">
                    <SelectValue placeholder={loadingExpiry ? "Loading..." : "Select expiry"} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {expiryDates.map((date) => (
                      <SelectItem key={date} value={date} className="text-[11px]">{date}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Historical Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Historical</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-secondary h-8 text-[11px]">
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {historicalDate ? format(historicalDate, "dd/MM/yyyy") : "dd/mm/yyyy"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={historicalDate}
                      onSelect={setHistoricalDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* GO Button */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground invisible">Action</label>
                <Button
                  onClick={handleGo}
                  disabled={loadingData || !selectedSymbol || !selectedExpiry}
                  className="w-full bg-primary hover:bg-primary/90 h-8 text-[11px]"
                >
                  {loadingData ? <Loader2 className="h-3 w-3 animate-spin" /> : "GO"}
                </Button>
              </div>
            </div>

            {/* Refresh Info Bar with Time Navigation */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handlePrevTime}
                  disabled={selectedTimeIndex <= 0 || maxPainData.length === 0}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>

                <Select
                  value={selectedTimeIndex.toString()}
                  onValueChange={handleTimeSelect}
                  disabled={maxPainData.length === 0}
                >
                  <SelectTrigger className="w-[80px] h-6 text-[10px]">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] bg-popover">
                    {maxPainData.map((entry, index) => (
                      <SelectItem key={index} value={index.toString()} className="text-[10px]">
                        {entry.Time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleNextTime}
                  disabled={selectedTimeIndex >= maxPainData.length - 1 || maxPainData.length === 0}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                {lastRefresh && (
                  <span>Updated: {format(lastRefresh, "HH:mm:ss")}</span>
                )}
                {countdown && (
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" /> {countdown}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleManualRefresh}
                  disabled={loadingData}
                >
                  <RefreshCw className={`h-3 w-3 ${loadingData ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Max Pain Info */}
        {latestEntry && (
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Symbol:</span>
              <span className="font-medium">{selectedSymbol}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium">{latestEntry.Time}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Max Pain:</span>
              <span className="font-bold text-destructive">{latestEntry.maxPainStrike}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Spot:</span>
              <span className="font-medium">{latestEntry.index.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">ATM:</span>
              <span className="font-medium">{latestEntry.atm}</span>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left: Table */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Strike-wise Pain Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-muted">Strike Price</TableHead>
                      <TableHead className="sticky top-0 bg-muted text-right">Call Option (CE)</TableHead>
                      <TableHead className="sticky top-0 bg-muted text-right">Put Option (PE)</TableHead>
                      <TableHead className="sticky top-0 bg-muted text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((row) => (
                      <TableRow
                        key={row.strike}
                        className={row.strike === latestEntry?.maxPainStrike ? "bg-destructive/10" : ""}
                      >
                        <TableCell className={`font-medium ${row.strike === latestEntry?.maxPainStrike ? "text-destructive font-bold" : ""}`}>
                          {row.strike}
                        </TableCell>
                        <TableCell className="text-right text-success">{formatLargeNumber(row.CE)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatLargeNumber(row.PE)}</TableCell>
                        <TableCell className="text-right font-medium">{formatLargeNumber(row.Total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Right: Charts */}
          <div className="space-y-4">
            {/* Bar Chart - Pain Distribution */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">Pain Distribution by Strike</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => `${v.toFixed(0)}B`}
                      />
                      <YAxis
                        dataKey="strike"
                        type="category"
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "10px",
                        }}
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(2)}B`,
                          name === "CE" ? "Call Option" : "Put Option",
                        ]}
                      />
                      <Bar dataKey="CE" fill="hsl(var(--primary))" name="CE" stackId="a" />
                      <Bar dataKey="PE" fill="hsl(var(--chart-4))" name="PE" stackId="a">
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              parseInt(entry.strike) === latestEntry?.maxPainStrike
                                ? "hsl(var(--destructive))"
                                : "hsl(var(--chart-4))"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Line Chart - Price History */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">Index Price vs Max Pain</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceHistoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={["dataMin - 50", "dataMax + 50"]}
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        width={55}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "10px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="index"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        name="Index"
                      />
                      {latestEntry && (
                        <ReferenceLine
                          y={latestEntry.maxPainStrike}
                          stroke="hsl(var(--destructive))"
                          strokeDasharray="5 5"
                          label={{
                            value: `Max Pain: ${latestEntry.maxPainStrike}`,
                            position: "right",
                            fontSize: 9,
                            fill: "hsl(var(--destructive))",
                          }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MaxPain;
