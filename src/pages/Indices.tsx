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

interface IndexData {
  stock_column: {
    pk: number;
    get_full_name: string;
    absolute_url: string;
    NSEcode: string;
    BSEcode: string;
    ISIN: string;
  };
  week_changeP: number;
  currentPrice: number;
  companies_count: number;
  advance: { value: number; color: string };
  decline: { value: number; color: string };
  adv_dec_ratio: { value: number | null; color: string | null };
  abs_score: number;
  yearHighLow: {
    low: number;
    high: number;
    ltp: number;
    changeP: number;
  };
  day_changeP: number;
  month_changeP: number;
  qtr_changeP: number;
  halfyr_changeP: number;
  year_changeP: number;
  three_year_changeP: number;
  five_year_changeP: number;
  ten_year_changeP: number;
  live_pe: number | null;
  PB: number | null;
  DIV: number | null;
  eps: number | null;
}

interface ApiResponse {
  body: {
    indices: {
      table: IndexData[];
    };
  };
}

const timePeriodMap: Record<string, string> = {
  "1D": "day",
  "1W": "week",
  "1M": "month",
  "3M": "quarter",
  "1Y": "year",
  "2Y": "twoyear",
  "5Y": "fiveyear",
};

const timePeriods = ["1D", "1W", "1M", "3M", "1Y", "2Y", "5Y"];

const Indices = () => {
  const navigate = useNavigate();
  const [indicesData, setIndicesData] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"major" | "gainers" | "losers">("major");
  const [exchange, setExchange] = useState<"NSE" | "BSE">("NSE");
  const [timePeriod, setTimePeriod] = useState("5Y");

  // Fetch indices data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const activeRange = timePeriodMap[timePeriod] || "week";
        const { data, error } = await supabase.functions.invoke("indices-data", {
          body: { activeRange },
        });

        console.log(data?.body?.index?.tableData);
        if (!error && data?.body?.index?.tableData) {
          setIndicesData(data.body.index.tableData);
        }
      } catch (err) {
        console.error("Error fetching indices data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timePeriod]);

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
    return now
      .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
      .toLowerCase();
  };

  // Get change value based on time period
  const getChangeForPeriod = (index: IndexData): number => {
    switch (timePeriod) {
      case "1D":
        return index.day_changeP;
      case "1W":
        return index.week_changeP;
      case "1M":
        return index.month_changeP;
      case "3M":
        return index.qtr_changeP;
      case "1Y":
        return index.year_changeP;
      case "2Y":
        return index.three_year_changeP; // Using 3Y as proxy for 2Y
      case "5Y":
        return index.five_year_changeP;
      default:
        return index.week_changeP;
    }
  };

  // Filter by exchange and sort based on active tab
  const getProcessedData = () => {
    let filtered = indicesData.filter((index) => {
      const name = index.stock_column.get_full_name.toLowerCase();
      if (exchange === "NSE") {
        return name.includes("nifty") || name.includes("nse");
      } else {
        return name.includes("bse") || name.includes("sensex") || name.includes("s&p bse");
      }
    });

    // If no specific filter matches, show all
    if (filtered.length === 0) {
      filtered = indicesData;
    }

    // Sort based on active tab
    if (activeTab === "gainers") {
      return filtered.sort((a, b) => getChangeForPeriod(b) - getChangeForPeriod(a));
    } else if (activeTab === "losers") {
      return filtered.sort((a, b) => getChangeForPeriod(a) - getChangeForPeriod(b));
    }

    return filtered;
  };

  const processedData = getProcessedData();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
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
            ) : processedData.length === 0 ? (
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
                    {processedData.map((index, idx) => {
                      const changePercent = getChangeForPeriod(index);
                      const isPositive = changePercent >= 0;
                      const change = (index.currentPrice * changePercent) / (100 + changePercent);

                      return (
                        <tr
                          key={idx}
                          className="border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/index-detail?index=${encodeURIComponent(index.stock_column.get_full_name)}`)}
                        >
                          <td className="py-4 px-6">
                            <span className="font-medium text-foreground">{index.stock_column.get_full_name}</span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="font-semibold text-foreground">
                              {index.currentPrice?.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span
                              className={`flex items-center justify-end gap-1 ${isPositive ? "text-success" : "text-destructive"}`}
                            >
                              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {isPositive ? "+" : ""}
                              {change?.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span
                              className={`flex items-center justify-end gap-1 ${isPositive ? "text-success" : "text-destructive"}`}
                            >
                              {isPositive ? "▲" : "▼"} {isPositive ? "+" : ""}
                              {changePercent?.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="text-muted-foreground text-sm">{getCurrentTime()}</span>
                          </td>
                        </tr>
                      );
                    })}
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
