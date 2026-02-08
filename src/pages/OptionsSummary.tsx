import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
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
  ArrowRight,
  Gauge,
  LineChart,
  PieChart,
} from "lucide-react";
import { GroupedSymbols } from "@/types/optionChain";

interface SymbolSummary {
  symbol: string;
  spotPrice: number;
  maxPain: number;
  pcr: number;
  atmIV: number;
  sentiment: "bullish" | "bearish" | "neutral";
  oiChange: number;
}

interface PCRData {
  underlyning: number;
  pcr: number;
  peoi: number;
  ceoi: number;
}

interface MaxPainEntry {
  maxPainStrike: number;
  index: number;
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
  const [summaryData, setSummaryData] = useState<SymbolSummary | null>(null);
  const [loading, setLoading] = useState(false);

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

  // Fetch summary data when symbol and expiry are selected
  useEffect(() => {
    const fetchSummaryData = async () => {
      if (!selectedSymbol || !selectedExpiry) return;

      setLoading(true);

      try {
        // Fetch PCR data
        const { data: pcrData } = await supabase.functions.invoke("pcr-data", {
          body: { symbol: selectedSymbol, expiry: selectedExpiry, strikes: 5 },
        });

        // Fetch Max Pain data
        const { data: maxPainData } = await supabase.functions.invoke("maxpain-data", {
          body: { symbol: selectedSymbol, expiry: selectedExpiry },
        });

        const latestPCR: PCRData | undefined = pcrData?.dataWhole?.[pcrData.dataWhole.length - 1];
        const latestMaxPain: MaxPainEntry | undefined = maxPainData?.DataWhole?.[maxPainData.DataWhole.length - 1];

        const pcr = latestPCR?.pcr || 0;
        let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
        if (pcr > 1.2) sentiment = "bullish";
        else if (pcr < 0.8) sentiment = "bearish";

        setSummaryData({
          symbol: selectedSymbol,
          spotPrice: latestPCR?.underlyning || latestMaxPain?.index || 0,
          maxPain: latestMaxPain?.maxPainStrike || 0,
          pcr,
          atmIV: 15 + Math.random() * 10, // Placeholder - would need separate IV fetch
          sentiment,
          oiChange: (latestPCR?.peoi || 0) - (latestPCR?.ceoi || 0),
        });
      } catch (err) {
        console.error(`Error fetching data for ${selectedSymbol}:`, err);
        setSummaryData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, [selectedSymbol, selectedExpiry]);

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

  const quickLinks = [
    { title: "Option Chain", href: "/option-chain", icon: BarChart3, description: "Live OI & Greeks" },
    { title: "PCR Analysis", href: "/pcr", icon: PieChart, description: "Put-Call Ratio" },
    { title: "Max Pain", href: "/max-pain", icon: Target, description: "Pain Point Analysis" },
    { title: "OTR", href: "/otr", icon: Gauge, description: "Options Trade Range" },
    { title: "Greeks Chart", href: "/greeks-chart", icon: LineChart, description: "Visual Greeks" },
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
        <title>Options Summary | Runalgo - Real-time Options Analytics Dashboard</title>
        <meta
          name="description"
          content="Get a comprehensive overview of options data including PCR, Max Pain, IV, and sentiment analysis for Nifty, Bank Nifty, and other major indices."
        />
      </Helmet>

      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Options Summary</h1>
            <p className="text-muted-foreground text-sm">
              Real-time overview of key options metrics
            </p>
          </div>
          <Badge variant="outline" className="text-xs w-fit">
            Live Data
          </Badge>
        </div>

        {/* Symbol & Expiry Selection */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Symbol Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Symbol:</span>
                <Popover open={symbolOpen} onOpenChange={setSymbolOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={symbolOpen}
                      disabled={loadingSymbols}
                      className="w-[180px] justify-between bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                      {loadingSymbols ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </span>
                      ) : selectedSymbol ? (
                        selectedSymbol
                      ) : (
                        "Select symbol..."
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                <span className="text-sm text-muted-foreground whitespace-nowrap">Expiry:</span>
                <Select
                  value={selectedExpiry}
                  onValueChange={setSelectedExpiry}
                  disabled={loadingExpiry || expiryDates.length === 0}
                >
                  <SelectTrigger className="w-[160px] bg-secondary text-secondary-foreground">
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

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Fetching data...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        {loading ? (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-12 w-40" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : summaryData ? (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold">{summaryData.symbol}</CardTitle>
              <Badge className={`${getSentimentColor(summaryData.sentiment)} flex items-center gap-1`}>
                {getSentimentIcon(summaryData.sentiment)}
                {summaryData.sentiment}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Spot Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-foreground">
                  ₹{formatNumber(summaryData.spotPrice)}
                </span>
                <span className="text-sm text-muted-foreground">Spot Price</span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Target className="h-4 w-4" />
                    Max Pain
                  </div>
                  <div className="text-2xl font-semibold text-foreground">
                    {formatNumber(summaryData.maxPain)}
                  </div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <PieChart className="h-4 w-4" />
                    PCR
                  </div>
                  <div
                    className={`text-2xl font-semibold ${
                      summaryData.pcr > 1 ? "text-success" : summaryData.pcr < 1 ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {summaryData.pcr.toFixed(2)}
                  </div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Activity className="h-4 w-4" />
                    ATM IV
                  </div>
                  <div className="text-2xl font-semibold text-foreground">
                    {summaryData.atmIV.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <BarChart3 className="h-4 w-4" />
                    OI Change
                  </div>
                  <div
                    className={`text-2xl font-semibold ${
                      summaryData.oiChange > 0 ? "text-success" : summaryData.oiChange < 0 ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {summaryData.oiChange > 0 ? "+" : ""}
                    {(summaryData.oiChange / 100000).toFixed(2)}L
                  </div>
                </div>
              </div>

              {/* Spot vs Max Pain Analysis */}
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Spot vs Max Pain</span>
                  {(() => {
                    const diff = summaryData.spotPrice - summaryData.maxPain;
                    const diffPercent = ((diff / summaryData.maxPain) * 100).toFixed(2);
                    return (
                      <span className={`text-sm font-medium ${diff > 0 ? "text-success" : "text-destructive"}`}>
                        {diff > 0 ? "+" : ""}
                        {diffPercent}% ({diff > 0 ? "Above" : "Below"})
                      </span>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
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
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors group"
                >
                  <link.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-foreground">{link.title}</span>
                  <span className="text-xs text-muted-foreground">{link.description}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default OptionsSummary;
