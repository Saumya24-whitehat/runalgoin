import { useState, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet";
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
import { 
  CalendarIcon, 
  Loader2, 
  Clock, 
  RefreshCw, 
  Timer, 
  Info,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react";
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

const AUTO_REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes

const STRIKE_OPTIONS = [3, 5, 7, 10, 15, 20];
const TIMEFRAME_OPTIONS = [
  { value: "1min", label: "1 Min" },
  { value: "3min", label: "3 Min" },
  { value: "5min", label: "5 Min" },
];

const OTR = () => {
  const { toast } = useToast();
  const [symbols, setSymbols] = useState<SymbolGroup>({ indexSymbols: [], stockSymbols: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState("");
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

  // Fetch OTR data
  const fetchData = useCallback(async (showLoader = true) => {
    if (!selectedSymbol || !selectedExpiry) return;
    
    if (showLoader) setLoadingData(true);
    
    try {
      const response = await fetchOTRData(
        selectedSymbol,
        selectedExpiry,
        selectedStrikes,
        selectedTimeframe,
        historicalDate ? format(historicalDate, "yyyy-MM-dd") : undefined
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
  }, [selectedSymbol, selectedExpiry, selectedStrikes, selectedTimeframe, historicalDate, toast]);

  // Auto-refresh interval
  useEffect(() => {
    if (selectedSymbol && selectedExpiry && otrData) {
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

  // Prepare chart data - combine today and previous day
  const getChartData = () => {
    if (!otrData) return [];

    const combinedData: any[] = [];
    
    // Add previous day data with date prefix
    if (otrData.previous_day && otrData.previous_day.length > 0) {
      otrData.previous_day.forEach((entry) => {
        const formattedTime = entry.Time.slice(0, 2) + ":" + entry.Time.slice(2);
        combinedData.push({
          time: `${otrData.yesterday_date?.slice(5)} ${formattedTime}`,
          displayTime: formattedTime,
          pcrOI: entry.Combined_PCR_OI,
          pcrCOI: entry.Combined_PCR_COI,
          spotPrice: entry.Spot_Price,
          isToday: false,
        });
      });
    }
    
    // Add today's data
    if (otrData.data && otrData.data.length > 0) {
      otrData.data.forEach((entry) => {
        const formattedTime = entry.Time.slice(0, 2) + ":" + entry.Time.slice(2);
        combinedData.push({
          time: `${otrData.date.slice(5)} ${formattedTime}`,
          displayTime: formattedTime,
          pcrOI: entry.Combined_PCR_OI,
          pcrCOI: entry.Combined_PCR_COI,
          spotPrice: entry.Spot_Price,
          isToday: true,
        });
      });
    }

    return combinedData;
  };

  const chartData = getChartData();
  const latestData = otrData?.data?.[otrData.data.length - 1];
  
  // Calculate trend from PCR
  const getTrend = () => {
    if (!latestData) return null;
    const pcrCOI = latestData.Combined_PCR_COI;
    if (pcrCOI > 1) return { text: "Bullish", color: "text-emerald-500", icon: TrendingUp };
    if (pcrCOI < 1) return { text: "Bearish", color: "text-red-500", icon: TrendingDown };
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
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.name === "Spot Price" 
                  ? entry.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 })
                  : entry.value?.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>OTR - OI Trend Ratio Analysis | Runalgo Options Trading</title>
        <meta name="description" content="Analyze OI Trend Ratio (OTR) with combined PCR OI and PCR COI charts for Nifty, Bank Nifty, and stocks. Track total open interest trends for smart options trading." />
        <meta name="keywords" content="OTR, OI Trend Ratio, PCR OI, PCR COI, options trading, Nifty 50, Bank Nifty, open interest analysis, intraday trading, stock market India" />
        <link rel="canonical" href="https://runalgo.lovable.app/otr" />
        <meta property="og:title" content="OTR - OI Trend Ratio Analysis | Runalgo" />
        <meta property="og:description" content="Track OI Trend Ratio with combined PCR charts for smart options trading decisions." />
        <meta property="og:type" content="website" />
      </Helmet>
      
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">
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
                          What is OTR (OI Trend Ratio)?
                        </DialogTitle>
                      </DialogHeader>
                      <DialogDescription className="text-foreground space-y-4 pt-4">
                        <p>
                          <strong>OTR (OI Trend Ratio)</strong> is a powerful tool that plots Total Open Interest data to help traders identify market direction. 
                          It shows what <strong>NOT to do</strong> and what <strong>TO do</strong> in the market.
                        </p>
                        
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">How OTR Works:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Select your symbol (e.g., Nifty 50)</li>
                            <li>Select ATM strike and number of strikes around it (e.g., 5 strikes above and below ATM)</li>
                            <li>The chart plots Combined PCR OI and PCR COI based on these strikes</li>
                            <li>Watch for upper band and lower band breaks</li>
                          </ul>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg">
                            <h4 className="font-semibold text-emerald-500 mb-2">🟢 Bullish Signal</h4>
                            <p className="text-sm">When PCR COI breaks above 1.0 (upper band), it indicates bullish opportunity. Look for long positions.</p>
                          </div>
                          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                            <h4 className="font-semibold text-red-500 mb-2">🔴 Bearish Signal</h4>
                            <p className="text-sm">When PCR COI breaks below 1.0 (lower band), it indicates bearish opportunity. Look for short positions.</p>
                          </div>
                        </div>
                        
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">Trading Strategy:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li><strong>Entry:</strong> When upper band breaks → Look for longs. When lower band breaks → Look for shorts.</li>
                            <li><strong>Exit:</strong> When price crosses the cloud/middle band, consider exiting the position.</li>
                            <li><strong>Stay:</strong> If no band break, stay in the current position until next signal.</li>
                            <li><strong>Tip:</strong> Lower timeframe + higher brick size = Less impact cost, more precise signals.</li>
                          </ul>
                        </div>
                        
                        <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                          <h4 className="font-semibold text-primary mb-2">💡 Pro Tips:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Use 9-minute or lower timeframe for better accuracy</li>
                            <li>Combine with price patterns (Turtle breakout, Anchor breakout) for confirmation</li>
                            <li>If no upper band break at open, avoid longs even if price goes up</li>
                            <li>The cloud/middle band can be used for exit signals</li>
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
                    <p className="text-sm font-semibold">{latestData.Spot_Price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">PCR OI</p>
                    <p className={`text-sm font-semibold ${latestData.Combined_PCR_OI >= 1 ? "text-emerald-500" : "text-red-500"}`}>
                      {latestData.Combined_PCR_OI.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">PCR COI</p>
                    <p className={`text-sm font-semibold ${latestData.Combined_PCR_COI >= 1 ? "text-emerald-500" : "text-red-500"}`}>
                      {latestData.Combined_PCR_COI.toFixed(2)}
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
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {lastRefresh ? format(lastRefresh, "HH:mm:ss") : "-"}
                      </p>
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
                  OTR - OI Trend Ratio
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        yAxisId="pcr"
                        orientation="left"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                        domain={['auto', 'auto']}
                        label={{ value: 'PCR', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <YAxis 
                        yAxisId="price"
                        orientation="right"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => value.toLocaleString('en-IN')}
                        label={{ value: 'Price', angle: 90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '10px' }}
                        formatter={(value) => <span className="text-xs">{value}</span>}
                      />
                      <ReferenceLine 
                        yAxisId="pcr"
                        y={1} 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeDasharray="5 5" 
                        label={{ value: 'PCR = 1', position: 'left', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      />
                      <Line
                        yAxisId="pcr"
                        type="monotone"
                        dataKey="pcrOI"
                        name="PCR OI"
                        stroke="hsl(142 71% 45%)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        yAxisId="pcr"
                        type="monotone"
                        dataKey="pcrCOI"
                        name="PCR COI"
                        stroke="hsl(280 71% 60%)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        yAxisId="price"
                        type="monotone"
                        dataKey="spotPrice"
                        name="Spot Price"
                        stroke="hsl(0 72% 51%)"
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
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
        </main>
      </div>
    </>
  );
};

export default OTR;
