import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchOTRData, OTRDataEntry, OTRDataResponse } from "@/services/otrApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, Clock, RefreshCw, Timer, Info, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { format } from "date-fns";
import OTRChart from "@/components/otr/OTRChart";
import { PageInfoModal } from "@/components/PageInfoModal";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { MobileSymbolExpiryBar } from "@/components/mobile/MobileSymbolExpiryBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

const AUTO_REFRESH_INTERVAL = 60 * 1000; // 1 minute // 3 minutes

const STRIKE_OPTIONS = [3, 5, 7, 10, 15, 20];
const TIMEFRAME_OPTIONS = [
  { value: "1min", label: "1 Min" },
  { value: "3min", label: "3 Min" },
  { value: "5min", label: "5 Min" },
];

const OTR = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const urlSymbol = searchParams.get("symbol");
  const urlExpiry = searchParams.get("expiry");
  
  const [symbols, setSymbols] = useState<SymbolGroup>({ indexSymbols: [], stockSymbols: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState(urlSymbol || "Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState(urlExpiry || "");
  const [selectedStrikes, setSelectedStrikes] = useState(5);
  const [selectedTimeframe, setSelectedTimeframe] = useState("3min");
  const [historicalDate, setHistoricalDate] = useState<Date | undefined>();

  // Data state
  const [otrData, setOtrData] = useState<OTRDataResponse | null>(null);

  // Loading states
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
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

  // Auto-fetch when selections are ready
  useEffect(() => {
    if (selectedSymbol && selectedExpiry && !loadingExpiry) {
      fetchData();
    }
  }, [selectedSymbol, selectedExpiry, loadingExpiry]);

  // Fetch OTR data
  const fetchData = useCallback(
    async (showLoader = true) => {
      if (!selectedSymbol || !selectedExpiry) return;

      if (showLoader) setLoadingData(true);

      try {
        const response = await fetchOTRData(
          selectedSymbol,
          selectedExpiry,
          selectedStrikes,
          selectedTimeframe,
          historicalDate ? format(historicalDate, "yyyy-MM-dd") : undefined,
        );

        if (response) {
          setOtrData(response);
          setLastRefresh(new Date());

          const next = new Date(Date.now() + AUTO_REFRESH_INTERVAL);
          setNextRefresh(next);
        }
      } catch (err) {
        console.error("Error fetching OTR data:", err);
        if (showLoader) {
          toast({
            title: "Error",
            description: "Failed to load OTR data",
            variant: "destructive",
          });
        }
      } finally {
        if (showLoader) setLoadingData(false);
      }
    },
    [selectedSymbol, selectedExpiry, selectedStrikes, selectedTimeframe, historicalDate, toast],
  );

  // Auto-refresh interval
  useEffect(() => {
    if (selectedSymbol && selectedExpiry && otrData) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      console.log(AUTO_REFRESH_INTERVAL);
      refreshIntervalRef.current = setInterval(() => {
        fetchData(false);
      }, AUTO_REFRESH_INTERVAL);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [selectedSymbol, selectedExpiry, otrData, fetchData]);

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

  // Calculate EMA
  const calculateEMA = (data: number[], period: number): number[] => {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        ema.push(NaN);
      } else if (i === period - 1) {
        // First EMA is SMA
        const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
        ema.push(sum / period);
      } else {
        ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
      }
    }
    return ema;
  };

  // Prepare chart data - calculate TOI = total_put_oi - total_call_oi with EMAs
  const getChartData = () => {
    if (!otrData) return { chartData: [], crossoverPoints: [] };

    const rawData: {
      time: string;
      displayTime: number;
      toi: number;
      spotPrice: number;
      isToday: boolean;
      totalPutOI: number;
      totalCallOI: number;
    }[] = [];

    // Add previous day data with date prefix
    if (otrData.previous_day && otrData.previous_day.length > 0) {
      otrData.previous_day.forEach((entry) => {
        const formattedTime = entry.Time.slice(0, 2) + ":" + entry.Time.slice(2);
        const toi = entry.Total_Put_OI - entry.Total_Call_OI;
        rawData.push({
          time: `${otrData.yesterday_date} ${formattedTime}`,
          displayTime: new Date(`${otrData.yesterday_date} ${formattedTime}`).getTime() + 5.5 * 3600 * 1000,
          toi,
          spotPrice: entry.Spot_Price,
          isToday: false,
          totalPutOI: entry.Total_Put_OI,
          totalCallOI: entry.Total_Call_OI,
        });
      });
    }

    // Add today's data
    if (otrData.data && otrData.data.length > 0) {
      otrData.data.forEach((entry) => {
        const formattedTime = entry.Time.slice(0, 2) + ":" + entry.Time.slice(2);
        const toi = entry.Total_Put_OI - entry.Total_Call_OI;
        rawData.push({
          time: `${otrData.date} ${formattedTime}`,
          displayTime: new Date(`${otrData.date} ${formattedTime}`).getTime() + 5.5 * 3600 * 1000,
          toi,
          spotPrice: entry.Spot_Price,
          isToday: true,
          totalPutOI: entry.Total_Put_OI,
          totalCallOI: entry.Total_Call_OI,
        });
      });
    }

    // Calculate EMAs on TOI values
    const toiValues = rawData.map((d) => d.toi);
    const ema10 = calculateEMA(toiValues, 10);
    const ema30 = calculateEMA(toiValues, 30);

    // Detect EMA crossover points
    const crossoverPoints: { index: number; type: "bullish" | "bearish"; time: string; toi: number }[] = [];
    for (let i = 1; i < ema10.length; i++) {
      if (!isNaN(ema10[i]) && !isNaN(ema30[i]) && !isNaN(ema10[i - 1]) && !isNaN(ema30[i - 1])) {
        const prevDiff = ema10[i - 1] - ema30[i - 1];
        const currDiff = ema10[i] - ema30[i];

        // Bullish crossover: EMA10 crosses above EMA30
        if (prevDiff <= 0 && currDiff > 0) {
          crossoverPoints.push({ index: i, type: "bullish", time: rawData[i].time, toi: rawData[i].toi });
        }
        // Bearish crossover: EMA10 crosses below EMA30
        else if (prevDiff >= 0 && currDiff < 0) {
          crossoverPoints.push({ index: i, type: "bearish", time: rawData[i].time, toi: rawData[i].toi });
        }
      }
    }

    // Combine all data with trend
    const chartData = rawData.map((d, i) => {
      let trend: "bullish" | "bearish" | "neutral" = "neutral";
      if (!isNaN(ema10[i]) && !isNaN(ema30[i])) {
        if (ema10[i] > ema30[i] && d.toi > ema10[i]) {
          trend = "bullish";
        } else if (ema10[i] < ema30[i] && d.toi < ema10[i]) {
          trend = "bearish";
        }
      }
      return {
        ...d,
        ema10: isNaN(ema10[i]) ? null : ema10[i],
        ema30: isNaN(ema30[i]) ? null : ema30[i],
        trend,
      };
    });

    return { chartData, crossoverPoints };
  };

  const { chartData, crossoverPoints } = getChartData();
  const latestData = otrData?.data?.[otrData.data.length - 1];
  const latestChartPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  // Calculate trend from EMA crossover and TOI position
  const getTrend = () => {
    if (!latestChartPoint || latestChartPoint.ema10 === null || latestChartPoint.ema30 === null) return null;

    const toi = latestChartPoint.toi;
    const ema10 = latestChartPoint.ema10;
    const ema30 = latestChartPoint.ema30;

    // Bullish: EMA10 > EMA30 and TOI above EMA10
    // Bearish: EMA10 < EMA30 and TOI below EMA10
    if (ema10 > ema30 && toi > ema10) {
      return { text: "Bullish", color: "text-emerald-500", icon: TrendingUp };
    }
    if (ema10 < ema30 && toi < ema10) {
      return { text: "Bearish", color: "text-red-500", icon: TrendingDown };
    }
    return { text: "Neutral", color: "text-yellow-500", icon: Activity };
  };

  const trend = getTrend();

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.name === "Spot Price"
                  ? entry.value?.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                  : entry.value?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Format TOI value for display
  const formatTOI = (value: number) => {
    if (Math.abs(value) >= 10000000) {
      return (value / 10000000).toFixed(2) + " Cr";
    } else if (Math.abs(value) >= 100000) {
      return (value / 100000).toFixed(2) + " L";
    }
    return value.toLocaleString("en-IN");
  };

  return (
    <>
      <Helmet>
        <title>TOI - Total Open Interest Analysis with EMA Crossover | OptionWorld Options Trading</title>
        <meta
          name="description"
          content="Analyze Total Open Interest (TOI = Put OI - Call OI) with 10 & 30 period EMA crossovers for Nifty, Bank Nifty. Identify trend direction for smart options trading."
        />
        <meta
          name="keywords"
          content="TOI, Total Open Interest, EMA crossover, Put OI, Call OI, options trading, Nifty 50, Bank Nifty, intraday trading, stock market India, trend analysis"
        />
        <link rel="canonical" href="https://runalgo.lovable.app/otr" />
        <meta property="og:title" content="TOI - Total Open Interest with EMA Analysis | OptionWorld" />
        <meta
          property="og:description"
          content="Track TOI (Put OI - Call OI) with EMA 10 & 30 crossovers for trend identification in options trading."
        />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Sticky header */}
        <div className="sticky top-0 z-50">
          <TickerRibbon />
          <Navbar />
        </div>

        <ProFeatureGate featureName="OTR Analysis">
          <main className="container py-6 space-y-6">
            {/* Controls Card */}
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                {/* Mobile controls */}
                <MobileSymbolExpiryBar
                  indexSymbols={symbols.indexSymbols}
                  stockSymbols={symbols.stockSymbols}
                  selectedSymbol={selectedSymbol}
                  onSymbolChange={setSelectedSymbol}
                  loadingSymbols={loadingSymbols}
                  expiryDates={expiryDates}
                  selectedExpiry={selectedExpiry}
                  onExpiryChange={setSelectedExpiry}
                  loadingExpiry={loadingExpiry}
                  actions={
                    <Button
                      onClick={handleGo}
                      disabled={loadingData || !selectedSymbol || !selectedExpiry}
                      size="sm"
                      className="h-9 bg-primary hover:bg-primary/90"
                    >
                      {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
                    </Button>
                  }
                  filtersContent={
                    <>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground font-medium">Strikes</label>
                        <Select value={selectedStrikes.toString()} onValueChange={(v) => setSelectedStrikes(parseInt(v))}>
                          <SelectTrigger className="w-full bg-secondary h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover border-border z-50">
                            {STRIKE_OPTIONS.map((c) => <SelectItem key={c} value={c.toString()}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground font-medium">Timeframe</label>
                        <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                          <SelectTrigger className="w-full bg-secondary h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover border-border z-50">
                            {TIMEFRAME_OPTIONS.map((tf) => <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground font-medium">Historical Date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal bg-secondary h-9 text-xs">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {historicalDate ? format(historicalDate, "dd/MM/yyyy") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-50" align="start">
                            <Calendar mode="single" selected={historicalDate} onSelect={setHistoricalDate} defaultMonth={historicalDate} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  }
                />
                <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">

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
                            <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50 mt-1">
                              STOCKS
                            </div>
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

                  {/* Strikes Count */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Strikes</label>
                    <Select value={selectedStrikes.toString()} onValueChange={(v) => setSelectedStrikes(parseInt(v))}>
                      <SelectTrigger className="w-full bg-secondary text-secondary-foreground">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {STRIKE_OPTIONS.map((count) => (
                          <SelectItem key={count} value={count.toString()}>
                            {count}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Timeframe */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Timeframe</label>
                    <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                      <SelectTrigger className="w-full bg-secondary text-secondary-foreground">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {TIMEFRAME_OPTIONS.map((tf) => (
                          <SelectItem key={tf.value} value={tf.value}>
                            {tf.label}
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
                    <Button
                      onClick={handleGo}
                      disabled={loadingData || !selectedSymbol || !selectedExpiry}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      {loadingData ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Go"
                      )}
                    </Button>
                  </div>

                  {/* Info Icon */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground invisible">Info</label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="w-10 h-10">
                          <Info className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-xl flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            What is TOI (Total Open Interest)?
                          </DialogTitle>
                        </DialogHeader>
                        <DialogDescription className="text-foreground space-y-4 pt-4">
                          <p>
                            <strong>TOI (Total Open Interest)</strong> is calculated as{" "}
                            <strong>Put OI - Call OI</strong>. This chart plots TOI along with 10-period EMA and
                            30-period EMA to help identify trend direction through EMA crossovers.
                          </p>

                          <div className="bg-muted/50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">How TOI Works:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>Select your symbol (e.g., Nifty 50)</li>
                              <li>For index, 5 strikes ATM± is recommended</li>
                              <li>TOI = Total Put OI - Total Call OI</li>
                              <li>EMA 10 (green) and EMA 30 (red) are plotted on TOI values</li>
                              <li>Watch for EMA crossovers after 10:00 AM for trend signals</li>
                            </ul>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-emerald-500 mb-2">🟢 Bullish Signal</h4>
                              <p className="text-sm">
                                When EMA 10 crosses above EMA 30 (positive crossover) and TOI is above EMA 10, it
                                indicates a bullish trend. Look for long positions.
                              </p>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-red-500 mb-2">🔴 Bearish Signal</h4>
                              <p className="text-sm">
                                When EMA 10 crosses below EMA 30 (negative crossover) and TOI is below EMA 10, it
                                indicates a bearish trend. Look for short positions.
                              </p>
                            </div>
                          </div>

                          <div className="bg-muted/50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">Trading Strategy:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>
                                <strong>Wait for 10 AM:</strong> Let the market settle first. EMA crossovers after 10 AM
                                are more reliable.
                              </li>
                              <li>
                                <strong>Entry:</strong> When EMA 10 crosses above EMA 30 + TOI above EMA 10 → Go long.
                                When EMA 10 crosses below EMA 30 + TOI below EMA 10 → Go short.
                              </li>
                              <li>
                                <strong>Exit:</strong> When the crossover reverses or TOI moves back to the opposite
                                side of EMA 10.
                              </li>
                              <li>
                                <strong>Avoid:</strong> Trading during choppy EMA crossovers (multiple quick crosses).
                              </li>
                            </ul>
                          </div>

                          <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                            <h4 className="font-semibold text-blue-500 mb-2">📊 Chart Features:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>
                                <strong>EMA Crossover Markers:</strong> Green ▲ appears on chart when EMA 10 crosses
                                above EMA 30 (bullish). Red ▼ appears when EMA 10 crosses below EMA 30 (bearish).
                              </li>
                              <li>
                                <strong>Trend Column:</strong> Shows real-time trend status (Bullish/Bearish/Neutral)
                                based on EMA position and TOI value.
                              </li>
                              <li>
                                <strong>Zero Line:</strong> Horizontal reference at 0 to quickly see if TOI is positive
                                (Put heavy) or negative (Call heavy).
                              </li>
                            </ul>
                          </div>

                          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
                            <h4 className="font-semibold text-amber-500 mb-2">📋 Data Table:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>
                                <strong>Put OI / Call OI:</strong> Shows total Put and Call open interest for selected
                                strikes.
                              </li>
                              <li>
                                <strong>TOI:</strong> Calculated as Put OI - Call OI. Positive = Put heavy, Negative =
                                Call heavy.
                              </li>
                              <li>
                                <strong>EMA 10 / 30:</strong> Exponential moving averages on TOI values.
                              </li>
                              <li>
                                <strong>Trend:</strong> Bullish when EMA10 {">"} EMA30 and TOI {">"} EMA10. Bearish when
                                EMA10 {"<"} EMA30 and TOI {"<"} EMA10.
                              </li>
                            </ul>
                          </div>

                          <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                            <h4 className="font-semibold text-primary mb-2">💡 Pro Tips:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>Use 3-minute timeframe for intraday trading</li>
                              <li>Look for strong EMA separation after crossover for trend confirmation</li>
                              <li>Combine with price action and support/resistance levels</li>
                              <li>Previous day's TOI pattern can give context for current day's direction</li>
                              <li>Check data table for exact values when crossover markers appear</li>
                            </ul>
                          </div>
                        </DialogDescription>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Info Bar */}
            {otrData && latestData && (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Symbol</p>
                      <p className="text-sm font-semibold text-primary">{otrData.symbol}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Spot Price</p>
                      <p className="text-sm font-semibold">
                        {latestData.Spot_Price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">TOI (Put - Call)</p>
                      <p
                        className={`text-sm font-semibold ${latestChartPoint && latestChartPoint.toi >= 0 ? "text-emerald-500" : "text-red-500"}`}
                      >
                        {latestChartPoint ? formatTOI(latestChartPoint.toi) : "-"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">EMA 10 / 30</p>
                      <p className="text-sm font-semibold">
                        {latestChartPoint?.ema10 !== null ? formatTOI(latestChartPoint?.ema10 || 0) : "-"} /{" "}
                        {latestChartPoint?.ema30 !== null ? formatTOI(latestChartPoint?.ema30 || 0) : "-"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Trend</p>
                      <div className="flex items-center justify-center gap-1">
                        {trend && <trend.icon className={`h-4 w-4 ${trend.color}`} />}
                        <p className={`text-sm font-semibold ${trend?.color}`}>{trend?.text}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <LastRefreshBadge lastRefresh={lastRefresh} isFetching={loadingData} />
                        <PageInfoModal
                          title="Options Trading Range (OTR)"
                          subtitle="Expected range + EMA momentum signals"
                          overview="Projects an expected intraday / expiry trading range from Call and Put OI concentrations, overlaid with EMA 10/30 crossovers as objective Buy/Sell triggers."
                          formula={{
                            label: "Range Construction",
                            expression: "Upper = Strike(max Call OI)   |   Lower = Strike(max Put OI)",
                            note: "OI walls act as psychological ceilings/floors because option writers defend them",
                          }}
                          legend={[
                            { label: "Upper Range", text: "Highest Call OI — expected ceiling", color: "#ef4444" },
                            { label: "Lower Range", text: "Highest Put OI — expected floor", color: "#10b981" },
                            { label: "Buy Marker", text: "EMA 10 crosses above EMA 30 — bullish trigger", color: "#22c55e" },
                            { label: "Sell Marker", text: "EMA 10 crosses below EMA 30 — bearish trigger", color: "#dc2626" },
                          ]}
                          sections={[
                            {
                              heading: "Two Ways to Trade",
                              body: "Inside the range: fade the edges (mean reversion). Outside the range: ride the breakout toward the next OI wall.",
                            },
                          ]}
                          howToUse="Signals near range edges have the best risk-reward. A decisive close outside the range invalidates mean-reversion and signals a breakout."
                          tips={[
                            "Range redraws intraday as OI shifts — always use the latest snapshot.",
                            "Ignore crossovers deep inside the range without volume confirmation.",
                            "OI walls weaken as expiry approaches — treat them as advisory in the final session.",
                          ]}
                        />
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
                      {nextRefresh && (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <Timer className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{countdown}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chart */}
            {loadingData && !otrData ? (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="flex items-center justify-center h-[500px]">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading OTR data...</p>
                  </div>
                </CardContent>
              </Card>
            ) : otrData && chartData.length > 0 ? (
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    TOI Chart (Put OI - Call OI) with EMA 10 & 30
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <OTRChart data={chartData} crossoverPoints={crossoverPoints} />
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <Activity className="h-12 w-12 mb-4 opacity-50" />
                  <p>Select symbol, expiry and click Go to load OTR data</p>
                </CardContent>
              </Card>
            )}

            {/* TOI Data Table */}
            {otrData && chartData.length > 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    TOI Data Table
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow className="border-border/50">
                          <TableHead className="text-xs font-semibold text-center">Time</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Spot Price</TableHead>
                          <TableHead className="text-xs font-semibold text-center text-emerald-500">Put OI</TableHead>
                          <TableHead className="text-xs font-semibold text-center text-red-500">Call OI</TableHead>
                          <TableHead className="text-xs font-semibold text-center">TOI (Put-Call)</TableHead>
                          <TableHead className="text-xs font-semibold text-center text-emerald-500">EMA 10</TableHead>
                          <TableHead className="text-xs font-semibold text-center text-red-500">EMA 30</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Trend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...chartData].reverse().map((row, idx) => (
                          <TableRow key={idx} className={`border-border/30 ${row.isToday ? "" : "bg-muted/20"}`}>
                            <TableCell className="text-xs text-center font-medium">{row.time}</TableCell>
                            <TableCell className="text-xs text-center">
                              {row.spotPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-xs text-center text-emerald-500">
                              {formatTOI(row.totalPutOI)}
                            </TableCell>
                            <TableCell className="text-xs text-center text-red-500">
                              {formatTOI(row.totalCallOI)}
                            </TableCell>
                            <TableCell
                              className={`text-xs text-center font-semibold ${row.toi >= 0 ? "text-emerald-500" : "text-red-500"}`}
                            >
                              {formatTOI(row.toi)}
                            </TableCell>
                            <TableCell className="text-xs text-center text-emerald-500">
                              {row.ema10 !== null ? formatTOI(row.ema10) : "-"}
                            </TableCell>
                            <TableCell className="text-xs text-center text-red-500">
                              {row.ema30 !== null ? formatTOI(row.ema30) : "-"}
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              {row.trend === "bullish" && (
                                <span className="inline-flex items-center gap-1 text-emerald-500">
                                  <TrendingUp className="h-3 w-3" /> Bullish
                                </span>
                              )}
                              {row.trend === "bearish" && (
                                <span className="inline-flex items-center gap-1 text-red-500">
                                  <TrendingDown className="h-3 w-3" /> Bearish
                                </span>
                              )}
                              {row.trend === "neutral" && <span className="text-muted-foreground">Neutral</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </ProFeatureGate>
        <Footer />
      </div>
    </>
  );
};

export default OTR;
