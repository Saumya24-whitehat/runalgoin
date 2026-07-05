import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Helmet } from "react-helmet";
import { PageLayout } from "@/components/PageLayout";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { PageInfoModal } from "@/components/PageInfoModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Check, ChevronsUpDown, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Activity,
  Zap,
  Gauge,
  LineChart,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  DollarSign,
  Percent,
  Scale,
} from "lucide-react";
import { GroupedSymbols } from "@/types/optionChain";
import { MarketBreadthCard } from "@/components/optionsSummary/MarketBreadthCard";
import { SummaryOTRChart } from "@/components/optionsSummary/SummaryOTRChart";
import { SpotVsVWAPChart } from "@/components/optionsSummary/SpotVsVWAPChart";
import { SummarySupportResistanceChart } from "@/components/optionsSummary/SummarySupportResistanceChart";
import { IndexOIProfileChart } from "@/components/optionsSummary/IndexOIProfileChart";

interface SummaryData {
  // Basic Info
  symbol: string;
  spotPrice: number;
  futurePrice: number;
  vwap: number;
  atm: number;
  lastUpdated: string;

  // Max Pain
  maxPain: number;
  maxPainDiff: number;
  maxPainDiffPercent: number;

  // PCR Data
  pcrOI: number;
  pcrCOI: number;
  totalCEOI: number;
  totalPEOI: number;
  totalCECOI: number;
  totalPECOI: number;

  // OTR Data
  combinedPcrOI: number;
  combinedPcrCOI: number;

  // Sentiment
  sentiment: "bullish" | "bearish" | "neutral";
  sentimentStrength: "strong" | "moderate" | "weak";

  // Trend
  oiDiff: number;
  coiDiff: number;
  trend: string;
}

