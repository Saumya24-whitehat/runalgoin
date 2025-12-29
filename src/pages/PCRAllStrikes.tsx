import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Info,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  CalendarIcon,
  Loader2,
  Timer,
  ChevronLeft,
  ChevronRight,
  Clock,
  Volume2,
  VolumeX,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { fetchPCRAllStrikesData, PCRAllStrikesTimeData } from "@/services/pcrAllStrikesApi";
import { fetchKundaliData, KundaliTimeData } from "@/services/kundaliApi";
import { CenterStrikePicker } from "@/components/pcr/CenterStrikePicker";
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
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Cell,
} from "recharts";

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
  const [strikeCount, setStrikeCount] = useState(7);
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
  const [availableStrikes, setAvailableStrikes] = useState<string[]>([]);
  const [selectedCustomStrike, setSelectedCustomStrike] = useState<string>("");
  const [useCustomStrike, setUseCustomStrike] = useState(false);
  const [loadingStrikes, setLoadingStrikes] = useState(false);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(-1);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [lastAlertTime, setLastAlertTime] = useState<string>("");

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevATMPCRRef = useRef<number | null>(null);

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

    // Fixed window: always fetch/display +/- 7 strikes from the 09:15 ATM reference
    setStrikeCount(7);
    setSelectedCustomStrike("");
    setUseCustomStrike(false);
    setAvailableStrikes([]);

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

  // Fetch available strikes from TOI API when expiry changes
  useEffect(() => {
    if (!selectedSymbol || !selectedExpiry) return;

    const fetchAvailableStrikes = async () => {
      setLoadingStrikes(true);
      try {
        const { data, error } = await supabase.functions.invoke("toi-data", {
          body: { endpoint: "strikes", symbol: selectedSymbol, expiry: selectedExpiry },
        });
        if (error) throw error;

        let strikesList: string[] = [];
        if (data?.strikes && Array.isArray(data.strikes)) {
          strikesList = data.strikes.map((s: number | string) => String(s)).sort((a: string, b: string) => Number(a) - Number(b));
        } else if (Array.isArray(data)) {
          strikesList = data.map((s: number | string) => String(s)).sort((a: string, b: string) => Number(a) - Number(b));
        }

        setAvailableStrikes(strikesList);
      } catch (err) {
        console.error("Error fetching available strikes:", err);
      } finally {
        setLoadingStrikes(false);
      }
    };
    fetchAvailableStrikes();
  }, [selectedSymbol, selectedExpiry]);

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
  const fetchData = useCallback(
    async (showLoader = true) => {
      if (!selectedSymbol || !selectedExpiry) return;

      if (showLoader) setLoadingData(true);

      try {
        const strikeCountForApi = strikeCount * 2 + 1;

        const [pcrResponse, kundaliResponse] = await Promise.all([
          fetchPCRAllStrikesData(
            selectedSymbol,
            selectedExpiry,
            strikeCountForApi,
            historicalDate ? format(historicalDate, "yyyy-MM-dd") : undefined,
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
    },
    [selectedSymbol, selectedExpiry, strikeCount, historicalDate, toast],
  );

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
    if (pcr <= 0.8) return "bg-red-500/20 text-red-400";
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

  // Play alert sound
  const playAlertSound = useCallback(
    (type: "bullish" | "bearish") => {
      if (!alertEnabled) return;

      // Create audio context for beep sound
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Different frequencies for bullish/bearish
        oscillator.frequency.value = type === "bullish" ? 800 : 400;
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        // Play second beep for emphasis
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.value = type === "bullish" ? 1000 : 300;
          osc2.type = "sine";
          gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.3);
        }, 200);
      } catch (e) {
        console.error("Error playing alert sound:", e);
      }
    },
    [alertEnabled],
  );

  // Check for PCR alert conditions
  useEffect(() => {
    if (!alertEnabled || pcrData.length < 2) return;

    const latest = pcrData[pcrData.length - 1];
    const atmStrike = fixedATMStrike || getATMStrike(latest.Spot_Price);
    const currentATMPCR = latest.PCR_COI[atmStrike];

    if (prevATMPCRRef.current !== null && currentATMPCR !== prevATMPCRRef.current) {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const isMarketHours =
        (hours === 9 && minutes >= 15) || (hours > 9 && hours < 15) || (hours === 15 && minutes <= 30);

      if (isMarketHours) {
        // Check if crossed above 1.25 (bullish)
        if (currentATMPCR >= 1.25 && prevATMPCRRef.current < 1.25) {
          playAlertSound("bullish");
          setLastAlertTime(now.toLocaleTimeString());
          toast({
            title: "🟢 Bullish PCR Alert",
            description: `ATM Strike ${atmStrike} PCR crossed above 1.25 (${currentATMPCR.toFixed(2)})`,
          });
        }
        // Check if crossed below 0.80 (bearish)
        else if (currentATMPCR <= 0.8 && prevATMPCRRef.current > 0.8) {
          playAlertSound("bearish");
          setLastAlertTime(now.toLocaleTimeString());
          toast({
            title: "🔴 Bearish PCR Alert",
            description: `ATM Strike ${atmStrike} PCR crossed below 0.80 (${currentATMPCR.toFixed(2)})`,
          });
        }
      }
    }

    prevATMPCRRef.current = currentATMPCR;
  }, [pcrData, alertEnabled, playAlertSound, toast]);

  const parseTimeToMinutes = (t: string) => {
    const parts = String(t ?? "").split(":");
    const h = Number(parts[0] ?? 0);
    const m = Number(parts[1] ?? 0);
    return h * 60 + m;
  };

  // Strike window anchor: ATM should stay fixed for the whole day based on the 09:15 spot price
  const fixedATMStrike = useMemo(() => {
    if (pcrData.length === 0 || strikes.length === 0) return "";

    const targetMinutes = 9 * 60 + 15;
    let bestEntry: PCRAllStrikesTimeData | null = null;
    let bestMinutes = Number.POSITIVE_INFINITY;

    for (const entry of pcrData) {
      const mins = parseTimeToMinutes(entry.Time);
      if (mins >= targetMinutes && mins < bestMinutes) {
        bestEntry = entry;
        bestMinutes = mins;
      }
    }


    const refEntry = bestEntry ?? pcrData[0];
    return getATMStrike(refEntry.Spot_Price);
  }, [pcrData, strikes]);

  // Prepare chart data - show actual ATM strike per time point
  const getChartData = () => {
    return pcrData.map((entry) => {
      // Get actual ATM strike for this time based on spot price
      const actualATMStrike = getATMStrike(entry.Spot_Price);
      const atmPCR = entry.PCR_COI[actualATMStrike];

      // Calculate average PCR across all strikes
      const pcrValues = Object.values(entry.PCR_COI).filter((v) => typeof v === "number");
      const avgPCR = pcrValues.length > 0 ? pcrValues.reduce((a, b) => a + b, 0) / pcrValues.length : 0;

      return {
        time: entry.Time,
        spotPrice: entry.Spot_Price,
        mma: entry.MMA_Data?.NP || 0,
        atmPCR: atmPCR || 0,
        atmStrike: actualATMStrike,
        avgPCR,
        ...Object.fromEntries(strikes.map((s) => [`pcr_${s}`, entry.PCR_COI[s] || 0])),
      };
    });
  };

  // Get heatmap data for strikes - use LIVE ATM ±3 strikes for the bar chart
  const getHeatmapData = () => {
    if (pcrData.length === 0) return [];

    const latest = pcrData[pcrData.length - 1];
    const sideCount = 3; // Only ±3 strikes around live ATM for heatmap chart

    // Always use live ATM as center for this chart
    const liveATMStrike = getATMStrike(latest.Spot_Price);
    const atmIndex = strikes.indexOf(liveATMStrike);

    const startIndex = Math.max(0, atmIndex - sideCount);
    const endIndex = Math.min(strikes.length, atmIndex + sideCount + 1);
    const visibleStrikesLocal = strikes.slice(startIndex, endIndex);

    return visibleStrikesLocal.map((strike) => ({
      strike,
      pcr: latest.PCR_COI[strike] || 0,
      isATM: strike === liveATMStrike,
    }));
  };

  // Get visible strikes for table - use custom strike or fixed window around 09:15 ATM (+/- 7 strikes)
  const getVisibleStrikes = (): string[] => {
    if (pcrData.length === 0 || strikes.length === 0) return strikes;

    const latest = pcrData[pcrData.length - 1];
    const sideCount = 7;

    // If custom strike is selected, use it as center; otherwise use 09:15 ATM
    const windowCenterStrike = useCustomStrike && selectedCustomStrike 
      ? selectedCustomStrike 
      : (fixedATMStrike || getATMStrike(latest.Spot_Price));
    const windowCenterIndex = strikes.indexOf(windowCenterStrike);

    const startIndex = Math.max(0, windowCenterIndex - sideCount);
    const endIndex = Math.min(strikes.length, windowCenterIndex + sideCount + 1);

    return strikes.slice(startIndex, endIndex);
  };

  // Reverse data for display (latest first)
  const displayData = [...pcrData].reverse();
  const currentTimeData = pcrData[selectedTimeIndex];
  const chartData = getChartData();
  // MMA is first available after 09:30
  const mmaChartData = chartData.filter((d) => Number(d.mma) > 0 && parseTimeToMinutes(d.time) >= 9 * 60 + 30);
  const heatmapData = getHeatmapData();
  const visibleStrikes = getVisibleStrikes();

  return (
    <>
      <Helmet>
        <title>PCR All Strikes - Real-time PCR Analysis | Runalgo</title>
        <meta
          name="description"
          content="Track PCR (Put-Call Ratio) changes across all strike prices in real-time for Indian indices and stocks."
        />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <div className="sticky top-0 z-50">
          <TickerRibbon />
          <Navbar />
        </div>

        <main className="container mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
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
                      <Calendar mode="single" selected={historicalDate} onSelect={setHistoricalDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Custom Strike Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Center Strike</label>
                  <CenterStrikePicker
                    value={useCustomStrike && selectedCustomStrike ? selectedCustomStrike : "auto"}
                    strikes={availableStrikes}
                    loading={loadingStrikes}
                    disabled={availableStrikes.length === 0}
                    onChange={(val) => {
                      if (val === "auto") {
                        setUseCustomStrike(false);
                        setSelectedCustomStrike("");
                        return;
                      }

                      setUseCustomStrike(true);
                      setSelectedCustomStrike(val);

                      if (strikes.length > 0 && !strikes.includes(val)) {
                        toast({
                          title: "Strike not available",
                          description: `Selected strike ${val} is not present in PCR data right now.`,
                        });
                      }
                    }}
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
                    {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : "GO"}
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
                              <p>
                                This page shows PCR (Put-Call Ratio) changes based on Change in OI (COI) across all
                                strike prices over time. It helps understand option writers&apos; behavior across
                                different strikes.
                              </p>
                            </div>

                            <div className="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-cyan-500 mb-2">📈 MMA (Market Moving Average):</h4>
                              <p className="mb-2">
                                MMA is a <strong>neutral point of market</strong> based on real money flow across all
                                segments of the instrument including Cash, Futures, and Options.
                              </p>
                              <ul className="list-disc list-inside space-y-1">
                                <li>
                                  <span className="text-emerald-400">Spot Price {">"} MMA</span>: Bullish - Real money
                                  flowing into the instrument
                                </li>
                                <li>
                                  <span className="text-red-400">Spot Price {"<"} MMA</span>: Bearish - Real money
                                  flowing out of the instrument
                                </li>
                              </ul>
                              <p className="mt-2 text-xs italic">
                                Note: MMA calculation is proprietary but indicates true market sentiment based on actual
                                money movement.
                              </p>
                            </div>

                            <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-primary mb-2">🎨 Color Coding:</h4>
                              <ul className="list-disc list-inside space-y-1">
                                <li>
                                  <span className="text-emerald-400">Green (PCR {">"} 1.25)</span>: Bullish - Put
                                  writers dominating
                                </li>
                                <li>
                                  <span className="text-red-400">Red (PCR {"<"} 0.80)</span>: Bearish - Call writers
                                  dominating
                                </li>
                                <li>
                                  <span className="text-blue-400">Blue Border</span>: ATM (At The Money) strike
                                </li>
                              </ul>
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-yellow-500 mb-2">🔺🔻 Arrow Indicators:</h4>
                              <ul className="list-disc list-inside space-y-1">
                                <li>
                                  <span className="text-emerald-400">▲ Up Arrow</span>: PCR increased from previous
                                  reading
                                </li>
                                <li>
                                  <span className="text-red-400">▼ Down Arrow</span>: PCR decreased from previous
                                  reading
                                </li>
                              </ul>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-blue-500 mb-2">📋 Table Columns:</h4>
                              <ul className="list-disc list-inside space-y-1">
                                <li>
                                  <strong>Time:</strong> Timestamp of the data point
                                </li>
                                <li>
                                  <strong>Index:</strong> Current spot price of the index
                                </li>
                                <li>
                                  <strong>MMA:</strong> Market neutral point based on real money flow (Cash + Futures +
                                  Options)
                                </li>
                                <li>
                                  <strong>Strike Columns:</strong> PCR COI values for each strike
                                </li>
                              </ul>
                            </div>

                            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-red-500 mb-2">💡 Trading Insights:</h4>
                              <ul className="list-disc list-inside space-y-1">
                                <li>Market normally doesn&apos;t go below positive OI support</li>
                                <li>
                                  If price breaks support but PCR keeps falling → likely stoploss hunting, market may
                                  recover
                                </li>
                                <li>
                                  If ATM moves to red PCR column and PCR still not rising → market likely to fall
                                  further
                                </li>
                                <li>Watch for divergence between price movement and PCR changes</li>
                                <li>When Spot Price crosses above MMA → potential bullish momentum</li>
                                <li>When Spot Price crosses below MMA → potential bearish momentum</li>
                              </ul>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-amber-500 mb-2">📊 Divergence Count:</h4>
                              <p>
                                Shows number of strikes where PCR direction differs from price direction. High
                                divergence may indicate potential reversal or stoploss hunting moves.
                              </p>
                            </div>

                            <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-lg">
                              <h4 className="font-semibold text-purple-500 mb-2">🔔 PCR Alert:</h4>
                              <p>
                                Enable sound alerts to get notified when ATM strike PCR crosses above 1.25 (bullish) or
                                below 0.80 (bearish) during market hours (9:15 AM - 3:30 PM).
                              </p>
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

                {/* Right side - refresh info and alert toggle */}
                <div className="flex items-center gap-4">
                  {/* Alert Toggle */}
                  <div className="flex items-center gap-2">
                    <Switch id="alert-toggle" checked={alertEnabled} onCheckedChange={setAlertEnabled} />
                    <Label htmlFor="alert-toggle" className="flex items-center gap-1 cursor-pointer">
                      {alertEnabled ? (
                        <Volume2 className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <VolumeX className="h-3 w-3" />
                      )}
                      Alert
                    </Label>
                    {lastAlertTime && alertEnabled && (
                      <span className="text-[10px] text-muted-foreground">({lastAlertTime})</span>
                    )}
                  </div>

                  <div className="h-4 w-px bg-border" />

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
                    <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support & Resistance Bar - Single Row */}
          {supportResistance && kundaliData.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-start gap-6 text-sm flex-wrap">
                  {/* Support */}
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-semibold">Support</span>
                    <span className="text-muted-foreground">Vol & OI</span>
                    <span className="text-foreground">Strong 🛡️ @ {supportResistance.supportStrong}</span>
                  </div>

                  <div className="h-4 w-px bg-border" />

                  {/* Resistance */}
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-semibold">Resistance</span>
                    <span className="text-muted-foreground">Vol & OI</span>
                    <span className="text-foreground flex items-center gap-1">
                      WTT{" "}
                      {supportResistance.resistanceWTTDirection === "up" ? (
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}{" "}
                      {supportResistance.resistanceRange}
                    </span>
                  </div>

                  <div className="h-4 w-px bg-border" />

                  {/* Divergence */}
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-semibold">Divergence</span>
                    <span className="text-xl font-bold text-foreground">{calculateDivergence()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Section */}
          {pcrData.length > 0 && chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Spot Price vs MMA Chart */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Spot Price vs MMA</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={mmaChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={["auto", "auto"]}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickLine={false}
                          width={60}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "white",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Line
                          type="monotone"
                          dataKey="spotPrice"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          name="Spot Price"
                        />
                        <Line
                          type="monotone"
                          dataKey="mma"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="MMA"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* ATM PCR Over Time Chart */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">ATM PCR Over Time (Live ATM)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, "auto"]}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickLine={false}
                          width={40}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "hsl(var(--foreground))",
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                          formatter={(value: number, name: string, props: any) => {
                            const atmStrike = props?.payload?.atmStrike || "";
                            return [
                              <span key="value">
                                {value.toFixed(2)} <span style={{ fontSize: "10px", opacity: 0.7 }}>(Strike: {atmStrike})</span>
                              </span>,
                              "ATM PCR"
                            ];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <ReferenceLine
                          y={1.25}
                          stroke="#10b981"
                          strokeDasharray="3 3"
                          label={{ value: "1.25", position: "right", fontSize: 10, fill: "#10b981" }}
                        />
                        <ReferenceLine
                          y={0.8}
                          stroke="#ef4444"
                          strokeDasharray="3 3"
                          label={{ value: "0.80", position: "right", fontSize: 10, fill: "#ef4444" }}
                        />
                        <ReferenceLine y={1.0} stroke="#6b7280" strokeDasharray="2 2" />
                        <Area
                          type="monotone"
                          dataKey="atmPCR"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.3}
                          strokeWidth={2}
                          name="ATM PCR"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* PCR Heatmap Bar Chart */}
              <Card className="bg-card/50 border-border/50 lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Current PCR Across Strikes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={heatmapData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                          dataKey="strike"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, "auto"]}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickLine={false}
                          width={40}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "hsl(var(--foreground))",
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                          itemStyle={{ color: "hsl(var(--foreground))" }}
                          formatter={(value: number, name: string) => [value.toFixed(2), name === "pcr" ? "PCR" : name]}
                        />
                        <ReferenceLine y={1.25} stroke="#10b981" strokeDasharray="3 3" />
                        <ReferenceLine y={0.8} stroke="#ef4444" strokeDasharray="3 3" />
                        <ReferenceLine y={1.0} stroke="#6b7280" strokeDasharray="2 2" />
                        <Bar dataKey="pcr" name="PCR" radius={[4, 4, 0, 0]}>
                          {heatmapData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.pcr >= 1.25 ? "#10b981" : entry.pcr <= 0.8 ? "#ef4444" : "#8b5cf6"}
                              stroke={entry.isATM ? "#3b82f6" : "transparent"}
                              strokeWidth={entry.isATM ? 3 : 0}
                            />
                          ))}
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Data Table */}
          {pcrData.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-0">
                <div className="w-full overflow-x-auto">
                  <Table className="w-max min-w-max">
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="sticky left-0 bg-card z-10 whitespace-nowrap">Time</TableHead>
                        <TableHead className="whitespace-nowrap">Index</TableHead>
                        <TableHead className="whitespace-nowrap">MMA</TableHead>
                        {visibleStrikes.map((strike) => (
                          <TableHead key={strike} className="text-center whitespace-nowrap min-w-[70px]">
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
                            <TableCell className="sticky left-0 bg-card z-10 font-mono text-xs whitespace-nowrap">
                              {row.Time}
                            </TableCell>
                            <TableCell className="font-mono whitespace-nowrap">{row.Spot_Price.toFixed(2)}</TableCell>
                            <TableCell className="font-mono text-xs whitespace-nowrap">
                              {row.MMA_Data?.NP?.toFixed(2) || "--"}
                            </TableCell>
                            {visibleStrikes.map((strike) => {
                              const pcr = row.PCR_COI[strike];
                              const previousPCR = previousRow?.PCR_COI[strike];
                              const isATM = strike === atmStrike;
                              const colorClass = getPCRColorClass(pcr);

                              return (
                                <TableCell
                                  key={strike}
                                  className={`text-center font-mono text-xs whitespace-nowrap ${colorClass} ${isATM ? "ring-2 ring-blue-500 ring-inset" : ""}`}
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
                </div>
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
