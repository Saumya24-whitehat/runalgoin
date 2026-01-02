import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TickerData {
  ltp: number;
  ch: number;
  chPer: string;
  c: string;
  symbol: string;
}

// All NSE indices with display names
const nseIndices = [
  { key: "Nifty 50", displayName: "Nifty 50" },
  { key: "Nifty Bank", displayName: "Bank Nifty" },
  { key: "Nifty Financial Services", displayName: "Nifty Financial Services" },
  { key: "NIFTY MIDCAP SELECT", displayName: "Nifty Midcap Select" },
  { key: "Nifty 100", displayName: "Nifty 100" },
  { key: "Nifty 200", displayName: "Nifty 200" },
  { key: "Nifty 500", displayName: "Nifty 500" },
  { key: "Nifty Next 50", displayName: "Nifty Next 50" },
  { key: "Nifty IT", displayName: "Nifty IT" },
  { key: "Nifty Auto", displayName: "Nifty Auto" },
  { key: "Nifty PSU Bank", displayName: "Nifty PSU Bank" },
  { key: "Nifty Pharma", displayName: "Nifty Pharma" },
  { key: "Nifty Metal", displayName: "Nifty Metal" },
  { key: "Nifty FMCG", displayName: "Nifty FMCG" },
  { key: "Nifty Infra", displayName: "Nifty Infra" },
  { key: "Nifty Private Bank", displayName: "Nifty Pvt Bank" },
  { key: "Nifty Media", displayName: "Nifty Media" },
  { key: "Nifty Realty", displayName: "Nifty Realty" },
  { key: "Nifty Healthcare", displayName: "Nifty Healthcare" },
  { key: "Nifty Consumer Durables", displayName: "Nifty Consumer Durables" },
  { key: "Nifty Oil & Gas", displayName: "Nifty Oil & Gas" },
  { key: "Nifty Smallcap", displayName: "Nifty Smallcap" },
  { key: "Nifty Midcap", displayName: "Nifty Midcap" },
  { key: "Nifty Energy", displayName: "Nifty Energy" },
  { key: "Nifty Commodities", displayName: "Nifty Commodities" },
  { key: "CPSE", displayName: "CPSE" },
];

// BSE indices
const bseIndices = [
  { key: "Sensex", displayName: "Sensex" },
  { key: "BSE 100", displayName: "BSE 100" },
  { key: "BSE 200", displayName: "BSE 200" },
  { key: "BSE 500", displayName: "BSE 500" },
  { key: "BSE Midcap", displayName: "BSE Midcap" },
  { key: "BSE Smallcap", displayName: "BSE Smallcap" },
];

const timePeriods = ["1D", "1W", "1M", "3M", "1Y", "2Y", "5Y"];

const Indices = () => {
  const navigate = useNavigate();
  const [tickerData, setTickerData] = useState<Record<string, TickerData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"major" | "gainers" | "losers">("major");
  const [exchange, setExchange] = useState<"NSE" | "BSE">("NSE");
  const [timePeriod, setTimePeriod] = useState("5Y");

  // Fetch ticker data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('ticker-data');
        if (!error && data) {
          setTickerData(data);
        }
      } catch (err) {
        console.error('Error fetching ticker data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get current date formatted
  const getCurrentDate = () => {
    const now = new Date();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[now.getDay()]}, ${now.getDate().toString().padStart(2, "0")} ${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  // Get current time formatted
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();
  };

  // Process indices data
  const getProcessedData = () => {
    if (!tickerData) return [];

    const indices = exchange === "NSE" ? nseIndices : bseIndices;
    
    const processed = indices.map(index => {
      const data = tickerData[index.key];
      if (!data) {
        return {
          name: index.displayName,
          ltp: null,
          change: null,
          changePercent: null,
          isPositive: false,
          lastUpdate: getCurrentTime(),
        };
      }

      const change = data.ch || 0;
      const changePercent = parseFloat(data.chPer) || 0;

      return {
        name: index.displayName,
        ltp: data.ltp,
        change: change,
        changePercent: changePercent,
        isPositive: change >= 0,
        lastUpdate: getCurrentTime(),
      };
    }).filter(item => item.ltp !== null);

    // Sort based on active tab
    if (activeTab === "gainers") {
      return processed.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    } else if (activeTab === "losers") {
      return processed.sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));
    }
    
    return processed;
  };

  const indicesData = getProcessedData();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Indices</h1>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-6">
          <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-6 h-auto p-0">
            <TabsTrigger
              value="major"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 bg-transparent"
            >
              Major
            </TabsTrigger>
            <TabsTrigger
              value="gainers"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 bg-transparent"
            >
              Gainers
            </TabsTrigger>
            <TabsTrigger
              value="losers"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 bg-transparent"
            >
              Losers
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Date and Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-muted-foreground">{getCurrentDate()}</span>
            
            {/* Time Period Buttons */}
            <div className="flex items-center gap-1">
              {timePeriods.map((period) => (
                <Button
                  key={period}
                  variant={timePeriod === period ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setTimePeriod(period)}
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>

          {/* Exchange Toggle */}
          <div className="flex items-center gap-1">
            <Button
              variant={exchange === "NSE" ? "default" : "outline"}
              size="sm"
              className="h-8 px-4"
              onClick={() => setExchange("NSE")}
            >
              NSE
            </Button>
            <Button
              variant={exchange === "BSE" ? "default" : "outline"}
              size="sm"
              className="h-8 px-4"
              onClick={() => setExchange("BSE")}
            >
              BSE
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-pulse text-muted-foreground">Loading indices data...</div>
              </div>
            ) : indicesData.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-muted-foreground">No data available</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Index Name
                      </th>
                      <th className="text-right py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        LTP
                      </th>
                      <th className="text-right py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        CHG
                      </th>
                      <th className="text-right py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        CHG%
                      </th>
                      <th className="text-right py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Last Update
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicesData.map((index, idx) => (
                      <tr 
                        key={idx} 
                        className="border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer"
                      >
                        <td className="py-4 px-6">
                          <span className="font-medium text-foreground">{index.name}</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="font-semibold text-foreground">
                            {index.ltp?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className={`flex items-center justify-end gap-1 ${index.isPositive ? "text-success" : "text-destructive"}`}>
                            {index.isPositive ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {index.isPositive ? "+" : ""}{index.change?.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className={`flex items-center justify-end gap-1 ${index.isPositive ? "text-success" : "text-destructive"}`}>
                            {index.isPositive ? "▲" : "▼"} {index.isPositive ? "+" : ""}{index.changePercent?.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-muted-foreground text-sm">{index.lastUpdate}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Indices;
