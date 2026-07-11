import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import MobilePCROptionsChain from "@/components/mobile/MobilePCROptionsChain";
import { MobileSymbolExpiryBar } from "@/components/mobile/MobileSymbolExpiryBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { PCRIntradayAnalysis } from "@/components/pcr/PCRIntradayAnalysis";
import { PCRSupportResistance } from "@/components/pcr/PCRSupportResistance";
import { PCRSentimentGauge } from "@/components/pcr/PCRSentimentGauge";
import { fetchPCRData, PCRTimeData } from "@/services/pcrApi";
import { aggregatePCRData, PCRTimeframe } from "@/utils/pcrTimeframeAggregator";
import { fetchKundaliData, extractSupportResistance, SupportResistanceData } from "@/services/kundaliApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, TrendingUp, Clock, RefreshCw, Timer, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminPaletteButton } from "@/components/admin/AdminPaletteButton";
import { PageInfoModal } from "@/components/PageInfoModal";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { format } from "date-fns";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

const AUTO_REFRESH_INTERVAL = 60 * 1000; // 1 minute

// --- API fetchers (pure functions) ---

async function fetchSymbolsList(): Promise<SymbolGroup> {
  const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
    body: { endpoint: "symbols" },
  });
  if (error) throw error;
  return {
    indexSymbols: data?.["index symbols"] || [],
    stockSymbols: data?.symbols || [],
  };
}

async function fetchExpiryDates(symbol: string, historicalDate?: string): Promise<string[]> {
  const params: Record<string, string> = { symbol };
  if (historicalDate) params.date = historicalDate;
  const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
    body: { endpoint: "expiry", params },
  });
  if (error) throw error;

  if (Array.isArray(data)) return data;
  if (data?.expiry_dates && Array.isArray(data.expiry_dates)) return data.expiry_dates;
  if (data?.expiryDates && Array.isArray(data.expiryDates)) return data.expiryDates;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
}

interface PCRFetchResult {
  rawData: PCRTimeData[];
  supportResistance: SupportResistanceData | null;
}

async function fetchPCRAndSR(
  symbol: string,
  expiry: string,
  strikeCount: number,
  historicalDate?: string,
): Promise<PCRFetchResult> {
  const response = await fetchPCRData(symbol, expiry, strikeCount, historicalDate);

  let supportResistance: SupportResistanceData | null = null;

  if (response.dataWhole && response.dataWhole.length > 0) {
    try {
      const kundaliResponse = await fetchKundaliData(symbol, expiry, 100);
      if (kundaliResponse.dataWhole && kundaliResponse.dataWhole.length > 0) {
        supportResistance = extractSupportResistance(
          kundaliResponse.dataWhole,
          response.dataWhole[response.dataWhole.length - 1]?.underlyning || 0,
        );
      }
    } catch (err) {
      console.error("Error fetching Kundali data:", err);
    }
  }

  return { rawData: response.dataWhole || [], supportResistance };
}

// --- Helper: fill missing Future/VWAP ---

function fillLatestData(data: PCRTimeData[], index: number): PCRTimeData & { futureFromPrevious: boolean; vwapFromPrevious: boolean } {
  const entry = { ...data[index], futureFromPrevious: false, vwapFromPrevious: false };

  if (entry.Future === 0 || !entry.Future) {
    for (let i = index - 1; i >= 0; i--) {
      if (data[i].Future && data[i].Future !== 0) {
        entry.Future = data[i].Future;
        entry.futureFromPrevious = true;
        break;
      }
    }
  }

  if (entry.VWAP === 0 || !entry.VWAP) {
    for (let i = index - 1; i >= 0; i--) {
      if (data[i].VWAP && data[i].VWAP !== 0) {
        entry.VWAP = data[i].VWAP;
        entry.vwapFromPrevious = true;
        break;
      }
    }
  }

  return entry;
}

// --- Component ---

