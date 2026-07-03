import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import LTPCalculatorModal from "@/components/LTPCalculatorModal";
import { AdminPaletteButton } from "@/components/admin/AdminPaletteButton";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { PageInfoButton } from "@/components/PageInfoButton";
import { MarketClosedBanner } from "@/components/MarketClosedBanner";
import { useMarketStatus } from "@/hooks/useMarketStatus";
import { RefreshCw, Settings, ChevronLeft, ChevronRight, Clock, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchKundaliData, KundaliTimeData } from "@/services/kundaliApi";
import SupportResistanceChart from "@/components/supportResistance/SupportResistanceChart";

interface OptionData {
  strike_price: number;
  underlying_spot_price: number;
  pcr: number;
  expiry: string;
  call_options: {
    market_data: {
      ltp: number;
      close_price: number;
      volume: number;
      oi: number;
      prev_oi: number;
    };
    option_greeks: {
      iv: number;
      delta: number;
      theta: number;
      gamma: number;
      vega: number;
    };
  };
  put_options: {
    market_data: {
      ltp: number;
      close_price: number;
      volume: number;
      oi: number;
      prev_oi: number;
    };
    option_greeks: {
      iv: number;
      delta: number;
      theta: number;
      gamma: number;
      vega: number;
    };
  };
}

interface ShiftingEntry {
  time: string;
  callShift: string;
  putShift: string;
}

// Format number in Indian notation (Lakhs)
const formatIndianNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return "";
  return Number(num).toLocaleString("en-IN");
};