const OptionsSummary = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Symbol & Expiry state
  const [symbols, setSymbols] = useState<GroupedSymbols>({ indexSymbols: [], stockSymbols: [] });
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");

  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");

  // Summary data state
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const isInitialFetch = useRef(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch symbols on mount
  useEffect(() => {
    const fetchSymbols = async () => {
      setLoadingSymbols(true);
      try {
        const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
          body: { endpoint: "symbols" },
        });

        if (error) throw error;

        setSymbols({
          indexSymbols: data["index symbols"] || [],
          stockSymbols: data.symbols || [],
        });

        // Default to first index symbol
        if (data["index symbols"]?.length > 0) {
          setSelectedSymbol(data["index symbols"][0]);
        }
      } catch (err) {
        console.error("Error fetching symbols:", err);
      } finally {
        setLoadingSymbols(false);
      }
    };

    if (user) {
      fetchSymbols();
    }
  }, [user]);

  // Fetch expiry dates when symbol changes
  useEffect(() => {
    const fetchExpiry = async () => {
      if (!selectedSymbol) return;

      setLoadingExpiry(true);
      setExpiryDates([]);
      setSelectedExpiry("");

      try {
        const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
          body: { endpoint: "expiry", params: { symbol: selectedSymbol } },
        });

        if (error) throw error;

        const dates = data?.expiry_dates || [];
        setExpiryDates(dates);
        if (dates.length > 0) {
          setSelectedExpiry(dates[0]);
        }
      } catch (err) {
        console.error("Error fetching expiry dates:", err);
      } finally {
        setLoadingExpiry(false);
      }
    };

    fetchExpiry();
  }, [selectedSymbol]);

  // Fetch all summary data
  const fetchAllData = useCallback(async () => {
    if (!selectedSymbol || !selectedExpiry) return;

    // Only show loading on initial fetch
    if (isInitialFetch.current) {
      setLoading(true);
    }

    try {
      // Fetch all data in parallel with correct payloads
      const [pcrResult, maxPainResult, otrResult] = await Promise.all([
        supabase.functions.invoke("pcr-data", {
          body: {
            symbol: selectedSymbol,
            expiry_date: selectedExpiry,
            strikeCount: 7,
          },
        }),
        supabase.functions.invoke("maxpain-data", {
          body: {
            symbol: selectedSymbol,
            expiry_date: selectedExpiry,
            tf: "1min",
          },
        }),
        supabase.functions.invoke("otr-data", {
          body: {
            symbol: selectedSymbol,
            expiry: selectedExpiry,
            strikeCount: 7,
            tf: "1min",
          },
        }),
      ]);

      const pcrData = pcrResult.data;
      const maxPainData = maxPainResult.data;
      const otrData = otrResult.data;

      // Get latest entries
      const latestPCR = pcrData?.dataWhole?.[pcrData.dataWhole.length - 1];
      const latestMaxPain = maxPainData?.DataWhole?.[maxPainData.DataWhole.length - 1];
      const latestOTR = otrData?.data?.[otrData.data.length - 1];

      if (!latestPCR && !latestMaxPain) {
        setSummaryData(null);
        return;
      }

      const spotPrice = latestPCR?.underlyning || latestMaxPain?.index || latestOTR?.Spot_Price || 0;
      const maxPain = latestMaxPain?.maxPainStrike || 0;
      const pcrOI = latestPCR?.PCR_OI || 0;
      const pcrCOI = latestPCR?.PCR_COI || 0;

      // Calculate sentiment based on PCR COI (Change in Open Interest)
      let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
      let sentimentStrength: "strong" | "moderate" | "weak" = "weak";

      // Sentiment based on PCR COI - more Put writing = bullish, more Call writing = bearish
      if (pcrCOI > 1.5) {
        sentiment = "bullish";
        sentimentStrength = pcrCOI > 2.0 ? "strong" : "moderate";
      } else if (pcrCOI < 0.5) {
        sentiment = "bearish";
        sentimentStrength = pcrCOI < 0.3 ? "strong" : "moderate";
      } else if (pcrCOI > 1.1) {
        sentiment = "bullish";
        sentimentStrength = "weak";
      } else if (pcrCOI < 0.9) {
        sentiment = "bearish";
        sentimentStrength = "weak";
      }

      // Calculate trend based on COI
      const ceCOI = latestPCR?.CE_COI || 0;
      const peCOI = latestPCR?.PE_COI || 0;
      const coiDiff = peCOI - ceCOI;
      let trend = "Neutral";
      if (coiDiff > 500000) trend = "Long Buildup";
      else if (coiDiff < -500000) trend = "Short Buildup";
      else if (coiDiff > 100000) trend = "Mild Bullish";
      else if (coiDiff < -100000) trend = "Mild Bearish";

      const maxPainDiff = spotPrice - maxPain;
      const maxPainDiffPercent = maxPain ? ((maxPainDiff / maxPain) * 100) : 0;

      setSummaryData({
        symbol: selectedSymbol,
        spotPrice,
        futurePrice: latestPCR?.Future || spotPrice,
        vwap: latestPCR?.VWAP || spotPrice,
        atm: latestPCR?.atm || latestMaxPain?.atm || 0,
        lastUpdated: latestPCR?.time || latestMaxPain?.Time || "",

        maxPain,
        maxPainDiff,
        maxPainDiffPercent,

        pcrOI,
        pcrCOI,
        totalCEOI: latestPCR?.CE_OI || latestOTR?.Total_Call_OI || 0,
        totalPEOI: latestPCR?.PE_OI || latestOTR?.Total_Put_OI || 0,
        totalCECOI: latestPCR?.CE_COI || latestOTR?.Total_Call_COI || 0,
        totalPECOI: latestPCR?.PE_COI || latestOTR?.Total_Put_COI || 0,

        combinedPcrOI: latestOTR?.Combined_PCR_OI || pcrOI,
        combinedPcrCOI: latestOTR?.Combined_PCR_COI || pcrCOI,

        sentiment,
        sentimentStrength,

        oiDiff: (latestPCR?.PE_OI || 0) - (latestPCR?.CE_OI || 0),
        coiDiff,
        trend,
      });

      setLastRefresh(new Date());
    } catch (err) {
      console.error(`Error fetching data:`, err);
      if (isInitialFetch.current) {
        setSummaryData(null);
      }
    } finally {
      if (isInitialFetch.current) {
        setLoading(false);
        isInitialFetch.current = false;
      }
    }
  }, [selectedSymbol, selectedExpiry]);

  // Auto-fetch when symbol/expiry changes with auto-refresh
  useEffect(() => {
    // Reset initial fetch flag when symbol/expiry changes
    isInitialFetch.current = true;
    fetchAllData();
    
    // Auto-refresh every 3 minutes
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Filtered symbols for search
  const filteredIndexSymbols = useMemo(() => {
    if (!symbols.indexSymbols) return [];
    if (!symbolSearch) return symbols.indexSymbols;
    return symbols.indexSymbols.filter((symbol) =>
      symbol.toLowerCase().includes(symbolSearch.toLowerCase())
    );
  }, [symbols.indexSymbols, symbolSearch]);

  const filteredStockSymbols = useMemo(() => {
    if (!symbols.stockSymbols) return [];
    if (!symbolSearch) return symbols.stockSymbols.slice(0, 50);
    return symbols.stockSymbols
      .filter((symbol) => symbol.toLowerCase().includes(symbolSearch.toLowerCase()))
      .slice(0, 50);
  }, [symbols.stockSymbols, symbolSearch]);

  const hasResults = filteredIndexSymbols.length > 0 || filteredStockSymbols.length > 0;

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "bullish":
        return "bg-success/20 text-success border-success/30";
      case "bearish":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "bullish":
        return <TrendingUp className="h-4 w-4" />;
      case "bearish":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  const formatLakhs = (num: number) => {
    const lakhs = num / 100000;
    return lakhs.toFixed(2) + "L";
  };

  const formatCrores = (num: number) => {
    const crores = num / 10000000;
    if (Math.abs(crores) >= 1) {
      return crores.toFixed(2) + " Cr";
    }
    return formatLakhs(num);
  };

  const quickLinks = [
    { title: "Option Chain", href: "/option-chain", icon: BarChart3, description: "Live OI & Greeks" },
    { title: "PCR Analysis", href: "/pcr", icon: PieChart, description: "Put-Call Ratio" },
    { title: "Max Pain", href: "/max-pain", icon: Target, description: "Pain Point Analysis" },
    { title: "OTR", href: "/otr", icon: Gauge, description: "Options Trade Range" },
    { title: "TOI", href: "/toi", icon: LineChart, description: "Total OI Analysis" },
    { title: "Option Builder", href: "/option-builder", icon: Zap, description: "Strategy Builder" },
  ];

  if (authLoading) {
    return (
      <PageLayout>
        <div className="container py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Helmet>
        <title>Options Summary | Runalgo - All-in-One Options Analytics Dashboard</title>
        <meta
          name="description"
          content="Comprehensive options summary with PCR, Max Pain, OI analysis, sentiment indicators, and market trends for Nifty, Bank Nifty, and stocks."
        />
      </Helmet>

      <div className="container px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Options Summary</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              All-in-one options analytics dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LastRefreshBadge lastRefresh={lastRefresh} />
            <PageInfoModal
              title="Options Summary"
              subtitle="All-in-one options analytics dashboard"
              overview="A single consolidated view of every important options metric for the selected symbol and expiry — OI profile, support/resistance, PCR, spot vs VWAP, and market breadth."
              legend={[
                { label: "OI Profile", text: "Horizontal Call vs Put OI across strikes — visualizes walls & pain zones", color: "#3b82f6" },
                { label: "Support / Resistance", text: "Key strikes derived from OI clusters and Max Pain", color: "#10b981" },
                { label: "PCR", text: "Put-Call Ratio — contrarian sentiment gauge", color: "#f59e0b" },
                { label: "Spot vs VWAP", text: "Intraday premium/discount vs volume-weighted average", color: "#8b5cf6" },
                { label: "Market Breadth", text: "Underlying index breadth to confirm/contradict options positioning", color: "#ef4444" },
              ]}
              sections={[
                {
                  heading: "Why One Screen",
                  body: "Switching between 5 different pages breaks focus. Summary bundles the highest-signal metrics so you can form a directional bias in under 60 seconds.",
                },
              ]}
              howToUse="Start with OI profile to see the walls, cross-check PCR for sentiment, confirm with spot-vs-VWAP for intraday bias, and finish with breadth for macro alignment."
              tips={[
                "Aligned signals across all 5 panels = highest-conviction trades.",
                "One panel disagreeing is usually the early-warning signal for a shift.",
              ]}
            />
          </div>
        </div>

        {/* Symbol & Expiry Selection */}
        <Card className="bg-card border-border">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {/* Symbol Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">Symbol:</span>
                <Popover open={symbolOpen} onOpenChange={setSymbolOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={symbolOpen}
                      disabled={loadingSymbols}
                      className="w-[140px] sm:w-[180px] justify-between bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      {loadingSymbols ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          Loading...
                        </span>
                      ) : selectedSymbol ? (
                        selectedSymbol
                      ) : (
                        "Symbol..."
                      )}
                      <ChevronsUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0 bg-popover border-border z-50" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search symbol..."
                        value={symbolSearch}
                        onValueChange={setSymbolSearch}
                      />
                      <CommandList className="max-h-[300px]">
                        {!hasResults && <CommandEmpty>No symbol found.</CommandEmpty>}

                        {filteredIndexSymbols.length > 0 && (
                          <CommandGroup heading="📊 Index">
                            {filteredIndexSymbols.map((symbol) => (
                              <CommandItem
                                key={symbol}
                                value={symbol}
                                onSelect={(currentValue) => {
                                  setSelectedSymbol(currentValue === selectedSymbol ? "" : currentValue);
                                  setSymbolOpen(false);
                                  setSymbolSearch("");
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedSymbol === symbol ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {symbol}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}

                        {filteredStockSymbols.length > 0 && (
                          <CommandGroup heading="📈 Stocks">
                            {filteredStockSymbols.map((symbol) => (
                              <CommandItem
                                key={symbol}
                                value={symbol}
                                onSelect={(currentValue) => {
                                  setSelectedSymbol(currentValue === selectedSymbol ? "" : currentValue);
                                  setSymbolOpen(false);
                                  setSymbolSearch("");
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedSymbol === symbol ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {symbol}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Expiry Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">Expiry:</span>
                <Select
                  value={selectedExpiry}
                  onValueChange={setSelectedExpiry}
                  disabled={loadingExpiry || expiryDates.length === 0}
                >
                  <SelectTrigger className="w-[120px] sm:w-[160px] bg-secondary text-secondary-foreground h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder={loadingExpiry ? "Loading..." : "Expiry"} />
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

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={fetchAllData}
                disabled={loading || !selectedSymbol || !selectedExpiry}
                className="bg-secondary h-9 w-9 sm:h-10 sm:w-10"
              >
                <RefreshCw className={cn("h-3 w-3 sm:h-4 sm:w-4", loading && "animate-spin")} />
              </Button>

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  <span className="text-xs sm:text-sm hidden sm:inline">Fetching data...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Summary Content */}
        {loading && !summaryData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            <Card className="lg:col-span-2 bg-card border-border">
              <CardHeader className="px-3 sm:px-6">
                <Skeleton className="h-6 sm:h-8 w-32 sm:w-40" />
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
                <Skeleton className="h-12 sm:h-16 w-full" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 sm:h-24 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="px-3 sm:px-6">
                <Skeleton className="h-5 sm:h-6 w-24 sm:w-32" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <Skeleton className="h-32 sm:h-40 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : summaryData ? (
          <>
            {/* Price & Sentiment Header */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Main Price Card */}
              <Card className="lg:col-span-2 bg-card border-border">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2 flex-wrap">
                      {summaryData.symbol}
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        {selectedExpiry}
                      </Badge>
                    </CardTitle>
                    <Badge className={`${getSentimentColor(summaryData.sentiment)} flex items-center gap-1 text-[10px] sm:text-xs w-fit`}>
                      {getSentimentIcon(summaryData.sentiment)}
                      {summaryData.sentimentStrength} {summaryData.sentiment}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
                  {/* Price Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                    <div className="bg-primary/10 rounded-lg p-2 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground mb-1">
                        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                        Spot
                      </div>
                      <div className="text-base sm:text-2xl font-bold text-foreground">
                        ₹{formatNumber(summaryData.spotPrice)}
                      </div>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-2 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground mb-1">
                        <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                        Future
                      </div>
                      <div className="text-sm sm:text-xl font-semibold text-foreground">
                        ₹{formatNumber(summaryData.futurePrice)}
                      </div>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-2 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground mb-1">
                        <LineChart className="h-3 w-3 sm:h-4 sm:w-4" />
                        VWAP
                      </div>
                      <div className="text-sm sm:text-xl font-semibold text-foreground">
                        ₹{formatNumber(summaryData.vwap)}
                      </div>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-2 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground mb-1">
                        <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                        ATM
                      </div>
                      <div className="text-sm sm:text-xl font-semibold text-foreground">
                        {formatNumber(summaryData.atm)}
                      </div>
                    </div>
                  </div>

                  {/* Max Pain & PCR Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Max Pain */}
                    <div className="bg-gradient-to-br from-secondary/80 to-secondary/40 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Target className="h-4 w-4 text-primary" />
                          Max Pain Analysis
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Key Level
                        </Badge>
                      </div>
                      <div className="flex items-baseline gap-3 mb-2">
                        <span className="text-3xl font-bold text-foreground">
                          {formatNumber(summaryData.maxPain)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Spot vs Max Pain:</span>
                        <span
                          className={cn(
                            "flex items-center gap-1 font-medium",
                            summaryData.maxPainDiff > 0 ? "text-success" : "text-destructive"
                          )}
                        >
                          {summaryData.maxPainDiff > 0 ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                          {summaryData.maxPainDiff > 0 ? "+" : ""}
                          {summaryData.maxPainDiffPercent.toFixed(2)}%
                          ({summaryData.maxPainDiff > 0 ? "Above" : "Below"})
                        </span>
                      </div>
                    </div>

                    {/* PCR Analysis */}
                    <div className="bg-gradient-to-br from-secondary/80 to-secondary/40 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Scale className="h-4 w-4 text-primary" />
                          PCR Analysis
                        </div>
                        <Badge
                          className={cn(
                            "text-xs",
                            summaryData.pcrOI > 1 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                          )}
                        >
                          {summaryData.pcrOI > 1 ? "Put Heavy" : "Call Heavy"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">PCR (OI)</div>
                          <div
                            className={cn(
                              "text-2xl font-bold",
                              summaryData.pcrOI > 1 ? "text-success" : "text-destructive"
                            )}
                          >
                            {summaryData.pcrOI.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">PCR (COI)</div>
                          <div
                            className={cn(
                              "text-2xl font-bold",
                              summaryData.pcrCOI > 1 ? "text-success" : "text-destructive"
                            )}
                          >
                            {summaryData.pcrCOI.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sentiment & Trend Card - Based on PCR COI */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-primary" />
                    Market Sentiment
                    <span className="text-xs font-normal text-muted-foreground">(Based on PCR COI)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Sentiment Gauge Visual - Based on PCR COI */}
                  <div className="relative h-24 bg-gradient-to-r from-destructive/30 via-muted to-success/30 rounded-lg overflow-hidden">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-12 bg-foreground rounded-full shadow-lg transition-all duration-500"
                      style={{
                        left: `${Math.min(Math.max((summaryData.pcrCOI - 0.3) * 40, 5), 95)}%`,
                      }}
                    />
                    <div className="absolute bottom-2 left-4 text-xs text-destructive font-medium">Bearish</div>
                    <div className="absolute bottom-2 right-4 text-xs text-success font-medium">Bullish</div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground font-medium">
                      Neutral
                    </div>
                  </div>

                  {/* PCR COI Value Display */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-muted-foreground">PCR COI:</span>
                    <span className={cn(
                      "text-2xl font-bold",
                      summaryData.pcrCOI > 1 ? "text-success" : summaryData.pcrCOI < 1 ? "text-destructive" : "text-foreground"
                    )}>
                      {summaryData.pcrCOI.toFixed(2)}
                    </span>
                  </div>

                  {/* Trend Badge */}
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-xs text-muted-foreground mb-1">Current Trend</div>
                    <div className="flex items-center gap-2">
                      {summaryData.trend.includes("Long") || summaryData.trend.includes("Bullish") ? (
                        <TrendingUp className="h-5 w-5 text-success" />
                      ) : summaryData.trend.includes("Short") || summaryData.trend.includes("Bearish") ? (
                        <TrendingDown className="h-5 w-5 text-destructive" />
                      ) : (
                        <Minus className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-semibold text-foreground">{summaryData.trend}</span>
                    </div>
                  </div>

                  {/* Last Updated */}
                  {summaryData.lastUpdated && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Data as of: {summaryData.lastUpdated}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Index Chart with OI Profile */}
            <IndexOIProfileChart symbol={selectedSymbol} expiry={selectedExpiry} />

            {/* Market Breadth Card */}
            <MarketBreadthCard symbol={selectedSymbol} />

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <SummaryOTRChart symbol={selectedSymbol} expiry={selectedExpiry} />
              <SpotVsVWAPChart symbol={selectedSymbol} expiry={selectedExpiry} />
              <SummarySupportResistanceChart symbol={selectedSymbol} expiry={selectedExpiry} />
            </div>
          </>
        ) : selectedSymbol && selectedExpiry ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              No data available for selected symbol and expiry.
            </CardContent>
          </Card>
        ) : null}

        {/* Quick Links Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Detailed Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickLinks.map((link) => {
                const params = new URLSearchParams();
                if (selectedSymbol) params.set("symbol", selectedSymbol);
                if (selectedExpiry) params.set("expiry", selectedExpiry);
                const fullUrl = `${link.href}?${params.toString()}`;
                
                return (
                  <a
                    key={link.href}
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors group"
                  >
                    <link.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-foreground">{link.title}</span>
                    <span className="text-xs text-muted-foreground">{link.description}</span>
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default OptionsSummary;
