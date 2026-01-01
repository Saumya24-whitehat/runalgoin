import { useEffect, useState } from "react";
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

const trendingStocks = [
  {
    symbol: "Nestle India",
    sector: "NESTLEIND",
    ltp: "1275.2",
    prev: "1259.7",
    change: "▲ 1.23%",
    isPositive: true,
    logo: "N",
  },
  {
    symbol: "Tube Investments of India",
    sector: "TIINDIA",
    ltp: "2607.5",
    prev: "2595.7",
    change: "▲ 1.23%",
    isPositive: true,
    logo: "T",
  },
  { symbol: "Saqliy", sector: "SAQLITY", ltp: "52.85", prev: "52.22", change: "▲ 1.21%", isPositive: true, logo: "S" },
  {
    symbol: "PI Industries",
    sector: "PIIND",
    ltp: "3258.0",
    prev: "3218.2",
    change: "▲ 1.20%",
    isPositive: true,
    logo: "P",
  },
  { symbol: "IRFC", sector: "IRFC", ltp: "78.10", prev: "77.81", change: "▲ 1.15%", isPositive: true, logo: "I" },
  { symbol: "NHPC", sector: "NHPC", ltp: "315.9", prev: "313.1", change: "▲ 1.12%", isPositive: true, logo: "N" },
];

const marketEvents = [
  { company: "Rani Ratna Wires Ltd.", event: "Bonus", ratio: "1:1" },
  { company: "Narayana Wealth Management Ltd.", event: "Split", ratio: "1:5:1" },
  { company: "ORM Overseas Ltd.", event: "Bonus", ratio: "2:1" },
  { company: "Prakash Pipes Ltd.", event: "Dividend", amount: "₹ 1 per share" },
  { company: "Vineet Laboratories Ltd.", event: "Rights", ratio: "1:2 (2 share at ₹ 25)" },
];

const bulkDeals = [
  { client: "IMPERIAL CHEMICAL INDUSTRIES LIMITED", type: "BUY", company: "AKZONDIA", qty: "4870635", price: "3163.5" },
  {
    client: "PRAKASH TRADING AND INVESTMENT COMPANY PRIVATE LIMITED",
    type: "SELL",
    company: "MIKT",
    qty: "5638308",
    price: "149.08",
  },
  { client: "VIDYARITI LLP", type: "SELL", company: "MIKT", qty: "5638308", price: "149.08" },
  { client: "BORGES MULTITRADE LLP", type: "SELL", company: "LLOYDSME", qty: "3008910", price: "1382.25" },
];

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

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch FII data
  useEffect(() => {
    const fetchFiiData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("fii-data");
        if (!error && data) {
          setFiiData(data);
        }
      } catch (err) {
        console.error("Error fetching FII data:", err);
      }
    };
    fetchFiiData();
  }, []);

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
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Indices Section */}
        <IndicesSection />

        {/* Chart Patterns Section */}
        <ChartPatternsSection />

        {/* Trending Stocks Section */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-semibold">Trending Stocks</CardTitle>
            <a href="#" className="text-primary text-sm hover:underline">
              View All ›
            </a>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="52weekhighlow" className="w-full">
              <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-6 h-auto p-0 mb-4 overflow-x-auto">
                <TabsTrigger
                  value="toplosers"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap"
                >
                  Top Losers
                </TabsTrigger>
                <TabsTrigger
                  value="volumeshockers"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap"
                >
                  Volume Shockers
                </TabsTrigger>
                <TabsTrigger
                  value="topvolume"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap"
                >
                  Top Volume
                </TabsTrigger>
                <TabsTrigger
                  value="52weekhighlow"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap"
                >
                  52 Week High Low
                </TabsTrigger>
                <TabsTrigger
                  value="mostvisited"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap"
                >
                  Most Visited
                </TabsTrigger>
              </TabsList>
              <TabsContent value="52weekhighlow">
                <div className="text-xs text-muted-foreground mb-3">26/12/2025</div>
                <div className="space-y-2">
                  {trendingStocks.map((stock, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
                          idx % 4 === 0
                            ? "bg-gradient-to-br from-blue-500 to-blue-700"
                            : idx % 4 === 1
                              ? "bg-gradient-to-br from-purple-500 to-purple-700"
                              : idx % 4 === 2
                                ? "bg-gradient-to-br from-orange-500 to-orange-700"
                                : "bg-gradient-to-br from-green-500 to-green-700"
                        }`}
                      >
                        {stock.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{stock.symbol}</div>
                        <div className="text-xs text-muted-foreground">{stock.sector}</div>
                      </div>
                      <div className="text-primary font-medium">{stock.ltp}</div>
                      <div className="text-muted-foreground">{stock.prev}</div>
                      <div className={`font-medium ${stock.isPositive ? "text-green-500" : "text-red-500"}`}>
                        {stock.change}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="toplosers">
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              </TabsContent>
              <TabsContent value="volumeshockers">
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              </TabsContent>
              <TabsContent value="topvolume">
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              </TabsContent>
              <TabsContent value="mostvisited">
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              </TabsContent>
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
                          <div className="font-medium text-sm truncate">{event.company}</div>
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
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                </TabsContent>
                <TabsContent value="released">
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-2 font-medium">Client</th>
                          <th className="text-left py-2 font-medium">Type</th>
                          <th className="text-left py-2 font-medium">Company</th>
                          <th className="text-right py-2 font-medium">Qty</th>
                          <th className="text-right py-2 font-medium">Price ↓</th>
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
                            <td className="py-2">{deal.company}</td>
                            <td className="py-2 text-right">{deal.qty}</td>
                            <td className="py-2 text-right">{deal.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
                <TabsContent value="block">
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                </TabsContent>
                <TabsContent value="short">
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
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
              <a href="#" className="text-primary text-sm hover:underline">
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
            <a href="#" className="text-primary text-sm hover:underline">
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
