import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { IndicesSection } from "@/components/dashboard/IndicesSection";
import { ChartPatternsSection } from "@/components/dashboard/ChartPatternsSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { PageInfoButton } from "@/components/PageInfoButton";

interface TrendingStock {
  companyName: string;
  nseScriptCode: string;
  ltp: string;
  close: string;
  yearHigh: string;
  yearLow: string;
  tag: string;
  moverType: string;
}

interface TrendingStocksData {
  TOP_GAINERS?: TrendingStock[];
  TOP_LOSERS?: TrendingStock[];
  VOLUME_SHOCKERS?: TrendingStock[];
  TRADED_BY_VOLUME?: TrendingStock[];
  MOST_VISITED?: TrendingStock[];
  YEARLY_HIGH?: TrendingStock[];
  YEARLY_LOW?: TrendingStock[];
}

const marketEvents = [
  { company: "Rani Ratna Wires Ltd.", event: "Bonus", ratio: "1:1" },
  { company: "Narayana Wealth Management Ltd.", event: "Split", ratio: "1:5:1" },
  { company: "ORM Overseas Ltd.", event: "Bonus", ratio: "2:1" },
  { company: "Prakash Pipes Ltd.", event: "Dividend", amount: "₹ 1 per share" },
  { company: "Vineet Laboratories Ltd.", event: "Rights", ratio: "1:2 (2 share at ₹ 25)" },
];

interface DealData {
  client: string;
  type: string;
  company: string;
  qty: string | number;
  price: string | number;
}

interface MarketActionItem {
  symbol: string;
  company: string;
  date: string;
  actionType: string;
  meetingType: string;
  description: string;
  price: number;
  notes: string;
}

interface MarketActionsData {
  dataLastWeekResults: unknown[][];
  dataThisWeek: unknown[][];
}

interface FIIChildData {
  Name: string;
  ShortName: string;
  Value: number;
}

interface FIIDataItem {
  Name: string;
  ShortName: string;
  Value: number;
  ChildData?: FIIChildData[] | null;
}

interface ClosePrice {
  Symbol: string;
  C: number;
  CZ: number;
  CZG: number;
}

interface FIIRecord {
  Date: string;
  FIIDIIData: FIIDataItem[];
  ClosePrice: ClosePrice[];
}

