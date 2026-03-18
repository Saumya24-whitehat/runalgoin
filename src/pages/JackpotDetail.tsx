import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { supabase } from "@/integrations/supabase/client";

interface AverageData {
  ChangePCT: string;
  ChangePCT3Day: string;
  ChangePCT5Day: string;
  Action: string;
  Action3Day: string;
  Action5Day: string;
  DelPCT: string;
  DelPCT3Day: string;
  DelPCT5Day: string;
}

interface OIData {
  "Near Expiry": string;
  "Next Expiry": string;
  "Far Expiry": string;
  "Near OI": string;
  "Next OI": string;
  "Far OI": string;
  "Near COI": string;
  "Next COI": string;
  "Far COI": string;
  "Near COI %": string;
  "Next COI %": string;
  "Far COI %": string;
}

interface HistoricalRow {
  date: string;
  closePrice: number;
  priceChange: number;
  priceChangePct: number;
  deliveryPct: number;
  vwap: number;
  action: number;
  avgDeliveryPct: number;
  isJackpot: boolean;
  oi: number;
  coi: number;
  coiPct: number;
  trend: string;
  trendType: "longBuildup" | "longUnwinding" | "shortBuildup" | "shortCovering" | "neutral";
}

const STOCK_SYMBOLS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR", "SBIN", "BHARTIARTL",
  "KOTAKBANK", "ITC", "LT", "AXISBANK", "ASIANPAINT", "MARUTI", "TITAN", "BAJFINANCE",
  "SUNPHARMA", "ULTRACEMCO", "NTPC", "POWERGRID", "TECHM", "ONGC", "TATASTEEL", "NESTLEIND",
  "BAJAJFINSV", "HCLTECH", "WIPRO", "COALINDIA", "TATAMOTORS", "ADANIENT", "ADANIPORTS",
  "DIVISLAB", "GRASIM", "BRITANNIA", "INDUSINDBK", "CIPLA", "EICHERMOT", "DRREDDY",
  "APOLLOHOSP", "HINDALCO", "JSWSTEEL", "SBILIFE", "BPCL", "TATACONSUM", "HEROMOTOCO"
];

