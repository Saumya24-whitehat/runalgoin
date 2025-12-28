import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { IndicesSection } from "@/components/dashboard/IndicesSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
const candlestickPatterns = [
  { symbol: "BAJAJ FINANCE LIMITED", pattern: "Doji", timeframe: "15min", time: "26 Dec 2025, 03:15:00 pm", sentiment: "Neutral" },
  { symbol: "SBI LIFE INSURANCE CO LTD", pattern: "Doji", timeframe: "15min", time: "26 Dec 2025, 03:15:00 pm", sentiment: "Neutral" },
  { symbol: "TECH MAHINDRA LIMITED", pattern: "Doji", timeframe: "1hr", time: "26 Dec 2025, 03:15:00 pm", sentiment: "Neutral" },
  { symbol: "ULTRATECH CEMENT LIMITED", pattern: "Doji", timeframe: "1hr", time: "26 Dec 2025, 03:15:00 pm", sentiment: "Neutral" },
  { symbol: "SUN PHARMACEUTICAL IND L.", pattern: "Doji", timeframe: "15min", time: "26 Dec 2025, 02:45:00 pm", sentiment: "Neutral" },
  { symbol: "RELIANCE INDUSTRIES LTD", pattern: "Doji", timeframe: "+5min", time: "26 Dec 2025, 03:15:00 pm", sentiment: "Neutral" },
];

const trendingStocks = [
  { symbol: "Nestle India", sector: "NESTLEIND", ltp: "1275.2", prev: "1259.7", change: "▲ 1.23%", isPositive: true, logo: "N" },
  { symbol: "Tube Investments of India", sector: "TIINDIA", ltp: "2607.5", prev: "2595.7", change: "▲ 1.23%", isPositive: true, logo: "T" },
  { symbol: "Saqliy", sector: "SAQLITY", ltp: "52.85", prev: "52.22", change: "▲ 1.21%", isPositive: true, logo: "S" },
  { symbol: "PI Industries", sector: "PIIND", ltp: "3258.0", prev: "3218.2", change: "▲ 1.20%", isPositive: true, logo: "P" },
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
  { client: "PRAKASH TRADING AND INVESTMENT COMPANY PRIVATE LIMITED", type: "SELL", company: "MIKT", qty: "5638308", price: "149.08" },
  { client: "VIDYARITI LLP", type: "SELL", company: "MIKT", qty: "5638308", price: "149.08" },
  { client: "BORGES MULTITRADE LLP", type: "SELL", company: "LLOYDSME", qty: "3008910", price: "1382.25" },
];