// Time slots from 9:15 AM to 3:30 PM in 3-minute intervals
const generateTimeSlots = () => {
  const slots: string[] = [];
  const startTotalMinutes = 9 * 60 + 15;
  const endTotalMinutes = 15 * 60 + 30;
  const stepMinutes = 3;

  for (let total = startTotalMinutes; total <= endTotalMinutes; total += stepMinutes) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    const hour = h.toString().padStart(2, "0");
    const min = m.toString().padStart(2, "0");
    slots.push(`${hour}${min}`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const formatTimeDisplay = (time: string) => {
  if (!time || time.length < 4) return "";
  const hour = parseInt(time.slice(0, 2));
  const min = time.slice(2, 4);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour.toString().padStart(2, "0")}:${min} ${period}`;
};

// Helper to calculate shifts from kundali data
const calculateShiftsFromKundali = (dataWhole: KundaliTimeData[]): ShiftingEntry[] => {
  const shifts: ShiftingEntry[] = [];
  
  for (let i = 1; i < dataWhole.length; i++) {
    const prev = dataWhole[i - 1];
    const curr = dataWhole[i];
    
    const callShiftOccurred = curr.max_ce_strike !== prev.max_ce_strike;
    const putShiftOccurred = curr.max_pe_strike !== prev.max_pe_strike;
    
    if (callShiftOccurred || putShiftOccurred) {
      shifts.push({
        time: curr.time,
        callShift: callShiftOccurred ? `SFT : ${prev.max_ce_strike} -> ${curr.max_ce_strike}` : "-",
        putShift: putShiftOccurred ? `SFT : ${prev.max_pe_strike} -> ${curr.max_pe_strike}` : "-",
      });
    }
  }
  
  // Return in reverse order (most recent first)
  return shifts.reverse();
};

// Calculate strike diff for reversal/support calculations
const getStrikeDiff = (data: OptionData[]): number => {
  if (data.length < 2) return 50; // Default
  const sorted = [...data].sort((a, b) => a.strike_price - b.strike_price);
  return Math.abs(sorted[1].strike_price - sorted[0].strike_price);
};

// Calculate reversal level (resistance) based on Greeks
const calculateReversalValue = (
  strike: number,
  delta: number,
  theta: number,
  gamma: number,
  vega: number,
  strikeDiff: number
): number => {
  // Define weights for the reversal calculation
  const k1 = 1.2; // Weight for delta
  const k2 = 0.8; // Weight for theta
  const k3 = 0.5; // Weight for gamma
  const k4 = 0.3; // Weight for vega

  // Calculate reversal adjustment
  const reversalAdjustment = k1 * delta + k2 * theta + k3 * gamma + k4 * vega;

  // Calculate reversal level
  const reversal = strike - Math.max(strikeDiff * -1, reversalAdjustment);

  return Math.round(reversal * 100) / 100;
};

// Calculate support level based on Greeks
const calculateSupportValue = (
  strike: number,
  delta: number,
  theta: number,
  gamma: number,
  vega: number,
  strikeDiff: number
): number => {
  // Define weights for the support calculation
  const k1 = 1.2; // Weight for delta
  const k2 = 0.8; // Weight for theta
  const k3 = 0.5; // Weight for gamma
  const k4 = 0.3; // Weight for vega

  // Calculate support adjustment
  const supportAdjustment = k1 * delta - k2 * theta + k3 * gamma - k4 * vega;

  // Calculate support level
  const support = strike - Math.min(strikeDiff, supportAdjustment);

  return Math.round(support * 100) / 100;
};

const SupportResistance = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { isTodayClosed, lastWorkingDay } = useMarketStatus();

  const [indexSymbols, setIndexSymbols] = useState<string[]>([]);
  const [stockSymbols, setStockSymbols] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("Nifty 50");
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [optionData, setOptionData] = useState<OptionData[]>([]);
  const [spotPrice, setSpotPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [historicalTime, setHistoricalTime] = useState<string>("");

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [strikeCount, setStrikeCount] = useState(10);
  const [displayAsLots, setDisplayAsLots] = useState(false);
  const [lotSize, setLotSize] = useState(75);
  const [highlightCount, setHighlightCount] = useState(2);
  const [highlightPercentage, setHighlightPercentage] = useState(74.99);

  // Shifting modal - now dynamic from kundali data
  const [shiftingOpen, setShiftingOpen] = useState(false);
  const [shiftingData, setShiftingData] = useState<ShiftingEntry[]>([]);
  const [shiftingLoading, setShiftingLoading] = useState(false);

  // Info/Guide modal
  const [infoOpen, setInfoOpen] = useState(false);

  // LTP Calculator modal
  const [ltpModalOpen, setLtpModalOpen] = useState(false);
  const [selectedStrikeData, setSelectedStrikeData] = useState<OptionData | null>(null);

  const handleStrikeClick = (row: OptionData) => {
    setSelectedStrikeData(row);
    setLtpModalOpen(true);
  };

  // Calculate support and resistance levels
  const calculateLevels = useCallback(() => {
    if (optionData.length === 0) return { resistance: 0, support: 0 };

    let maxCallOI = 0,
      maxPutOI = 0;
    let resistanceStrike = 0,
      supportStrike = 0;

    optionData.forEach((row) => {
      if (row.call_options.market_data.oi > maxCallOI) {
        maxCallOI = row.call_options.market_data.oi;
        resistanceStrike = row.strike_price;
      }
      if (row.put_options.market_data.oi > maxPutOI) {
        maxPutOI = row.put_options.market_data.oi;
        supportStrike = row.strike_price;
      }
    });

    return { resistance: resistanceStrike, support: supportStrike };
  }, [optionData]);

  const levels = calculateLevels();

  // Fetch symbols
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("option-chain", {
          body: { action: "getSymbols" },
        });
        if (error) throw error;
        console.log("Symbols response:", data);

        // API returns "index symbols" (with space) not "index_symbols"
        const idxSymbols = data?.["index symbols"] || data?.index_symbols || [];
        const stkSymbols = data?.symbols || [];
        console.log("Index symbols:", idxSymbols);
        console.log("Stock symbols:", stkSymbols);
        setIndexSymbols(idxSymbols);
        setStockSymbols(stkSymbols);

        // Auto-select first index symbol if available
        if (idxSymbols.length > 0 && !idxSymbols.includes(selectedSymbol) && !stkSymbols.includes(selectedSymbol)) {
          setSelectedSymbol(idxSymbols[0]);
        }
      } catch (err) {
        console.error("Error fetching symbols:", err);
      }
    };
    fetchSymbols();
  }, []);

  // Fetch expiry dates when symbol changes
  useEffect(() => {
    const fetchExpiryDates = async () => {
      if (!selectedSymbol) return;
      try {
        const { data, error } = await supabase.functions.invoke("option-chain", {
          body: { action: "getExpiryDates", symbol: selectedSymbol },
        });
        if (error) throw error;
        console.log("Expiry dates response:", data);
        // Handle response format: { expiry_dates: [...] }
        let expiryList: string[] = [];
        if (data?.expiry_dates && Array.isArray(data.expiry_dates)) {
          expiryList = data.expiry_dates;
        } else if (Array.isArray(data)) {
          expiryList = data;
        }
        if (expiryList.length > 0) {
          setExpiryDates(expiryList);
          setSelectedExpiry(expiryList[0]);
        }
      } catch (err) {
        console.error("Error fetching expiry dates:", err);
      }
    };
    fetchExpiryDates();
  }, [selectedSymbol]);

  // Fetch option chain data
  const fetchOptionChain = useCallback(async () => {
    if (!selectedSymbol || !selectedExpiry) return;
    setLoading(true);
    try {
      const body: Record<string, string> = {
        action: "getOptionChain",
        symbol: selectedSymbol,
        expiry_date: selectedExpiry,
      };

      if (!isLive && historicalTime) {
        body.time = historicalTime;
      }
      if (isTodayClosed && lastWorkingDay) {
        body.date = lastWorkingDay;
      }

      const { data, error } = await supabase.functions.invoke("option-chain", { body });
      if (error) throw error;

      console.log("Option chain response:", data);

      // API returns: { option_chain: { status, data: [...] } } OR { data: [...] }
      let chainData: OptionData[] = [];
      if (data?.option_chain?.data && Array.isArray(data.option_chain.data)) {
        chainData = data.option_chain.data;
      } else if (data?.data && Array.isArray(data.data)) {
        chainData = data.data;
      }

      if (chainData.length > 0) {
        setOptionData(chainData);
        setSpotPrice(chainData[0].underlying_spot_price);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error("Error fetching option chain:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol, selectedExpiry, isLive, historicalTime, isTodayClosed, lastWorkingDay]);

  useEffect(() => {
    if (selectedExpiry) {
      fetchOptionChain();
    }
  }, [selectedExpiry, fetchOptionChain]);

  // Fetch kundali data for shifts
  const fetchKundaliShifts = useCallback(async () => {
    if (!selectedSymbol || !selectedExpiry) return;
    setShiftingLoading(true);
    try {
      const result = await fetchKundaliData(selectedSymbol, selectedExpiry, 100);
      if (result.dataWhole && result.dataWhole.length > 0) {
        const shifts = calculateShiftsFromKundali(result.dataWhole);
        setShiftingData(shifts);
        console.log("Kundali shifts calculated:", shifts.length);
      }
    } catch (err) {
      console.error("Error fetching kundali data for shifts:", err);
    } finally {
      setShiftingLoading(false);
    }
  }, [selectedSymbol, selectedExpiry]);

  useEffect(() => {
    if (selectedExpiry) {
      fetchKundaliShifts();
    }
  }, [selectedExpiry, fetchKundaliShifts]);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Auto-switch to historical mode with 1530 when market is closed
  useEffect(() => {
    if (isTodayClosed) {
      setIsLive(false);
      setHistoricalTime("1530");
    }
  }, [isTodayClosed]);

  // Handle time navigation
  const handleTimeChange = (direction: "prev" | "next") => {
    const currentIndex = TIME_SLOTS.indexOf(historicalTime);
    let newIndex = currentIndex;

    if (direction === "prev") {
      newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
    } else {
      newIndex = currentIndex < TIME_SLOTS.length - 1 ? currentIndex + 1 : TIME_SLOTS.length - 1;
    }

    if (newIndex !== currentIndex) {
      setHistoricalTime(TIME_SLOTS[newIndex]);
    }
  };

  const toggleLiveMode = () => {
    if (isLive) {
      setIsLive(false);
      const defaultTimeIndex = Math.floor(TIME_SLOTS.length / 2);
      setHistoricalTime(TIME_SLOTS[defaultTimeIndex]);
    } else {
      setIsLive(true);
      setHistoricalTime("");
    }
  };

  // Auto-fetch on historical time change
  useEffect(() => {
    if (!isLive && historicalTime) {
      const timer = setTimeout(() => {
        fetchOptionChain();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [historicalTime, isLive, fetchOptionChain]);

  // Calculate filtered data based on strike count
  const getFilteredData = () => {
    if (optionData.length === 0) return [];

    const sorted = [...optionData].sort((a, b) => a.strike_price - b.strike_price);
    const spotPriceIndex = sorted.findIndex((row) => row.strike_price > spotPrice);
    const startIndex = Math.max(0, spotPriceIndex - strikeCount);
    const endIndex = Math.min(sorted.length, spotPriceIndex + strikeCount);

    return sorted.slice(startIndex, endIndex);
  };

  const filteredData = getFilteredData();
  const strikeDiff = getStrikeDiff(optionData);

  // Calculate top N values for highlighting
  const getTopNValues = (data: OptionData[], keyFn: (row: OptionData) => number, n: number) => {
    return data
      .map((row) => keyFn(row))
      .sort((a, b) => b - a)
      .slice(0, n);
  };

  const topCallVolumes = getTopNValues(optionData, (row) => row.call_options.market_data.volume, highlightCount);
  const topPutVolumes = getTopNValues(optionData, (row) => row.put_options.market_data.volume, highlightCount);
  const topCallOIs = getTopNValues(optionData, (row) => row.call_options.market_data.oi, highlightCount);
  const topPutOIs = getTopNValues(optionData, (row) => row.put_options.market_data.oi, highlightCount);
  const topCallCOIs = getTopNValues(
    optionData,
    (row) => row.call_options.market_data.oi - row.call_options.market_data.prev_oi,
    highlightCount,
  );
  const topPutCOIs = getTopNValues(
    optionData,
    (row) => row.put_options.market_data.oi - row.put_options.market_data.prev_oi,
    highlightCount,
  );

  // Calculate totals
  const totals = optionData.reduce(
    (acc, row) => ({
      callOI: acc.callOI + row.call_options.market_data.oi,
      callCOI: acc.callCOI + (row.call_options.market_data.oi - row.call_options.market_data.prev_oi),
      callVolume: acc.callVolume + row.call_options.market_data.volume,
      putOI: acc.putOI + row.put_options.market_data.oi,
      putCOI: acc.putCOI + (row.put_options.market_data.oi - row.put_options.market_data.prev_oi),
      putVolume: acc.putVolume + row.put_options.market_data.volume,
    }),
    { callOI: 0, callCOI: 0, callVolume: 0, putOI: 0, putCOI: 0, putVolume: 0 },
  );

  // Get highlight class for a value
  const getHighlightClass = (value: number, topValues: number[], isPut: boolean) => {
    const index = topValues.indexOf(value);
    if (index === -1) return { bg: "", isHighlighted: false };
    if (index === 0)
      return {
        bg: isPut ? "bg-green-700 border border-white/50 rounded" : "bg-red-700 border border-white/50 rounded",
        isHighlighted: true,
      };
    if (value >= topValues[0] * (highlightPercentage / 100)) {
      if (index === 1) return { bg: "bg-amber-600 border border-white/50 rounded", isHighlighted: true };
      if (index === 2) return { bg: "bg-pink-600 border border-white/50 rounded", isHighlighted: true };
      if (index === 3) return { bg: "bg-gray-500 border border-white/50 rounded", isHighlighted: true };
    }
    return { bg: "", isHighlighted: false };
  };

  // Format values based on lots/quantity setting
  const formatValue = (value: number) => {
    if (displayAsLots) {
      return formatIndianNumber(Math.round(value / lotSize));
    }
    return formatIndianNumber(value);
  };

  // PCR calculations
  const pcrOI = totals.callOI > 0 ? (totals.putOI / totals.callOI).toFixed(2) : "-";
  const pcrCOI = totals.callCOI > 0 ? (totals.putCOI / totals.callCOI).toFixed(2) : "-";
  const pcrVol = totals.callVolume > 0 ? (totals.putVolume / totals.callVolume).toFixed(2) : "-";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <ProFeatureGate featureName="Support & Resistance Analysis">
        <main className="flex-1 p-2 md:p-4">
          <MarketClosedBanner />
          <div className="flex justify-end mb-2">
            <LastRefreshBadge lastRefresh={lastRefresh} isFetching={loading} />
            <PageInfoButton
              title="Support & Resistance"
              description="Derives intraday support and resistance levels from Call and Put OI concentrations at each strike."
              details={[
                { label: "Strong Resistance", text: "Strike with the highest Call OI — heaviest call writing, hardest ceiling", color: "#dc2626" },
                { label: "Resistance", text: "Strike with the 2nd-highest Call OI — secondary supply zone", color: "#f87171" },
                { label: "Current Spot", text: "Live index / stock price, plotted between the S/R bands", color: "#e5e7eb" },
                { label: "Support", text: "Strike with the 2nd-highest Put OI — secondary demand zone", color: "#34d399" },
                { label: "Strong Support", text: "Strike with the highest Put OI — heaviest put writing, hardest floor", color: "#059669" },
                { label: "How to use", text: "Trade the range between Strong Support and Strong Resistance. A decisive close beyond either usually triggers OI unwinding and a fast move to the next OI wall." },
              ]}
            />
          </div>
          {/* Header Controls */}
        <Card className="mb-4 bg-card border-border">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              {/* Symbol Select */}
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-32 md:w-40 bg-muted border-border text-xs md:text-sm">
                  <SelectValue placeholder="Symbol" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-popover">
                  {indexSymbols.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50">INDEX</div>
                      {indexSymbols.map((sym) => (
                        <SelectItem key={sym} value={sym}>
                          {sym}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {stockSymbols.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50 mt-1">STOCKS</div>
                      {stockSymbols.map((sym) => (
                        <SelectItem key={sym} value={sym}>
                          {sym}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>

              {/* Expiry Select */}
              <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
                <SelectTrigger className="w-28 md:w-36 bg-muted border-border text-xs md:text-sm">
                  <SelectValue placeholder="Expiry" />
                </SelectTrigger>
                <SelectContent>
                  {expiryDates.map((date) => (
                    <SelectItem key={date} value={date}>
                      {date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Live/Historical Toggle */}
              <Button variant={isLive ? "default" : "outline"} size="sm" onClick={toggleLiveMode} className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {isLive ? "Live" : "Historical"}
              </Button>

              {/* Historical Time Controls */}
              {!isLive && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleTimeChange("prev")}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-medium px-2 bg-muted rounded py-1 min-w-[70px] text-center">
                    {formatTimeDisplay(historicalTime)}
                  </span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleTimeChange("next")}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Refresh */}
              <Button variant="outline" size="sm" onClick={fetchOptionChain} disabled={loading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden md:inline">Refresh</span>
              </Button>

              {/* Settings */}
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-3 w-3" />
              </Button>

              {/* Table Style Settings (Admin Only) */}
              <AdminPaletteButton />

              {/* Info/Guide */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInfoOpen(true)}
                className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
              >
                <Info className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Resistance Chart */}
        <div className="mb-4">
          <SupportResistanceChart symbol={selectedSymbol} expiry={selectedExpiry} />
        </div>

        {/* Main Table */}
        <div className="overflow-auto max-h-[450px] bg-card rounded-lg border border-border">
          <Table className="w-full text-xs">
            <TableHeader className="sticky top-0">
              {/* Header Row 1 - CALL | IDV | PUT */}
              <TableRow className="border-b border-border">
                <TableHead
                  colSpan={6}
                  className="bg-red-800 text-white text-center cursor-pointer hover:bg-red-700 transition-colors"
                  onClick={() => setShiftingOpen(true)}
                >
                  CALL | Resistance: {levels.resistance}
                </TableHead>
                <TableHead className="bg-indigo-900 text-white text-center">IDV: -</TableHead>
                <TableHead
                  colSpan={6}
                  className="bg-green-800 text-white text-center cursor-pointer hover:bg-green-700 transition-colors"
                  onClick={() => setShiftingOpen(true)}
                >
                  PUT | Support: {levels.support}
                </TableHead>
              </TableRow>

              {/* Header Row 2 - Column headers */}
              <TableRow className="bg-muted text-[10px] md:text-xs">
                <TableHead className="text-center p-1 md:p-2">DELTA IV</TableHead>
                <TableHead className="text-center p-1 md:p-2">COI</TableHead>
                <TableHead className="text-center p-1 md:p-2">OI</TableHead>
                <TableHead className="text-center p-1 md:p-2">VOLUME</TableHead>
                <TableHead className="text-center p-1 md:p-2">LTP</TableHead>
                <TableHead className="text-center p-1 md:p-2">S LEV</TableHead>
                <TableHead className="text-center p-1 md:p-2 bg-indigo-900/50">STRIKE PCR</TableHead>
                <TableHead className="text-center p-1 md:p-2">S LEV</TableHead>
                <TableHead className="text-center p-1 md:p-2">LTP</TableHead>
                <TableHead className="text-center p-1 md:p-2">VOLUME</TableHead>
                <TableHead className="text-center p-1 md:p-2">OI</TableHead>
                <TableHead className="text-center p-1 md:p-2">COI</TableHead>
                <TableHead className="text-center p-1 md:p-2">DELTA IV</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 13 }).map((_, j) => (
                        <TableCell key={j} className="p-1">
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : filteredData.map((row, idx) => {
                    const isCallITM = row.strike_price < spotPrice;
                    const isPutITM = row.strike_price > spotPrice;
                    const isSpotRow =
                      idx > 0 && filteredData[idx - 1]?.strike_price < spotPrice && row.strike_price > spotPrice;

                    const callCOI = row.call_options.market_data.oi - row.call_options.market_data.prev_oi;
                    const putCOI = row.put_options.market_data.oi - row.put_options.market_data.prev_oi;
                    const pcrOfCoi = callCOI !== 0 ? (putCOI / callCOI).toFixed(2) : "-";

                    const callOIPercent =
                      topCallOIs[0] > 0 ? ((row.call_options.market_data.oi / topCallOIs[0]) * 100).toFixed(1) : "0";
                    const putOIPercent =
                      topPutOIs[0] > 0 ? ((row.put_options.market_data.oi / topPutOIs[0]) * 100).toFixed(1) : "0";
                    const callVolPercent =
                      topCallVolumes[0] > 0
                        ? ((row.call_options.market_data.volume / topCallVolumes[0]) * 100).toFixed(1)
                        : "0";
                    const putVolPercent =
                      topPutVolumes[0] > 0
                        ? ((row.put_options.market_data.volume / topPutVolumes[0]) * 100).toFixed(1)
                        : "0";
                    const callCOIPercent = topCallCOIs[0] > 0 ? ((callCOI / topCallCOIs[0]) * 100).toFixed(1) : "0";
                    const putCOIPercent = topPutCOIs[0] > 0 ? ((putCOI / topPutCOIs[0]) * 100).toFixed(1) : "0";

                    return (
                      <>
                        {isSpotRow && (
                          <TableRow key={`spot-${idx}`} className="border-y-2 border-red-500">
                            <TableCell colSpan={13} className="p-0">
                              <div className="flex justify-between items-center bg-card/80 px-4 py-2">
                                <span className="text-xs text-muted-foreground">
                                  OI: {((totals.putOI / (totals.callOI + totals.putOI)) * 100).toFixed(1)}%
                                </span>
                                <span className="bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold">
                                  SPOT: {spotPrice.toFixed(2)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  OI: {((totals.callOI / (totals.callOI + totals.putOI)) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}

                        <TableRow key={row.strike_price} className="hover:bg-muted/20">
                          {/* CALL Side */}
                          <TableCell className={`p-1 text-center ${isCallITM ? "bg-red-950/30" : ""}`}>
                            <div className="font-semibold">{row.call_options.option_greeks.delta}</div>
                            <div className="text-muted-foreground text-[9px]">
                              {row.call_options.option_greeks.iv?.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell
                            className={`p-1 text-center ${isCallITM ? "bg-red-950/30" : ""} ${getHighlightClass(callCOI, topCallCOIs, false).bg}`}
                          >
                            <div
                              className={`font-medium ${getHighlightClass(callCOI, topCallCOIs, false).isHighlighted ? "text-white" : callCOI < 0 ? "text-red-400" : ""}`}
                            >
                              {formatValue(callCOI)}
                            </div>
                            <div
                              className={`text-[9px] ${getHighlightClass(callCOI, topCallCOIs, false).isHighlighted ? "text-white/80" : "text-muted-foreground"}`}
                            >
                              {callCOIPercent}%
                            </div>
                          </TableCell>
                          <TableCell
                            className={`p-1 text-center ${isCallITM ? "bg-red-950/30" : ""} ${getHighlightClass(row.call_options.market_data.oi, topCallOIs, false).bg}`}
                          >
                            <div
                              className={`font-medium ${getHighlightClass(row.call_options.market_data.oi, topCallOIs, false).isHighlighted ? "text-white" : ""}`}
                            >
                              {formatValue(row.call_options.market_data.oi)}
                            </div>
                            <div
                              className={`text-[9px] ${getHighlightClass(row.call_options.market_data.oi, topCallOIs, false).isHighlighted ? "text-white/80" : "text-muted-foreground"}`}
                            >
                              {callOIPercent}%
                            </div>
                          </TableCell>
                          <TableCell
                            className={`p-1 text-center ${isCallITM ? "bg-red-950/30" : ""} ${getHighlightClass(row.call_options.market_data.volume, topCallVolumes, false).bg}`}
                          >
                            <div
                              className={`font-medium ${getHighlightClass(row.call_options.market_data.volume, topCallVolumes, false).isHighlighted ? "text-white" : ""}`}
                            >
                              {formatValue(row.call_options.market_data.volume)}
                            </div>
                            <div
                              className={`text-[9px] ${getHighlightClass(row.call_options.market_data.volume, topCallVolumes, false).isHighlighted ? "text-white/80" : "text-muted-foreground"}`}
                            >
                              {callVolPercent}%
                            </div>
                          </TableCell>
                          <TableCell className={`p-1 text-center ${isCallITM ? "bg-red-950/30" : ""}`}>
                            {row.call_options.market_data.ltp}
                          </TableCell>
                          <TableCell
                            className={`p-1 text-center ${isCallITM ? "bg-red-950/30 text-red-400" : "text-amber-400"}`}
                          >
                            {calculateReversalValue(
                              row.strike_price,
                              row.call_options.option_greeks.delta || 0,
                              row.call_options.option_greeks.theta || 0,
                              row.call_options.option_greeks.gamma || 0,
                              row.call_options.option_greeks.vega || 0,
                              strikeDiff
                            )}
                          </TableCell>

                          {/* Strike Price Center - Clickable */}
                          <TableCell
                            className="p-1 text-center bg-indigo-900/30 font-bold cursor-pointer hover:bg-indigo-800/50 transition-colors"
                            onClick={() => handleStrikeClick(row)}
                          >
                            <div className="hover:text-amber-400 transition-colors">{row.strike_price}</div>
                            <div className="text-[9px] text-muted-foreground">
                              {row.pcr?.toFixed(2)} ({pcrOfCoi})
                            </div>
                          </TableCell>

                          {/* PUT Side */}
                          <TableCell
                            className={`p-1 text-center ${isPutITM ? "bg-emerald-950/30 text-green-400" : "text-amber-400"}`}
                          >
                            {calculateSupportValue(
                              row.strike_price,
                              row.put_options.option_greeks.delta || 0,
                              row.put_options.option_greeks.theta || 0,
                              row.put_options.option_greeks.gamma || 0,
                              row.put_options.option_greeks.vega || 0,
                              strikeDiff
                            )}
                          </TableCell>
                          <TableCell className={`p-1 text-center ${isPutITM ? "bg-emerald-950/30" : ""}`}>
                            {row.put_options.market_data.ltp}
                          </TableCell>
                          <TableCell
                            className={`p-1 text-center ${isPutITM ? "bg-emerald-950/30" : ""} ${getHighlightClass(row.put_options.market_data.volume, topPutVolumes, true).bg}`}
                          >
                            <div
                              className={`font-medium ${getHighlightClass(row.put_options.market_data.volume, topPutVolumes, true).isHighlighted ? "text-white" : ""}`}
                            >
                              {formatValue(row.put_options.market_data.volume)}
                            </div>
                            <div
                              className={`text-[9px] ${getHighlightClass(row.put_options.market_data.volume, topPutVolumes, true).isHighlighted ? "text-white/80" : "text-muted-foreground"}`}
                            >
                              {putVolPercent}%
                            </div>
                          </TableCell>
                          <TableCell
                            className={`p-1 text-center ${isPutITM ? "bg-emerald-950/30" : ""} ${getHighlightClass(row.put_options.market_data.oi, topPutOIs, true).bg}`}
                          >
                            <div
                              className={`font-medium ${getHighlightClass(row.put_options.market_data.oi, topPutOIs, true).isHighlighted ? "text-white" : ""}`}
                            >
                              {formatValue(row.put_options.market_data.oi)}
                            </div>
                            <div
                              className={`text-[9px] ${getHighlightClass(row.put_options.market_data.oi, topPutOIs, true).isHighlighted ? "text-white/80" : "text-muted-foreground"}`}
                            >
                              {putOIPercent}%
                            </div>
                          </TableCell>
                          <TableCell
                            className={`p-1 text-center ${isPutITM ? "bg-emerald-950/30" : ""} ${getHighlightClass(putCOI, topPutCOIs, true).bg}`}
                          >
                            <div
                              className={`font-medium ${getHighlightClass(putCOI, topPutCOIs, true).isHighlighted ? "text-white" : putCOI < 0 ? "text-red-400" : ""}`}
                            >
                              {formatValue(putCOI)}
                            </div>
                            <div
                              className={`text-[9px] ${getHighlightClass(putCOI, topPutCOIs, true).isHighlighted ? "text-white/80" : "text-muted-foreground"}`}
                            >
                              {putCOIPercent}%
                            </div>
                          </TableCell>
                          <TableCell className={`p-1 text-center ${isPutITM ? "bg-emerald-950/30" : ""}`}>
                            <div className="font-semibold">{row.put_options.option_greeks.delta}</div>
                            <div className="text-muted-foreground text-[9px]">
                              {row.put_options.option_greeks.iv?.toFixed(2)}
                            </div>
                          </TableCell>
                        </TableRow>
                      </>
                    );
                  })}

              {/* Footer Totals */}
              {!loading && filteredData.length > 0 && (
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell className="p-1 text-center"></TableCell>
                  <TableCell className="p-1 text-center bg-red-900/50 text-red-400">
                    {formatValue(totals.callCOI)}
                  </TableCell>
                  <TableCell className="p-1 text-center bg-red-900/50">{formatValue(totals.callOI)}</TableCell>
                  <TableCell className="p-1 text-center bg-red-900/50">{formatValue(totals.callVolume)}</TableCell>
                  <TableCell className="p-1 text-center"></TableCell>
                  <TableCell className="p-1 text-center"></TableCell>
                  <TableCell className="p-1 text-center bg-indigo-900/50">Total</TableCell>
                  <TableCell className="p-1 text-center"></TableCell>
                  <TableCell className="p-1 text-center"></TableCell>
                  <TableCell className="p-1 text-center bg-green-900/50">{formatValue(totals.putVolume)}</TableCell>
                  <TableCell className="p-1 text-center bg-green-900/50">{formatValue(totals.putOI)}</TableCell>
                  <TableCell className="p-1 text-center bg-green-900/50">{formatValue(totals.putCOI)}</TableCell>
                  <TableCell className="p-1 text-center"></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Bar */}
        <div className="mt-4 flex flex-wrap gap-2 p-3 bg-amber-950/50 border border-amber-800 rounded-lg">
          {[
            { label: "T.V CE", value: "98.52%" },
            { label: "T.V PE", value: "1.48%" },
            { label: "LTP CE", value: "78.03%" },
            { label: "LTP PE", value: "21.97%" },
            { label: "PCR Vol", value: pcrVol },
            { label: "PCR OI", value: pcrOI },
            { label: "PCR COI", value: pcrCOI },
            { label: "Lot Size", value: lotSize.toString() },
            { label: "Max Pain", value: levels.resistance.toString() },
          ].map((item, i) => (
            <div key={i} className="flex-1 min-w-[80px] text-center border-r border-amber-800 last:border-r-0 px-2">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="text-sm font-semibold">{item.value}</div>
            </div>
          ))}
        </div>

        {/* PCR Info */}
        <div className="mt-4 p-4 bg-yellow-950/30 border border-yellow-800/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            The Put-Call Ratio (PCR) helps in determining market sentiment.
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <span className="text-green-400">PCR &gt; 1.2 - Bullish Market</span>
            <span className="text-red-400">PCR &lt; 0.8 - Bearish Market</span>
            <span className="text-yellow-400">PCR 0.8-1.2 - Neutral Market</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          ▲ Disclaimer: The information and tools provided are for educational and informational purposes only.
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-amber-500">Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Strikes to show (ATM up/down):</Label>
              <Input
                type="number"
                value={strikeCount}
                onChange={(e) => setStrikeCount(parseInt(e.target.value) || 10)}
                className="w-20"
                min={1}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>COI, OI & Volume as:</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={displayAsLots ? "default" : "outline"}
                  onClick={() => setDisplayAsLots(true)}
                >
                  Lots
                </Button>
                <Button
                  size="sm"
                  variant={!displayAsLots ? "default" : "outline"}
                  onClick={() => setDisplayAsLots(false)}
                >
                  Quantity
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Lot Size:</Label>
              <Input
                type="number"
                value={lotSize}
                onChange={(e) => setLotSize(parseInt(e.target.value) || 75)}
                className="w-20"
                min={1}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Number of Highlights:</Label>
              <Select value={highlightCount.toString()} onValueChange={(v) => setHighlightCount(parseInt(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Highlight Percentage:</Label>
              <Input
                type="number"
                value={highlightPercentage}
                onChange={(e) => setHighlightPercentage(parseFloat(e.target.value) || 74.99)}
                className="w-24"
                min={0}
                max={100}
                step={0.01}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Rows will be highlighted if their value is greater than this percentage of the maximum value
            </p>
            <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => setSettingsOpen(false)}>
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shifting Modal */}
      <Dialog open={shiftingOpen} onOpenChange={setShiftingOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-amber-500">All Shiftings</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {shiftingLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : shiftingData.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No shifts detected for this session
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TIME</TableHead>
                    <TableHead className="bg-red-900">CALL SHIFT</TableHead>
                    <TableHead className="bg-green-900">PUT SHIFT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftingData.map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{entry.time}</TableCell>
                      <TableCell className={entry.callShift !== "-" ? "text-red-400 font-medium" : "text-muted-foreground"}>
                        {entry.callShift}
                      </TableCell>
                      <TableCell className={entry.putShift !== "-" ? "text-green-400 font-medium" : "text-muted-foreground"}>
                        {entry.putShift}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* LTP Calculator Modal */}
      {selectedStrikeData && (
        <LTPCalculatorModal
          open={ltpModalOpen}
          onOpenChange={setLtpModalOpen}
          strikePrice={selectedStrikeData.strike_price}
          spotPrice={spotPrice}
          callLTP={selectedStrikeData.call_options.market_data.ltp}
          putLTP={selectedStrikeData.put_options.market_data.ltp}
          callIV={selectedStrikeData.call_options.option_greeks.iv}
          putIV={selectedStrikeData.put_options.option_greeks.iv}
          callDelta={selectedStrikeData.call_options.option_greeks.delta}
          putDelta={selectedStrikeData.put_options.option_greeks.delta}
          atr={strikeDiff}
          expiry={selectedExpiry}
        />
      )}

      {/* Info/Guide Modal */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-amber-500 text-xl flex items-center gap-2">
              <Info className="h-5 w-5" />
              RunAlgo Option Chain – Page Use Guide
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6 text-sm">
              {/* Option Writer Perspective */}
              <div className="p-4 bg-gradient-to-r from-amber-950/50 to-transparent border-l-4 border-amber-500 rounded">
                <h3 className="font-bold text-amber-400 mb-2">📊 Data from an Option Writer's Perspective</h3>
                <p className="text-muted-foreground">
                  On this page, we view option chain data from an option writer's perspective. If the Call side OI, COI
                  and Volume are higher than the Put side, we consider this as{" "}
                  <span className="text-red-400 font-semibold">Bearish Sentiment</span> because if there are more Call
                  Writers, they won't let the market go up.
                </p>
              </div>

              {/* Highlighting Logic */}
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <h3 className="font-bold text-primary mb-3">🎯 Highlighting Logic</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    • We highlight the strike with <span className="text-white">Highest OI/COI/Volume</span>{" "}
                    (Support/Resistance 1)
                  </li>
                  <li>
                    • We also highlight the <span className="text-amber-400">Second Highest</span> if it's 75%+ of the
                    first (Support/Resistance 2)
                  </li>
                  <li>• You can highlight more than 2 by changing settings</li>
                  <li>
                    • <span className="bg-red-700 px-2 py-0.5 rounded text-white text-xs">Red</span> = Call side
                    (Resistance)
                  </li>
                  <li>
                    • <span className="bg-green-700 px-2 py-0.5 rounded text-white text-xs">Green</span> = Put side
                    (Support)
                  </li>
                </ul>
              </div>

              {/* First 10 Seconds */}
              <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-800/50">
                <h3 className="font-bold text-blue-400 mb-3">
                  1️⃣ What to Look at When Opening the Page (First 10 Seconds)
                </h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Index / Symbol (NIFTY / BANKNIFTY)</li>
                  <li>• ATM Strike (the middle strike)</li>
                  <li>• Support Side (PUT – Red)</li>
                  <li>• Resistance Side (CALL – Green)</li>
                  <li>• Powered by NSE / Live MTM Update</li>
                </ul>
                <p className="mt-2 text-amber-400 text-xs">👉 Goal: Read strength, not just levels</p>
              </div>

              {/* Support-Resistance */}
              <div className="p-4 bg-gradient-to-r from-red-950/30 via-transparent to-green-950/30 rounded-lg border border-border">
                <h3 className="font-bold text-primary mb-3">2️⃣ How to Identify Support & Resistance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-red-900/30 rounded">
                    <span className="text-red-400 font-bold">🔴 Red / PUT side</span>
                    <p className="text-xs text-muted-foreground mt-1">= Support Zone</p>
                  </div>
                  <div className="text-center p-3 bg-green-900/30 rounded">
                    <span className="text-green-400 font-bold">🟢 Green / CALL side</span>
                    <p className="text-xs text-muted-foreground mt-1">= Resistance Zone</p>
                  </div>
                </div>
              </div>

              {/* Strength Labels */}
              <div className="p-4 bg-purple-950/30 rounded-lg border border-purple-800/50">
                <h3 className="font-bold text-purple-400 mb-3">3️⃣ How to Read Strength Labels (Most Important)</h3>
                <p className="text-muted-foreground mb-3">Pay attention to the text written above each strike:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-green-900/30 rounded">SUPPORT STRONG</div>
                  <div className="p-2 bg-amber-900/30 rounded">SUPPORT WTT / WTB</div>
                  <div className="p-2 bg-red-900/30 rounded">RESISTANCE STRONG</div>
                  <div className="p-2 bg-amber-900/30 rounded">RESISTANCE WTT / WTB</div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="text-green-400 font-semibold">STRONG</span> → Pressure is holding
                  </p>
                  <p>
                    <span className="text-amber-400 font-semibold">WTB</span> (Weak Towards Bottom) → Ready to break
                    down
                  </p>
                  <p>
                    <span className="text-amber-400 font-semibold">WTT</span> (Weak Towards Top) → Pressure from above
                    is reducing
                  </p>
                </div>
              </div>

              {/* State of Confusion */}
              <div className="p-4 bg-yellow-950/30 rounded-lg border border-yellow-800/50">
                <h3 className="font-bold text-yellow-400 mb-3">4️⃣ How to Identify State of Confusion</h3>
                <div className="bg-yellow-900/20 p-3 rounded mb-3">
                  <p className="font-semibold text-yellow-300">🔑 Golden Rule:</p>
                  <p className="text-muted-foreground">Confusion always occurs on the WEAK side</p>
                </div>
                <p className="text-muted-foreground text-xs">
                  <span className="text-yellow-400">How to identify:</span> One side STRONG, other side WTT/WTB → State
                  of Confusion is ACTIVE on that weak side
                </p>
                <p className="text-red-400 text-xs mt-2">⚠️ Assuming confusion on the Strong side is a mistake</p>
              </div>

              {/* Percentage Panel */}
              <div className="p-4 bg-indigo-950/30 rounded-lg border border-indigo-800/50">
                <h3 className="font-bold text-indigo-400 mb-3">5️⃣ How to Use the Percentage Panel</h3>
                <p className="text-muted-foreground mb-2">When is Confusion VALID?</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• % remains stable for 1 hour</li>
                  <li>• Or oscillates for 2 hours (75↔80)</li>
                  <li>• Or repeated up-down for 3 hours</li>
                </ul>
                <div className="mt-3 flex gap-2 text-xs">
                  <span className="text-red-400">❌ Not possible on NSE site</span>
                  <span className="text-green-400">✅ Visible in real-time on RunAlgo</span>
                </div>
              </div>

              {/* Trade Entry */}
              <div className="p-4 bg-gradient-to-r from-green-950/50 to-emerald-950/30 rounded-lg border border-green-800/50">
                <h3 className="font-bold text-green-400 mb-3">6️⃣ When to Take a Trade (Most Important Part)</h3>
                <div className="bg-red-900/30 p-3 rounded mb-3">
                  <p className="text-red-400 font-semibold text-center">⚠️ Confusion ≠ Entry</p>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="font-semibold text-amber-400 mb-1">If Confusion is on Resistance Side:</p>
                    <p className="text-muted-foreground">
                      Market will first fall → It will come to PUT extension (like 24150/24140) →{" "}
                      <span className="text-green-400 font-semibold">BUY CALL</span> from there
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="font-semibold text-amber-400 mb-1">If Confusion is on Support Side:</p>
                    <p className="text-muted-foreground">
                      Market will first go up → It will touch CALL extension (like 24300+) →{" "}
                      <span className="text-red-400 font-semibold">BUY PUT</span> from there
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Example */}
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
                <h3 className="font-bold text-slate-300 mb-3">7️⃣ Live Example</h3>
                <div className="p-3 bg-slate-900/50 rounded text-xs font-mono">
                  <p className="text-amber-400">"Market is currently at 24275, RunAlgo is showing:</p>
                  <p className="text-green-400 ml-4">• Support STRONG</p>
                  <p className="text-red-400 ml-4">• Resistance WTB (94 mins)</p>
                  <p className="text-white mt-2">This means confusion is on the CALL side.</p>
                  <p className="text-muted-foreground mt-2">
                    I won't take a trade now.
                    <br />I will wait for the market to come to 24150 extension.
                    <br />I will buy CALL from there."
                  </p>
                </div>
              </div>

              {/* Common Mistakes */}
              <div className="p-4 bg-red-950/30 rounded-lg border border-red-800/50">
                <h3 className="font-bold text-red-400 mb-3">8️⃣ Common User Mistakes (What NOT to do on this Page)</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-red-900/30 rounded flex items-center gap-2">
                    <span className="text-red-500">❌</span> Trading immediately when Confusion appears
                  </div>
                  <div className="p-2 bg-red-900/30 rounded flex items-center gap-2">
                    <span className="text-red-500">❌</span> Entry in the middle of the market
                  </div>
                  <div className="p-2 bg-red-900/30 rounded flex items-center gap-2">
                    <span className="text-red-500">❌</span> Ignoring Percentage data
                  </div>
                  <div className="p-2 bg-red-900/30 rounded flex items-center gap-2">
                    <span className="text-red-500">❌</span> Not waiting for Extension
                  </div>
                </div>
              </div>

              {/* Page Flow */}
              <div className="p-4 bg-cyan-950/30 rounded-lg border border-cyan-800/50">
                <h3 className="font-bold text-cyan-400 mb-3">9️⃣ Correct Flow for Using this Page</h3>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Look at ATM and strikes</li>
                  <li>Identify Support / Resistance</li>
                  <li>Read Strength labels</li>
                  <li>Note confusion on Weak side</li>
                  <li>Confirm Percentage behavior</li>
                  <li>Wait for Extension level</li>
                  <li>Then plan your trade</li>
                </ol>
              </div>

              {/* Why RunAlgo */}
              <div className="p-4 bg-gradient-to-r from-amber-950/50 to-yellow-950/30 rounded-lg border border-amber-800/50">
                <h3 className="font-bold text-amber-400 mb-3">🔟 What is the Advantage of this Tool? (Why RunAlgo?)</h3>
                <div className="grid md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-red-900/20 rounded">
                    <p className="text-red-400 font-semibold mb-2">❌ Normal Option Chain (NSE / Public)</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Only Volume and OI numbers</li>
                      <li>• Percentage not shown</li>
                      <li>• Strength/Weakness not clear</li>
                      <li>• State of Confusion impossible to identify</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-green-900/20 rounded">
                    <p className="text-green-400 font-semibold mb-2">✅ RunAlgo Option Chain Tool</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Live MTM (updates with market)</li>
                      <li>• Volume + OI percentage share</li>
                      <li>• Clear labels: STRONG / WTT / WTB</li>
                      <li>• Confusion side directly identified</li>
                      <li>• Saves you from emotional trading</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <h3 className="font-bold text-slate-400 mb-2">⚠️ Important Disclaimer</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>❌ This tool does NOT give direct BUY/SELL signals</li>
                  <li>❌ It does NOT guarantee that you will get a trade</li>
                  <li>✅ This tool shows market pressure and intention</li>
                  <li>✅ Take a trade when the market touches extension level</li>
                </ul>
              </div>

              {/* Philosophy */}
              <div className="p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-lg border border-amber-500/30 text-center">
                <p className="text-amber-400 font-bold text-lg mb-2">RunAlgo Core Philosophy</p>
                <p className="text-muted-foreground italic">
                  "RunAlgo is not an indicator — It's an X-ray of the market"
                </p>
                <p className="text-xs text-muted-foreground mt-3">Take a trade when the market gives you room</p>
              </div>

              {/* Final Summary */}
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                <h3 className="font-bold text-primary mb-3">📌 Final Summary</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Confusion is a signal, not an entry</li>
                  <li>• Strong side is safe</li>
                  <li>• Weak side can become an opportunity</li>
                  <li>• Don't trade without touching Extension</li>
                  <li>• Market ko follow karo, force mat karo</li>
                </ul>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </ProFeatureGate>
    </div>
  );
};

export default SupportResistance;