const JackpotDetail = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [symbol, setSymbol] = useState(searchParams.get("symbol") || "RELIANCE");
  const [data, setData] = useState<[AverageData, OIData, string[][]] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: response, error } = await supabase.functions.invoke("jackpot-symbol-data", {
          body: { symbol },
        });
        if (!error && response) {
          setData(response);
          setLastRefresh(new Date());
        }
      } catch (err) {
        console.error("Error fetching jackpot data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 180000);
    return () => clearInterval(interval);
  }, [symbol]);

  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
    setSearchParams({ symbol: newSymbol });
  };

  const parseHistoricalData = (rawData: string[][]): HistoricalRow[] => {
    return rawData.map((row) => {
      const deliveryPct = parseFloat(row[10]) || 0;
      const avgDeliveryPct = parseFloat(row[16]) || 0;
      const action = parseFloat(row[12]) || 0;
      const avgAction = parseFloat(row[14]) || 0;
      const coi = parseFloat(row[24]) || 0;
      const priceChange = parseFloat(row[31]) || 0;

      const isJackpot = deliveryPct > avgDeliveryPct && action > avgAction;

      let trend = "-";
      let trendType: HistoricalRow["trendType"] = "neutral";
      if (coi > 0 && priceChange > 0) {
        trend = "Long Buildup";
        trendType = "longBuildup";
      } else if (coi < 0 && priceChange > 0) {
        trend = "Short Covering";
        trendType = "shortCovering";
      } else if (coi > 0 && priceChange < 0) {
        trend = "Short Buildup";
        trendType = "shortBuildup";
      } else if (coi < 0 && priceChange < 0) {
        trend = "Long Unwinding";
        trendType = "longUnwinding";
      }

      return {
        date: row[0] || "",
        closePrice: parseFloat(row[26]) || 0,
        priceChange: parseFloat(row[31]) || 0,
        priceChangePct: parseFloat(row[32]) || 0,
        deliveryPct,
        vwap: parseFloat(row[11]) || 0,
        action,
        avgDeliveryPct,
        isJackpot,
        oi: parseFloat(row[7]) || 0,
        coi,
        coiPct: parseFloat(row[23]) || 0,
        trend,
        trendType,
      };
    }).reverse();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const average = data?.[0];
  const oiData = data?.[1];
  const historicalData = data?.[2] ? parseHistoricalData(data[2]) : [];

  const getTrendStyle = (trendType: HistoricalRow["trendType"]) => {
    switch (trendType) {
      case "longBuildup":
        return "bg-green-500/80 text-black font-semibold";
      case "shortCovering":
        return "text-green-400";
      case "shortBuildup":
        return "bg-red-400/80 text-black font-semibold";
      case "longUnwinding":
        return "text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TickerRibbon />
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Header with back button and symbol selector */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate("/jackpot-scanner")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">Select Symbol:</span>
            <Select value={symbol} onValueChange={handleSymbolChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select symbol" />
              </SelectTrigger>
              <SelectContent>
                {STOCK_SYMBOLS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => navigate("/jackpot-scanner")} className="bg-primary">
            Screener
          </Button>
          <div className="ml-auto">
            <LastRefreshBadge lastRefresh={lastRefresh} isFetching={isLoading} />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading data...</div>
        ) : (
          <>
            {/* Top Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Average Table */}
              <Card className="border-border">
                <CardHeader className="py-2 px-4 bg-secondary/30">
                  <CardTitle className="text-sm font-medium text-foreground">Average</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/20">
                        <th className="p-2 text-left text-muted-foreground">Average</th>
                        <th className="p-2 text-center text-muted-foreground">% Price Chng</th>
                        <th className="p-2 text-center text-muted-foreground">% Delivery</th>
                        <th className="p-2 text-center text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="p-2 text-foreground">One Day</td>
                        <td className={`p-2 text-center ${parseFloat(average?.ChangePCT || "0") > 0 ? "text-green-400" : "text-red-400"}`}>
                          {parseFloat(average?.ChangePCT || "0").toFixed(2)}%
                        </td>
                        <td className="p-2 text-center text-foreground">{parseFloat(average?.DelPCT || "0").toFixed(2)}%</td>
                        <td className="p-2 text-center text-foreground">{parseFloat(average?.Action || "0").toFixed(0)}</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="p-2 text-foreground">Three Days</td>
                        <td className={`p-2 text-center ${parseFloat(average?.ChangePCT3Day || "0") > 0 ? "text-green-400" : "text-red-400"}`}>
                          {parseFloat(average?.ChangePCT3Day || "0").toFixed(2)}%
                        </td>
                        <td className="p-2 text-center text-foreground">{parseFloat(average?.DelPCT3Day || "0").toFixed(2)}%</td>
                        <td className="p-2 text-center text-foreground">{parseFloat(average?.Action3Day || "0").toFixed(0)}</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-foreground">Five Days</td>
                        <td className={`p-2 text-center ${parseFloat(average?.ChangePCT5Day || "0") > 0 ? "text-green-400" : "text-red-400"}`}>
                          {parseFloat(average?.ChangePCT5Day || "0").toFixed(2)}%
                        </td>
                        <td className="p-2 text-center text-foreground">{parseFloat(average?.DelPCT5Day || "0").toFixed(2)}%</td>
                        <td className="p-2 text-center text-foreground">{parseFloat(average?.Action5Day || "0").toFixed(0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Future OI Table */}
              <Card className="border-border">
                <CardHeader className="py-2 px-4 bg-secondary/30">
                  <CardTitle className="text-sm font-medium text-foreground">Future OI</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/20">
                        <th className="p-2 text-left text-muted-foreground">Expiry</th>
                        <th className="p-2 text-center text-muted-foreground">OI</th>
                        <th className="p-2 text-center text-muted-foreground">Chng in OI</th>
                        <th className="p-2 text-center text-muted-foreground">% COI</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="p-2 text-foreground">{oiData?.["Near Expiry"]}</td>
                        <td className="p-2 text-center text-foreground">{parseFloat(oiData?.["Near OI"] || "0").toLocaleString()}</td>
                        <td className="p-2 text-center text-foreground">{parseFloat(oiData?.["Near COI"] || "0").toLocaleString()}</td>
                        <td className="p-2 text-center text-foreground">{parseFloat(oiData?.["Near COI %"] || "0").toFixed(0)}%</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="p-2 text-foreground">{oiData?.["Next Expiry"]}</td>
                        <td className="p-2 text-center text-foreground">{parseFloat(oiData?.["Next OI"] || "0").toLocaleString()}</td>
                        <td className="p-2 text-center text-foreground">{parseFloat(oiData?.["Next COI"] || "0").toLocaleString()}</td>
                        <td className="p-2 text-center text-foreground">{parseFloat(oiData?.["Next COI %"] || "0").toFixed(0)}%</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-foreground">{oiData?.["Far Expiry"]}</td>
                        <td className="p-2 text-center text-foreground">{parseFloat(oiData?.["Far OI"] || "0").toLocaleString()}</td>
                        <td className="p-2 text-center text-foreground">{parseFloat(oiData?.["Far COI"] || "0").toLocaleString()}</td>
                        <td className="p-2 text-center text-foreground">{parseFloat(oiData?.["Far COI %"] || "0").toFixed(0)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            {/* Historical Data Table */}
            <Card className="border-border">
              <CardHeader className="py-2 px-4 bg-secondary/30">
                <CardTitle className="text-sm font-medium text-foreground">Historical Data</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-secondary/50 z-10">
                      <tr className="border-b border-border">
                        <th className="p-2 text-left text-muted-foreground">Date</th>
                        <th className="p-2 text-center text-muted-foreground">Close Price</th>
                        <th className="p-2 text-center text-muted-foreground">Price Change</th>
                        <th className="p-2 text-center text-muted-foreground">% Price Change</th>
                        <th className="p-2 text-center text-muted-foreground">% Delivery</th>
                        <th className="p-2 text-center text-muted-foreground">VWAP</th>
                        <th className="p-2 text-center text-muted-foreground">Action</th>
                        <th className="p-2 text-center text-muted-foreground">Avg Delivery %</th>
                        <th className="p-2 text-center text-muted-foreground">Jackpot</th>
                        <th className="p-2 text-center text-muted-foreground">OI</th>
                        <th className="p-2 text-center text-muted-foreground">COI</th>
                        <th className="p-2 text-center text-muted-foreground">COI %</th>
                        <th className="p-2 text-center text-muted-foreground">Logic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicalData.map((row, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-secondary/20">
                          <td className="p-2 text-foreground">{row.date}</td>
                          <td className="p-2 text-center text-foreground">{row.closePrice.toFixed(2)}</td>
                          <td className="p-2 text-center text-foreground">{row.priceChange.toFixed(2)}</td>
                          <td className="p-2 text-center text-foreground">{row.priceChangePct.toFixed(2)}%</td>
                          <td className="p-2 text-center text-foreground">{row.deliveryPct.toFixed(2)}%</td>
                          <td className="p-2 text-center text-foreground">{row.vwap.toFixed(2)}</td>
                          <td className="p-2 text-center text-foreground">{row.action.toFixed(0)}</td>
                          <td className="p-2 text-center text-foreground">{row.avgDeliveryPct.toFixed(2)}%</td>
                          <td className="p-2 text-center">
                            {row.isJackpot && (
                              <span className="bg-yellow-300 text-black font-bold px-2 py-0.5 rounded text-[10px]">
                                JACKPOT
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center text-foreground">{row.oi.toLocaleString()}</td>
                          <td className="p-2 text-center text-foreground">{row.coi.toLocaleString()}</td>
                          <td className="p-2 text-center text-foreground">{row.coiPct.toFixed(2)}%</td>
                          <td className={`p-2 text-center ${getTrendStyle(row.trendType)}`}>{row.trend}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default JackpotDetail;