interface FIIDataItem {
  Name: string;
  ShortName: string;
  Value: number;
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
  { name: "Modern Diagnostic & Research Centre Ltd.", symbol: "MD", openDate: "Dec 31, 2025", closeDate: "Jan 02, 2026", allotDate: "Jan 05, 2026", listStatus: "Pending" },
  { name: "E to E Transportation Infrastructure Ltd.", symbol: "ET", openDate: "Dec 26, 2025", closeDate: "Dec 30, 2025", allotDate: "Dec 31, 2025", listStatus: "Pending" },
  { name: "Apollo Techno Industries Ltd.", symbol: "AT", openDate: "Dec 23, 2025", closeDate: "Dec 26, 2025", allotDate: "Dec 29, 2025", listStatus: "Pending" },
];

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fiiData, setFiiData] = useState<FIIRecord[] | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch FII data
  useEffect(() => {
    const fetchFiiData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('fii-data');
        if (!error && data) {
          setFiiData(data);
        }
      } catch (err) {
        console.error('Error fetching FII data:', err);
      }
    };
    fetchFiiData();
  }, []);

  // Get FII/DII data for display
  const getFiiDiiDisplayData = () => {
    if (!fiiData || fiiData.length === 0) {
      return [];
    }
    
    const latest = fiiData[0];
    return latest.FIIDIIData?.map(item => ({
      name: item.ShortName,
      value: item.Value,
      isPositive: item.Value >= 0
    })) || [];
  };

  // Get close prices for index summary
  const getClosePrices = () => {
    if (!fiiData || fiiData.length === 0) {
      return { nifty: null, vix: null, sensex: null };
    }
    
    const latest = fiiData[0];
    const prices = latest.ClosePrice || [];
    
    return {
      nifty: prices.find(p => p.Symbol === "NIFTY"),
      vix: prices.find(p => p.Symbol === "INDIA VIX"),
      sensex: prices.find(p => p.Symbol === "SENSEX")
    };
  };

  // Get latest date
  const getLatestDate = () => {
    if (!fiiData || fiiData.length === 0) return "--";
    const date = new Date(fiiData[0].Date);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const fiiDiiDisplayData = getFiiDiiDisplayData();
  const closePrices = getClosePrices();
  const latestDate = getLatestDate();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TickerRibbon />
        <Navbar />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <TickerRibbon />
      <Navbar />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Indices Section */}
        <IndicesSection />

        {/* Candlestick Patterns Section */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Tabs defaultValue="candlestick" className="w-full">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <TabsList className="bg-transparent gap-2 h-auto p-0 flex-wrap">
                  <TabsTrigger value="candlestick" className="bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-lg text-sm">
                    $ Candlestick
                  </TabsTrigger>
                  <TabsTrigger value="chartpatterns" className="bg-secondary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-lg text-sm">
                    📊 Chart Patterns
                  </TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  <Badge variant="default" className="bg-primary">Stocks</Badge>
                  <Badge variant="outline">F&O</Badge>
                </div>
              </div>
              <TabsContent value="candlestick">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-3 px-2 font-medium">SYMBOL</th>
                        <th className="text-left py-3 px-2 font-medium">PATTERN</th>
                        <th className="text-left py-3 px-2 font-medium">TIMEFRAME</th>
                        <th className="text-left py-3 px-2 font-medium">TIME</th>
                        <th className="text-left py-3 px-2 font-medium">SENTIMENT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candlestickPatterns.map((pattern, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="py-3 px-2 font-medium">{pattern.symbol}</td>
                          <td className="py-3 px-2 text-primary">{pattern.pattern}</td>
                          <td className="py-3 px-2">{pattern.timeframe}</td>
                          <td className="py-3 px-2 text-muted-foreground">{pattern.time}</td>
                          <td className="py-3 px-2">
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                              {pattern.sentiment}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-2 mb-2">
                    <span className="font-medium">Stock Name</span>
                    <span className="font-medium">LTP</span>
                  </div>
                  <div className="space-y-0">
                    {candlestickPatterns.map((pattern, idx) => (
                      <div key={idx} className="border-b border-border/50 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground leading-tight mb-2">
                              {pattern.symbol}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="text-primary font-medium">{pattern.pattern}</div>
                              <div className="text-muted-foreground text-xs">
                                Published On: {pattern.time.split(",")[0]}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                Price Point: <span className="text-foreground">--</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="w-16 h-10 bg-primary/20 rounded flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">{pattern.timeframe}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="chartpatterns">
                <div className="text-center py-8 text-muted-foreground">Chart patterns data loading...</div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Trending Stocks Section */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-semibold">Trending Stocks</CardTitle>
            <a href="#" className="text-primary text-sm hover:underline">View All ›</a>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="52weekhighlow" className="w-full">
              <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-6 h-auto p-0 mb-4 overflow-x-auto">
                <TabsTrigger value="toplosers" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap">Top Losers</TabsTrigger>
                <TabsTrigger value="volumeshockers" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap">Volume Shockers</TabsTrigger>
                <TabsTrigger value="topvolume" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap">Top Volume</TabsTrigger>
                <TabsTrigger value="52weekhighlow" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap">52 Week High Low</TabsTrigger>
                <TabsTrigger value="mostvisited" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap">Most Visited</TabsTrigger>
              </TabsList>
              <TabsContent value="52weekhighlow">
                <div className="text-xs text-muted-foreground mb-3">26/12/2025</div>
                <div className="space-y-2">
                  {trendingStocks.map((stock, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
                        idx % 4 === 0 ? "bg-gradient-to-br from-blue-500 to-blue-700" :
                        idx % 4 === 1 ? "bg-gradient-to-br from-purple-500 to-purple-700" :
                        idx % 4 === 2 ? "bg-gradient-to-br from-orange-500 to-orange-700" :
                        "bg-gradient-to-br from-green-500 to-green-700"
                      }`}>
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
              <TabsContent value="toplosers"><div className="text-center py-8 text-muted-foreground">Loading...</div></TabsContent>
              <TabsContent value="volumeshockers"><div className="text-center py-8 text-muted-foreground">Loading...</div></TabsContent>
              <TabsContent value="topvolume"><div className="text-center py-8 text-muted-foreground">Loading...</div></TabsContent>
              <TabsContent value="mostvisited"><div className="text-center py-8 text-muted-foreground">Loading...</div></TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Market Events & Deals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Market Events */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Market Events</CardTitle>
              <a href="#" className="text-primary text-sm hover:underline">View All ›</a>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="corporate" className="w-full">
                <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-4 h-auto p-0 mb-4">
                  <TabsTrigger value="corporate" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs">Corporate Actions</TabsTrigger>
                  <TabsTrigger value="upcoming" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs">Upcoming Results</TabsTrigger>
                  <TabsTrigger value="released" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs">Released Results</TabsTrigger>
                </TabsList>
                <TabsContent value="corporate">
                  <div className="text-xs text-muted-foreground mb-3">28/12/2025</div>
                  <div className="space-y-2">
                    {marketEvents.map((event, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                          event.event === "Bonus" ? "bg-green-600" :
                          event.event === "Split" ? "bg-purple-600" :
                          event.event === "Dividend" ? "bg-blue-600" :
                          "bg-orange-600"
                        }`}>
                          {event.company.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{event.company}</div>
                          <div className="text-xs text-muted-foreground">{event.ratio || event.amount}</div>
                        </div>
                        <Badge className={`text-xs ${
                          event.event === "Bonus" ? "bg-green-500/20 text-green-400" :
                          event.event === "Split" ? "bg-purple-500/20 text-purple-400" :
                          event.event === "Dividend" ? "bg-blue-500/20 text-blue-400" :
                          "bg-orange-500/20 text-orange-400"
                        }`}>
                          {event.event}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="upcoming"><div className="text-center py-8 text-muted-foreground">Loading...</div></TabsContent>
                <TabsContent value="released"><div className="text-center py-8 text-muted-foreground">Loading...</div></TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Deals */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Deals</CardTitle>
              <a href="#" className="text-primary text-sm hover:underline">View All ›</a>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="bulk" className="w-full">
                <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-4 h-auto p-0 mb-4">
                  <TabsTrigger value="bulk" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs">Bulk</TabsTrigger>
                  <TabsTrigger value="block" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs">Block</TabsTrigger>
                  <TabsTrigger value="short" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs">Short Selling</TabsTrigger>
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
                              <Badge className={`text-xs ${deal.type === "BUY" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
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
                <TabsContent value="block"><div className="text-center py-8 text-muted-foreground">Loading...</div></TabsContent>
                <TabsContent value="short"><div className="text-center py-8 text-muted-foreground">Loading...</div></TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* FII/DII Activity */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">FII/DII Activity</CardTitle>
            <a href="#" className="text-primary text-sm hover:underline">View All ›</a>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-4">{latestDate}</div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Net Buy/(Sell)</span>
              <span>(Rs. Crores)</span>
            </div>
            <div className="space-y-3">
              {fiiDiiDisplayData.length > 0 ? fiiDiiDisplayData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <span className="text-sm min-w-24">{item.name}</span>
                  <div className="flex-1 relative h-6 flex items-center justify-center">
                    <div className="absolute left-1/2 w-px h-full bg-border" />
                    {item.isPositive ? (
                      <div 
                        className="absolute h-5 bg-success rounded-sm" 
                        style={{ 
                          left: '50%', 
                          width: `${Math.min((item.value / 100), 40)}%` 
                        }}
                      />
                    ) : (
                      <div 
                        className="absolute h-5 bg-destructive rounded-sm" 
                        style={{ 
                          right: '50%', 
                          width: `${Math.min((Math.abs(item.value) / 100), 40)}%` 
                        }}
                      />
                    )}
                  </div>
                  <span className={`text-sm font-medium min-w-24 text-right ${item.isPositive ? "text-success" : "text-destructive"}`}>
                    {item.isPositive ? "+" : ""}{item.value.toFixed(2)}
                  </span>
                </div>
              )) : (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              )}
            </div>
            
            {/* Index Summary */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-border">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">NIFTY</div>
                <div className={`text-xl font-bold ${(closePrices.nifty?.CZ ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                  {closePrices.nifty?.C?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "--"}
                </div>
                <div className={`text-xs ${(closePrices.nifty?.CZ ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                  {closePrices.nifty ? `${closePrices.nifty.CZ >= 0 ? '+' : ''}${closePrices.nifty.CZ.toFixed(2)} (${closePrices.nifty.CZG >= 0 ? '+' : ''}${closePrices.nifty.CZG.toFixed(2)}%)` : "--"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">INDIA VIX</div>
                <div className={`text-xl font-bold ${(closePrices.vix?.CZ ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                  {closePrices.vix?.C?.toFixed(2) || "--"}
                </div>
                <div className={`text-xs ${(closePrices.vix?.CZ ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                  {closePrices.vix ? `${closePrices.vix.CZ >= 0 ? '+' : ''}${closePrices.vix.CZ.toFixed(2)} (${closePrices.vix.CZG >= 0 ? '+' : ''}${closePrices.vix.CZG.toFixed(2)}%)` : "--"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">SENSEX</div>
                <div className={`text-xl font-bold ${(closePrices.sensex?.CZ ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                  {closePrices.sensex?.C?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "--"}
                </div>
                <div className={`text-xs ${(closePrices.sensex?.CZ ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                  {closePrices.sensex ? `${closePrices.sensex.CZ >= 0 ? '+' : ''}${closePrices.sensex.CZ.toFixed(2)} (${closePrices.sensex.CZG >= 0 ? '+' : ''}${closePrices.sensex.CZG.toFixed(2)}%)` : "--"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IPO Listing */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">IPO Listing</CardTitle>
            <a href="#" className="text-primary text-sm hover:underline">View All ›</a>
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
                        <Badge variant="outline" className="text-xs mt-1">SME</Badge>
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
                        <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
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