const PCR = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const urlSymbol = searchParams.get("symbol");
  const urlExpiry = searchParams.get("expiry");

  const [selectedSymbol, setSelectedSymbol] = useState(urlSymbol || "Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState(urlExpiry || "");
  const [strikeCount, setStrikeCount] = useState(5);
  const [selectedTimeframe, setSelectedTimeframe] = useState<PCRTimeframe>("3min");
  const [historicalDate, setHistoricalDate] = useState<Date | undefined>();
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(-1);

  // Countdown state
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track last refresh for display
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const historicalDateStr = historicalDate ? format(historicalDate, "yyyy-MM-dd") : undefined;

  // ---- React Query: Symbols (cached globally, rarely changes) ----
  const { data: symbols = { indexSymbols: [], stockSymbols: [] }, isLoading: loadingSymbols } = useQuery({
    queryKey: ["option-symbols"],
    queryFn: fetchSymbolsList,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ---- React Query: Expiry dates (cached per symbol + historical date) ----
  const { data: expiryDates = [], isLoading: loadingExpiry } = useQuery({
    queryKey: ["option-expiry", selectedSymbol, historicalDateStr],
    queryFn: () => fetchExpiryDates(selectedSymbol, historicalDateStr),
    enabled: !!selectedSymbol,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Auto-select expiry when dates load
  useEffect(() => {
    if (expiryDates.length > 0) {
      if (urlExpiry && expiryDates.includes(urlExpiry)) {
        setSelectedExpiry(urlExpiry);
      } else if (!expiryDates.includes(selectedExpiry)) {
        setSelectedExpiry(expiryDates[0]);
      }
    }
  }, [expiryDates]);

  // Auto-set strike count based on symbol type
  useEffect(() => {
    if (symbols.indexSymbols.length > 0 || symbols.stockSymbols.length > 0) {
      const isIndex = symbols.indexSymbols.includes(selectedSymbol);
      setStrikeCount(isIndex ? 5 : 2);
    }
  }, [selectedSymbol, symbols]);

  // ---- React Query: PCR + SR data (cached per params, auto-refresh) ----

  const pcrQueryKey = ["pcr-data", selectedSymbol, selectedExpiry, strikeCount, historicalDateStr];

  const {
    data: pcrResult,
    isLoading: loadingData,
    isFetching,
    refetch: refetchPCR,
    dataUpdatedAt,
  } = useQuery({
    queryKey: pcrQueryKey,
    queryFn: () => fetchPCRAndSR(selectedSymbol, selectedExpiry, strikeCount, historicalDateStr),
    enabled: !!selectedSymbol && !!selectedExpiry && !loadingExpiry,
    staleTime: AUTO_REFRESH_INTERVAL,
    gcTime: 10 * 60 * 1000,
    refetchInterval: AUTO_REFRESH_INTERVAL,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: 2,
    meta: { skipLoadingToast: true },
  });

  // Track refresh times using dataUpdatedAt (updates even if data is identical)
  useEffect(() => {
    if (dataUpdatedAt > 0) {
      setLastRefresh(new Date(dataUpdatedAt));
      setNextRefresh(new Date(dataUpdatedAt + AUTO_REFRESH_INTERVAL));
    }
  }, [dataUpdatedAt]);

  // Derive aggregated data from raw
  const rawPcrData = pcrResult?.rawData || [];
  const supportResistanceData = pcrResult?.supportResistance || null;

  const pcrData = useMemo(() => {
    if (rawPcrData.length === 0) return [];
    return aggregatePCRData(rawPcrData, selectedTimeframe);
  }, [rawPcrData, selectedTimeframe]);

  // Auto-select last time index when data changes
  useEffect(() => {
    if (pcrData.length > 0) {
      setSelectedTimeIndex(pcrData.length - 1);
    }
  }, [pcrData.length]);

  // Derive latestData from selection
  const latestData = useMemo(() => {
    if (pcrData.length === 0 || selectedTimeIndex < 0 || selectedTimeIndex >= pcrData.length) return null;
    return fillLatestData(pcrData, selectedTimeIndex);
  }, [pcrData, selectedTimeIndex]);

  // Countdown timer
  useEffect(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

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
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [nextRefresh]);

  const handleGo = () => {
    queryClient.invalidateQueries({ queryKey: pcrQueryKey });
  };

  const handleManualRefresh = () => {
    refetchPCR();
  };

  // Time navigation handlers
  const handlePrevTime = () => {
    if (selectedTimeIndex > 0) setSelectedTimeIndex(selectedTimeIndex - 1);
  };

  const handleNextTime = () => {
    if (selectedTimeIndex < pcrData.length - 1) setSelectedTimeIndex(selectedTimeIndex + 1);
  };

  const handleTimeSelect = (index: string) => {
    setSelectedTimeIndex(parseInt(index));
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
              {/* Mobile compact controls */}
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
                    {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : "GO"}
                  </Button>
                }
                filtersContent={
                  <>
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
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground font-medium">Timeframe</label>
                      <Select value={selectedTimeframe} onValueChange={(v) => setSelectedTimeframe(v as PCRTimeframe)}>
                        <SelectTrigger className="w-full bg-secondary h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50">
                          <SelectItem value="3min">3 Min</SelectItem>
                          <SelectItem value="5min">5 Min</SelectItem>
                          <SelectItem value="15min">15 Min</SelectItem>
                          <SelectItem value="30min">30 Min</SelectItem>
                          <SelectItem value="1hr">1 Hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground font-medium">Strikes around ATM</label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={strikeCount}
                        onChange={(e) => setStrikeCount(parseInt(e.target.value) || 5)}
                        className="bg-secondary h-9 text-xs"
                      />
                    </div>
                  </>
                }
              />

              <div className="hidden md:grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-4 items-end">

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
                        <SelectItem key={date} value={date}>{date}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Historical Date */}
                <div className="space-y-1.5 hidden sm:block">
                  <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Historical</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-secondary h-9 sm:h-10 text-xs sm:text-sm"
                      >
                        <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        {historicalDate ? format(historicalDate, "dd/MM/yyyy") : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={historicalDate}
                        onSelect={setHistoricalDate}
                        defaultMonth={historicalDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Timeframe */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Timeframe</label>
                  <Select value={selectedTimeframe} onValueChange={(v) => setSelectedTimeframe(v as PCRTimeframe)}>
                    <SelectTrigger className="w-full bg-secondary h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="3min">3 Min</SelectItem>
                      <SelectItem value="5min">5 Min</SelectItem>
                      <SelectItem value="15min">15 Min</SelectItem>
                      <SelectItem value="30min">30 Min</SelectItem>
                      <SelectItem value="1hr">1 Hour</SelectItem>
                    </SelectContent>
                  </Select>
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
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
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

                <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Data Time: <span className="text-foreground font-medium">{currentTimeData?.time || "--:--"}</span></span>
                  </div>
                  <LastRefreshBadge lastRefresh={lastRefresh} isFetching={isFetching} />
                  <PageInfoModal
                    title="Put-Call Ratio (PCR)"
                    subtitle="Aggregate sentiment gauge derived from options positioning"
                    overview={
                      <>
                        The Put-Call Ratio is the single most widely-watched options sentiment
                        metric. It compares the total Open Interest (or volume) of Puts against
                        Calls for the selected expiry. Because option writers are typically
                        institutional players defending their strikes, PCR reveals where the
                        smart money has committed capital — not just what retail is buying.
                      </>
                    }
                    formula={{
                      expression:
                        "PCR (OI)     = Total Put OI     ÷ Total Call OI\nPCR (Volume) = Total Put Volume ÷ Total Call Volume\nATM PCR      = Put OI ± N strikes ÷ Call OI ± N strikes",
                      note: "OI PCR reflects standing positions; Volume PCR reflects today's fresh activity. ATM PCR is the most sensitive to intraday sentiment shifts.",
                    }}
                    legend={[
                      {
                        label: "PCR > 1.3",
                        text: "Bullish — heavy put writing, market makers confident downside is protected.",
                        color: "#059669",
                      },
                      {
                        label: "PCR 1.0 – 1.3",
                        text: "Mildly bullish — put writers modestly ahead of call writers.",
                        color: "#34d399",
                      },
                      {
                        label: "PCR 0.8 – 1.0",
                        text: "Neutral / range-bound — balanced positioning, no directional bias.",
                        color: "#f59e0b",
                      },
                      {
                        label: "PCR 0.5 – 0.8",
                        text: "Mildly bearish — call writers gaining confidence, upside capped.",
                        color: "#f87171",
                      },
                      {
                        label: "PCR < 0.5",
                        text: "Bearish — heavy call writing, market expects downside or sideways action.",
                        color: "#dc2626",
                      },
                    ]}
                    sections={[
                      {
                        heading: "Contrarian Interpretation",
                        body: (
                          <>
                            At <strong>extreme</strong> readings PCR flips into a contrarian
                            signal. A PCR &gt; 1.8 in a euphoric market often marks a top
                            (everyone's already long). A PCR &lt; 0.4 in a panicked market
                            often marks a bottom (capitulation puts). Use the Sentiment Gauge
                            below to visualize how far from neutral you are.
                          </>
                        ),
                      },
                      {
                        heading: "ATM PCR — the leading indicator",
                        body: (
                          <>
                            Total PCR includes deep OTM strikes that rarely trade. ATM PCR
                            focuses on the strikes actually driving delta — this is what you
                            watch <strong>tick-by-tick</strong> for intraday direction changes.
                            Divergence between ATM PCR and Total PCR often precedes a reversal.
                          </>
                        ),
                      },
                      {
                        heading: "Intraday Chart",
                        body: (
                          <>
                            Tracks PCR through the session against spot price. Look for:
                            <ul className="mt-2 space-y-1 list-disc pl-5">
                              <li>PCR rising with spot rising = strong long buildup ✅</li>
                              <li>PCR falling with spot falling = strong short buildup ❌</li>
                              <li>PCR rising while spot falls = short covering into resistance</li>
                              <li>PCR falling while spot rises = long unwinding, weak rally</li>
                            </ul>
                          </>
                        ),
                      },
                      {
                        heading: "Spot vs MMA",
                        body: (
                          <>
                            Overlays spot on a Moving Momentum Average of PCR. When spot
                            crosses the MMA with PCR confirming direction, momentum trades
                            have the highest probability.
                          </>
                        ),
                      },
                    ]}
                    howToUse={
                      <>
                        Don't trade PCR in isolation — combine it with{" "}
                        <strong>price action</strong> and <strong>OI walls</strong>. A rising
                        PCR near Strong Support is a high-conviction long setup; a falling PCR
                        near Strong Resistance is a high-conviction short setup. On expiry
                        days, PCR loses reliability as OI naturally collapses — switch to
                        Volume PCR instead.
                      </>
                    }
                    tips={[
                      "Change the timeframe to smooth noise — 5-min for intraday, 15-min for swing bias.",
                      "Compare index PCR vs Bank Nifty PCR — divergence often signals sector rotation.",
                      "PCR resets at 9:15 — the first 30 minutes are noisy; wait for the trend to stabilize.",
                      "For a cleaner directional read, use the PCR Long/Short page which strips out unwinding noise.",
                    ]}
                  />
                  <div className="flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5" />
                    <span>Next Refresh: <span className="text-primary font-medium">{countdown || "--:--"}</span></span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={isFetching}
                  className="h-7 px-3"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
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
                  <p className={`text-2xl font-bold ${latestData.PCR_OI < 1 ? "text-red-400" : "text-emerald-400"}`}>
                    {latestData.PCR_OI.toFixed(2)}
                  </p>
                </Card>
                <Card className="bg-card/50 border-border/50 p-4">
                  <p className="text-xs text-muted-foreground">PCR (COI)</p>
                  <p className={`text-2xl font-bold ${latestData.PCR_COI < 1 ? "text-red-400" : "text-emerald-400"}`}>
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
                    {latestData.futureFromPrevious && <span className="text-primary text-sm">*</span>}
                  </p>
                </Card>
                <Card className="bg-card/50 border-border/50 p-4">
                  <p className="text-xs text-muted-foreground">VWAP</p>
                  <p className="text-2xl font-bold text-foreground">
                    {latestData.VWAP.toFixed(2)}
                    {latestData.vwapFromPrevious && <span className="text-primary text-sm">*</span>}
                  </p>
                </Card>
                <Card className="bg-card/50 border-border/50 p-4">
                  <p className="text-xs text-muted-foreground">ATM Strike</p>
                  <p className="text-2xl font-bold text-primary">{latestData.atm}</p>
                </Card>
              </div>

              {/* Options Chain */}
              {isMobile ? (
                <MobilePCROptionsChain
                  data={latestData.dataThis}
                  atm={latestData.atm}
                  spotPrice={latestData.underlyning}
                  pcrOI={latestData.PCR_OI}
                  pcrCOI={latestData.PCR_COI}
                />
              ) : (
                <PCROptionsChain
                  data={latestData.dataThis}
                  atm={latestData.atm}
                  spotPrice={latestData.underlyning}
                  pcrOI={latestData.PCR_OI}
                  pcrCOI={latestData.PCR_COI}
                />
              )}


              {/* Intraday Analysis */}
              <PCRIntradayAnalysis data={pcrData} />

              {/* Support & Resistance */}
              <PCRSupportResistance
                supportResistanceData={supportResistanceData}
                spotPrice={latestData.underlyning}
                loading={isFetching && !latestData}
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