const ipoListings = [
  {
    name: "Modern Diagnostic & Research Centre Ltd.",
    symbol: "MD",
    openDate: "Dec 31, 2025",
    closeDate: "Jan 02, 2026",
    allotDate: "Jan 05, 2026",
    listStatus: "Pending",
  },
  {
    name: "E to E Transportation Infrastructure Ltd.",
    symbol: "ET",
    openDate: "Dec 26, 2025",
    closeDate: "Dec 30, 2025",
    allotDate: "Dec 31, 2025",
    listStatus: "Pending",
  },
  {
    name: "Apollo Techno Industries Ltd.",
    symbol: "AT",
    openDate: "Dec 23, 2025",
    closeDate: "Dec 26, 2025",
    allotDate: "Dec 29, 2025",
    listStatus: "Pending",
  },
];

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fiiData, setFiiData] = useState<FIIRecord[] | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [bulkDeals, setBulkDeals] = useState<DealData[]>([]);
  const [blockDeals, setBlockDeals] = useState<DealData[]>([]);
  const [shortDeals, setShortDeals] = useState<DealData[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [upcomingResults, setUpcomingResults] = useState<MarketActionItem[]>([]);
  const [releasedResults, setReleasedResults] = useState<MarketActionItem[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [trendingData, setTrendingData] = useState<TrendingStocksData | null>(null);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const fetchAllDashboardData = useCallback(async () => {
    try {
      const [fiiRes, trendingRes] = await Promise.allSettled([
        supabase.functions.invoke("fii-data"),
        supabase.functions.invoke("trending-stocks"),
      ]);

      if (fiiRes.status === "fulfilled" && !fiiRes.value.error && fiiRes.value.data) {
        setFiiData(fiiRes.value.data);
      }
      if (trendingRes.status === "fulfilled" && !trendingRes.value.error && trendingRes.value.data) {
        setTrendingData(trendingRes.value.data);
        setTrendingLoading(false);
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
  }, []);

  useEffect(() => {
    fetchAllDashboardData();
    const interval = setInterval(fetchAllDashboardData, 60000);
    return () => clearInterval(interval);
  }, [fetchAllDashboardData]);

  // Fetch deals data
  useEffect(() => {
    const fetchDealsData = async () => {
      setDealsLoading(true);
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const [bulkRes, blockRes, shortRes] = await Promise.all([
          fetch(`${baseUrl}/functions/v1/deals-data?file=bulk`, {
            headers: { Authorization: `Bearer ${anonKey}` },
          }),
          fetch(`${baseUrl}/functions/v1/deals-data?file=block`, {
            headers: { Authorization: `Bearer ${anonKey}` },
          }),
          fetch(`${baseUrl}/functions/v1/deals-data?file=short`, {
            headers: { Authorization: `Bearer ${anonKey}` },
          }),
        ]);

        if (bulkRes.ok) {
          const bulkData = await bulkRes.json();
          setBulkDeals(Array.isArray(bulkData) ? bulkData.slice(0, 10) : []);
        }
        if (blockRes.ok) {
          const blockData = await blockRes.json();
          setBlockDeals(Array.isArray(blockData) ? blockData.slice(0, 10) : []);
        }
        if (shortRes.ok) {
          const shortData = await shortRes.json();
          setShortDeals(Array.isArray(shortData) ? shortData.slice(0, 10) : []);
        }
      } catch (err) {
        console.error("Error fetching deals data:", err);
      } finally {
        setDealsLoading(false);
      }
    };
    fetchDealsData();
  }, []);

  // Fetch market actions (results) data
  useEffect(() => {
    const fetchMarketActions = async () => {
      setResultsLoading(true);
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const response = await fetch(`${baseUrl}/functions/v1/market-actions`, {
          headers: { Authorization: `Bearer ${anonKey}` },
        });

        if (response.ok) {
          const data: MarketActionsData = await response.json();

          // Parse upcoming results (this week)
          const upcoming = (data.dataThisWeek || []).slice(0, 8).map((item: unknown[]) => ({
            symbol: String(item[0] || ""),
            company: String(item[1] || ""),
            date: String(item[2] || ""),
            actionType: String(item[3] || ""),
            meetingType: String(item[4] || ""),
            description: String(item[5] || ""),
            price: Number(item[6]) || 0,
            notes: String(item[7] || ""),
          }));
          setUpcomingResults(upcoming);

          // Parse released results (last week)
          const released = (data.dataLastWeekResults || []).slice(0, 8).map((item: unknown[]) => ({
            symbol: String(item[0] || ""),
            company: String(item[1] || ""),
            date: String(item[2] || ""),
            actionType: String(item[3] || ""),
            meetingType: String(item[4] || ""),
            description: String(item[5] || ""),
            price: Number(item[6]) || 0,
            notes: String(item[7] || ""),
          }));
          setReleasedResults(released);
        }
      } catch (err) {
        console.error("Error fetching market actions:", err);
      } finally {
        setResultsLoading(false);
      }
    };
    fetchMarketActions();
  }, []);


  const handleStockClick = (symbol: string) => {
    navigate(`/stock-detail?symbol=${symbol}`);
  };
  // Helper to render stock list
  const renderStockList = (stocks: TrendingStock[] | undefined, isGainer: boolean = true) => {
    if (trendingLoading) {
      return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
    }
    if (!stocks || stocks.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No data available</div>;
    }
    return (
      <div className="space-y-2">
        {stocks.slice(0, 10).map((stock, idx) => {
          const ltp = parseFloat(stock.ltp);
          const close = parseFloat(stock.close);
          const change = ((ltp - close) / close) * 100;
          const isPositive = change >= 0;
          return (
            <div
              key={idx}
              className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                style={{ backgroundColor: "#2a2e39" }}
              >
                <img
                  src={`https://runalgo.xyz/top/chart/data/svg/nse_${stock.nseScriptCode}.svg`}
                  alt={stock.nseScriptCode}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    target.parentElement!.innerHTML = `<span class="text-xs sm:text-sm font-bold text-white">${stock.companyName.charAt(0)}</span>`;
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs sm:text-sm truncate">{stock.companyName}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">{stock.nseScriptCode}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-primary font-medium text-xs sm:text-sm">₹{ltp.toLocaleString()}</div>
                <div className={`font-medium text-[10px] sm:text-xs ${isPositive ? "text-success" : "text-destructive"}`}>
                  {isPositive ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                </div>
              </div>
              <span className="text-primary font-medium shrink-0" onClick={() => handleStockClick(stock.nseScriptCode)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  fill="#19c3e6"
                  className="bi bi-graph-up-arrow cursor-pointer hover:opacity-80 sm:w-4 sm:h-4"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M0 0h1v15h15v1H0zm10 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V4.9l-3.613 4.417a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61L13.445 4H10.5a.5.5 0 0 1-.5-.5"
                  />
                </svg>
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Get FII/DII data for display (with child data)
  const getFiiDiiDisplayData = () => {
    if (!fiiData || fiiData.length === 0) {
      return [];
    }

    const latest = fiiData[0];
    return (
      latest.FIIDIIData?.map((item) => ({
        name: item.ShortName,
        fullName: item.Name,
        value: item.Value,
        isPositive: item.Value >= 0,
        hasChildren: item.ChildData && item.ChildData.length > 0,
        children:
          item.ChildData?.map((child) => ({
            name: child.ShortName,
            value: child.Value,
            isPositive: child.Value >= 0,
          })) || [],
      })) || []
    );
  };

  // Get close prices for index summary
  const getClosePrices = () => {
    if (!fiiData || fiiData.length === 0) {
      return { nifty: null, vix: null, sensex: null };
    }

    const latest = fiiData[0];
    const prices = latest.ClosePrice || [];

    return {
      nifty: prices.find((p) => p.Symbol === "NIFTY"),
      vix: prices.find((p) => p.Symbol === "INDIA VIX"),
      sensex: prices.find((p) => p.Symbol === "SENSEX"),
    };
  };

  // Get latest date formatted nicely
  const getLatestDate = () => {
    if (!fiiData || fiiData.length === 0) return "--";
    const date = new Date(fiiData[0].Date);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[date.getDay()]}, ${date.getDate().toString().padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const toggleRow = (name: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

  // Calculate max value for bar width scaling
  const getMaxValue = () => {
    const allValues = fiiDiiDisplayData.flatMap((item) => [
      Math.abs(item.value),
      ...item.children.map((c) => Math.abs(c.value)),
    ]);
    return Math.max(...allValues, 1);
  };

  const fiiDiiDisplayData = getFiiDiiDisplayData();
  const closePrices = getClosePrices();
  const latestDate = getLatestDate();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50">
          <TickerRibbon />
          <Navbar />
        </div>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-end gap-2">
          <LastRefreshBadge lastRefresh={lastRefresh} />
          <PageInfoButton
            title="Dashboard"
            description="Your central hub for market overview including trending stocks, FII/DII activity, indices performance, and chart patterns. Data refreshes every 1 minute automatically."
          />
        </div>
        {/* Indices Section */}
        <IndicesSection />

        {/* Chart Patterns Section */}
        <ChartPatternsSection />

        {/* Trending Stocks Section */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
            <CardTitle className="text-lg sm:text-xl font-semibold">Trending Stocks</CardTitle>
            <a href="#" className="text-primary text-xs sm:text-sm hover:underline">
              View All ›
            </a>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <Tabs defaultValue="topgainers" className="w-full">
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <TabsList className="bg-transparent border-b border-border rounded-none w-max sm:w-full justify-start gap-3 sm:gap-6 h-auto p-0 mb-4">
                  <TabsTrigger
                    value="topgainers"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap text-xs sm:text-sm"
                  >
                    Gainers
                  </TabsTrigger>
                  <TabsTrigger
                    value="toplosers"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap text-xs sm:text-sm"
                  >
                    Losers
                  </TabsTrigger>
                  <TabsTrigger
                    value="volumeshockers"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap text-xs sm:text-sm"
                  >
                    Vol Shockers
                  </TabsTrigger>
                  <TabsTrigger
                    value="topvolume"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap text-xs sm:text-sm"
                  >
                    Top Vol
                  </TabsTrigger>
                  <TabsTrigger
                    value="52weekhigh"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap text-xs sm:text-sm"
                  >
                    52W High
                  </TabsTrigger>
                  <TabsTrigger
                    value="52weeklow"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap text-xs sm:text-sm"
                  >
                    52W Low
                  </TabsTrigger>
                  <TabsTrigger
                    value="mostvisited"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap text-xs sm:text-sm"
                  >
                    Popular
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="topgainers">{renderStockList(trendingData?.TOP_GAINERS, true)}</TabsContent>
              <TabsContent value="toplosers">{renderStockList(trendingData?.TOP_LOSERS, false)}</TabsContent>
              <TabsContent value="volumeshockers">{renderStockList(trendingData?.VOLUME_SHOCKERS)}</TabsContent>
              <TabsContent value="topvolume">{renderStockList(trendingData?.TRADED_BY_VOLUME)}</TabsContent>
              <TabsContent value="52weekhigh">{renderStockList(trendingData?.YEARLY_HIGH)}</TabsContent>
              <TabsContent value="52weeklow">{renderStockList(trendingData?.YEARLY_LOW, false)}</TabsContent>
              <TabsContent value="mostvisited">{renderStockList(trendingData?.MOST_VISITED)}</TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Market Events & Deals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Market Events */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Market Events</CardTitle>
              <a href="#" className="text-primary text-sm hover:underline">
                View All ›
              </a>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="corporate" className="w-full">
                <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-4 h-auto p-0 mb-4">
                  <TabsTrigger
                    value="corporate"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs"
                  >
                    Corporate Actions
                  </TabsTrigger>
                  <TabsTrigger
                    value="upcoming"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs"
                  >
                    Upcoming Results
                  </TabsTrigger>
                  <TabsTrigger
                    value="released"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs"
                  >
                    Released Results
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="corporate">
                  <div className="text-xs text-muted-foreground mb-3">28/12/2025</div>
                  <div className="space-y-2">
                    {marketEvents.map((event, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                            event.event === "Bonus"
                              ? "bg-green-600"
                              : event.event === "Split"
                                ? "bg-purple-600"
                                : event.event === "Dividend"
                                  ? "bg-blue-600"
                                  : "bg-orange-600"
                          }`}
                        >
                          {event.company.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div 
                            className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors"
                            onClick={() => navigate(`/stock-detail?symbol=${encodeURIComponent(event.company)}`)}
                          >
                            {event.company}
                          </div>
                          <div className="text-xs text-muted-foreground">{event.ratio || event.amount}</div>
                        </div>
                        <Badge
                          className={`text-xs ${
                            event.event === "Bonus"
                              ? "bg-green-500/20 text-green-400"
                              : event.event === "Split"
                                ? "bg-purple-500/20 text-purple-400"
                                : event.event === "Dividend"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-orange-500/20 text-orange-400"
                          }`}
                        >
                          {event.event}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="upcoming">
                  {resultsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : upcomingResults.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No upcoming results</div>
                  ) : (
                    <ScrollArea className="h-[280px]">
                      <div className="space-y-2">
                        {upcomingResults.map((result, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                                result.actionType.includes("Quarterly")
                                  ? "bg-blue-600"
                                  : result.actionType.includes("Bonus")
                                    ? "bg-green-600"
                                    : result.actionType.includes("Split")
                                      ? "bg-purple-600"
                                      : result.actionType.includes("Dividend")
                                        ? "bg-cyan-600"
                                        : "bg-orange-600"
                              }`}
                            >
                              {result.symbol.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div 
                                className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors"
                                onClick={() => navigate(`/stock-detail?symbol=${encodeURIComponent(result.symbol)}`)}
                              >
                                {result.company}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {result.date} • ₹{result.price.toLocaleString()}
                              </div>
                            </div>
                            <Badge
                              className={`text-xs ${
                                result.actionType.includes("Quarterly")
                                  ? "bg-blue-500/20 text-blue-400"
                                  : result.actionType.includes("Bonus")
                                    ? "bg-green-500/20 text-green-400"
                                    : result.actionType.includes("Split")
                                      ? "bg-purple-500/20 text-purple-400"
                                      : result.actionType.includes("Dividend")
                                        ? "bg-cyan-500/20 text-cyan-400"
                                        : "bg-orange-500/20 text-orange-400"
                              }`}
                            >
                              {result.meetingType}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
                <TabsContent value="released">
                  {resultsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : releasedResults.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No released results</div>
                  ) : (
                    <ScrollArea className="h-[280px]">
                      <div className="space-y-2">
                        {releasedResults.map((result, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                                result.actionType.includes("Quarterly")
                                  ? "bg-blue-600"
                                  : result.actionType.includes("Bonus")
                                    ? "bg-green-600"
                                    : result.actionType.includes("Split")
                                      ? "bg-purple-600"
                                      : result.actionType.includes("Dividend")
                                        ? "bg-cyan-600"
                                        : "bg-orange-600"
                              }`}
                            >
                              {result.symbol.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div 
                                className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors"
                                onClick={() => navigate(`/stock-detail?symbol=${encodeURIComponent(result.symbol)}`)}
                              >
                                {result.company}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {result.date} • ₹{result.price.toLocaleString()}
                              </div>
                            </div>
                            <Badge
                              className={`text-xs ${
                                result.actionType.includes("Quarterly")
                                  ? "bg-blue-500/20 text-blue-400"
                                  : result.actionType.includes("Bonus")
                                    ? "bg-green-500/20 text-green-400"
                                    : result.actionType.includes("Split")
                                      ? "bg-purple-500/20 text-purple-400"
                                      : result.actionType.includes("Dividend")
                                        ? "bg-cyan-500/20 text-cyan-400"
                                        : "bg-orange-500/20 text-orange-400"
                              }`}
                            >
                              {result.meetingType}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Deals */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Deals</CardTitle>
              <a href="#" className="text-primary text-sm hover:underline">
                View All ›
              </a>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="bulk" className="w-full">
                <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-4 h-auto p-0 mb-4">
                  <TabsTrigger
                    value="bulk"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs"
                  >
                    Bulk
                  </TabsTrigger>
                  <TabsTrigger
                    value="block"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs"
                  >
                    Block
                  </TabsTrigger>
                  <TabsTrigger
                    value="short"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs"
                  >
                    Short Selling
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="bulk">
                  {dealsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : bulkDeals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No data available</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="text-left py-2 font-medium">Client</th>
                            <th className="text-left py-2 font-medium">Type</th>
                            <th className="text-left py-2 font-medium">Company</th>
                            <th className="text-right py-2 font-medium">Qty</th>
                            <th className="text-right py-2 font-medium">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkDeals.map((deal, idx) => (
                            <tr key={idx} className="border-b border-border/50">
                              <td className="py-2 max-w-32 truncate">{deal.client}</td>
                              <td className="py-2">
                                <Badge
                                  className={`text-xs ${deal.type === "BUY" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                                >
                                  {deal.type}
                                </Badge>
                              </td>
                              <td className="py-2 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/stock-detail?symbol=${encodeURIComponent(deal.company)}`)}>{deal.company}</td>
                              <td className="py-2 text-right">
                                {typeof deal.qty === "number" ? deal.qty.toLocaleString() : deal.qty}
                              </td>
                              <td className="py-2 text-right">
                                {typeof deal.price === "number" ? deal.price.toFixed(2) : deal.price}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="block">
                  {dealsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : blockDeals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No data available</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="text-left py-2 font-medium">Client</th>
                            <th className="text-left py-2 font-medium">Type</th>
                            <th className="text-left py-2 font-medium">Company</th>
                            <th className="text-right py-2 font-medium">Qty</th>
                            <th className="text-right py-2 font-medium">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {blockDeals.map((deal, idx) => (
                            <tr key={idx} className="border-b border-border/50">
                              <td className="py-2 max-w-32 truncate">{deal.client}</td>
                              <td className="py-2">
                                <Badge
                                  className={`text-xs ${deal.type === "BUY" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                                >
                                  {deal.type}
                                </Badge>
                              </td>
                              <td className="py-2 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/stock-detail?symbol=${encodeURIComponent(deal.company)}`)}>{deal.company}</td>
                              <td className="py-2 text-right">
                                {typeof deal.qty === "number" ? deal.qty.toLocaleString() : deal.qty}
                              </td>
                              <td className="py-2 text-right">
                                {typeof deal.price === "number" ? deal.price.toFixed(2) : deal.price}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="short">
                  {dealsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : shortDeals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No data available</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="text-left py-2 font-medium">Client</th>
                            <th className="text-left py-2 font-medium">Type</th>
                            <th className="text-left py-2 font-medium">Company</th>
                            <th className="text-right py-2 font-medium">Qty</th>
                            <th className="text-right py-2 font-medium">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shortDeals.map((deal, idx) => (
                            <tr key={idx} className="border-b border-border/50">
                              <td className="py-2 max-w-32 truncate">{deal.client}</td>
                              <td className="py-2">
                                <Badge
                                  className={`text-xs ${deal.type === "BUY" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                                >
                                  {deal.type}
                                </Badge>
                              </td>
                              <td className="py-2 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/stock-detail?symbol=${encodeURIComponent(deal.company)}`)}>{deal.company}</td>
                              <td className="py-2 text-right">
                                {typeof deal.qty === "number" ? deal.qty.toLocaleString() : deal.qty}
                              </td>
                              <td className="py-2 text-right">
                                {typeof deal.price === "number" ? deal.price.toFixed(2) : deal.price}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* FII/DII Activity & Videos Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FII/DII Activity */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">FII/DII Activity</CardTitle>
              <a href="/fii" className="text-primary text-sm hover:underline">
                View All ›
              </a>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-4">{latestDate}</div>
              <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
                <span>Net Buy/(Sell)</span>
                <span>(Rs. Crores)</span>
              </div>
              <div className="space-y-0">
                {fiiDiiDisplayData.length > 0 ? (
                  fiiDiiDisplayData.map((item, idx) => {
                    const maxValue = getMaxValue();
                    const barWidthPercent = (Math.abs(item.value) / maxValue) * 40;
                    const isExpanded = expandedRows.has(item.name);

                    return (
                      <div key={idx}>
                        {/* Main Row */}
                        <div className="flex items-center gap-2 py-2 border-b border-border/30">
                          {/* Expand/Collapse button */}
                          <button
                            onClick={() => item.hasChildren && toggleRow(item.name)}
                            className={`w-4 h-4 flex items-center justify-center text-xs ${
                              item.hasChildren
                                ? "text-muted-foreground hover:text-foreground cursor-pointer"
                                : "text-transparent"
                            }`}
                          >
                            {item.hasChildren &&
                              (isExpanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />)}
                          </button>

                          <span className="text-sm min-w-24">{item.name}</span>

                          {/* Bar visualization */}
                          <div className="flex-1 relative h-5 flex items-center">
                            <div className="absolute left-1/2 w-px h-full bg-border/50" />
                            {item.isPositive ? (
                              <div
                                className="absolute h-4 bg-success rounded-sm"
                                style={{
                                  left: "50%",
                                  width: `${Math.max(barWidthPercent, 2)}%`,
                                }}
                              />
                            ) : (
                              <div
                                className="absolute h-4 bg-destructive rounded-sm"
                                style={{
                                  right: "50%",
                                  width: `${Math.max(barWidthPercent, 2)}%`,
                                }}
                              />
                            )}
                          </div>

                          <span
                            className={`text-sm font-medium min-w-20 text-right ${item.isPositive ? "text-success" : "text-destructive"}`}
                          >
                            {item.isPositive ? "+" : ""}
                            {item.value.toFixed(2)}
                          </span>
                        </div>

                        {/* Child Rows (expandable) */}
                        {item.hasChildren && isExpanded && (
                          <div className="bg-secondary/20">
                            {item.children.map((child, childIdx) => {
                              const childBarWidth = (Math.abs(child.value) / maxValue) * 40;
                              return (
                                <div
                                  key={childIdx}
                                  className="flex items-center gap-2 py-2 pl-6 border-b border-border/20"
                                >
                                  <span className="w-4" />
                                  <span className="text-sm min-w-24 text-muted-foreground">{child.name}</span>

                                  <div className="flex-1 relative h-4 flex items-center">
                                    <div className="absolute left-1/2 w-px h-full bg-border/30" />
                                    {child.isPositive ? (
                                      <div
                                        className="absolute h-3 bg-success/80 rounded-sm"
                                        style={{
                                          left: "50%",
                                          width: `${Math.max(childBarWidth, 1)}%`,
                                        }}
                                      />
                                    ) : (
                                      <div
                                        className="absolute h-3 bg-destructive/80 rounded-sm"
                                        style={{
                                          right: "50%",
                                          width: `${Math.max(childBarWidth, 1)}%`,
                                        }}
                                      />
                                    )}
                                  </div>

                                  <span
                                    className={`text-sm font-medium min-w-20 text-right ${child.isPositive ? "text-success" : "text-destructive"}`}
                                  >
                                    {child.isPositive ? "+" : ""}
                                    {child.value.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-muted-foreground">Loading...</div>
                )}
              </div>

              {/* Index Summary */}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-border">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">NIFTY</div>
                  <div
                    className={`text-xl font-bold ${(closePrices.nifty?.CZ ?? 0) >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {closePrices.nifty?.C?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "--"}
                  </div>
                  <div className={`text-xs ${(closePrices.nifty?.CZ ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                    {closePrices.nifty
                      ? `${closePrices.nifty.CZ >= 0 ? "+" : ""}${closePrices.nifty.CZ.toFixed(2)} (${closePrices.nifty.CZG >= 0 ? "▼" : "▼"}${Math.abs(closePrices.nifty.CZG).toFixed(1)}%)`
                      : "--"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">INDIA VIX</div>
                  <div
                    className={`text-xl font-bold ${(closePrices.vix?.CZ ?? 0) >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {closePrices.vix?.C?.toFixed(2) || "--"}
                  </div>
                  <div className={`text-xs ${(closePrices.vix?.CZ ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                    {closePrices.vix
                      ? `${closePrices.vix.CZ >= 0 ? "+" : ""}${closePrices.vix.CZ.toFixed(2)} (${closePrices.vix.CZG >= 0 ? "▲" : "▼"}${Math.abs(closePrices.vix.CZG).toFixed(1)}%)`
                      : "--"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">SENSEX</div>
                  <div
                    className={`text-xl font-bold ${(closePrices.sensex?.CZ ?? 0) >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {closePrices.sensex?.C?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "--"}
                  </div>
                  <div
                    className={`text-xs ${(closePrices.sensex?.CZ ?? 0) >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {closePrices.sensex
                      ? `${closePrices.sensex.CZ >= 0 ? "+" : ""}${closePrices.sensex.CZ.toFixed(2)} (${closePrices.sensex.CZG >= 0 ? "▲" : "▼"}${Math.abs(closePrices.sensex.CZG).toFixed(1)}%)`
                      : "--"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* YouTube Videos */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Trading Videos</CardTitle>
              <a
                href="https://www.youtube.com/@Upstox"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline"
              >
                View All ›
              </a>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: "kdrtaIuDV8Y", title: "Trading Strategy Video" },
                  { id: "-vruP0uc-Mg", title: "Market Analysis" },
                  { id: "QIqooYEuApg", title: "Technical Analysis" },
                ].map((video, idx) => (
                  <a
                    key={idx}
                    href={`https://youtu.be/${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="relative w-32 h-20 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {video.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">YouTube</div>
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* IPO Listing */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">IPO Listing</CardTitle>
            <a href="/ipo" className="text-primary text-sm hover:underline">
              View All ›
            </a>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ipoListings.map((ipo, idx) => (
                <Card key={idx} className="bg-secondary/30 border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold">
                        {ipo.symbol}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{ipo.name}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          SME
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Open</span>
                        <div className="font-medium">{ipo.openDate}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Close</span>
                        <div className="font-medium">{ipo.closeDate}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Allotment</span>
                        <div className="font-medium">{ipo.allotDate}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Listing</span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        >
                          {ipo.listStatus}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
