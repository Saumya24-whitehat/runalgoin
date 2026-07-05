import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { PageInfoModal } from "@/components/PageInfoModal";

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

const TAB_CONFIG: { value: string; label: string; key: keyof TrendingStocksData; isGainer?: boolean }[] = [
  { value: "topgainers", label: "Top Gainers", key: "TOP_GAINERS", isGainer: true },
  { value: "toplosers", label: "Top Losers", key: "TOP_LOSERS", isGainer: false },
  { value: "volumeshockers", label: "Volume Shockers", key: "VOLUME_SHOCKERS" },
  { value: "topvolume", label: "Top Volume", key: "TRADED_BY_VOLUME" },
  { value: "52weekhigh", label: "52W High", key: "YEARLY_HIGH" },
  { value: "52weeklow", label: "52W Low", key: "YEARLY_LOW", isGainer: false },
  { value: "mostvisited", label: "Most Popular", key: "MOST_VISITED" },
];

export default function TrendingStocks() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<TrendingStocksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const activeTab = searchParams.get("tab") || "topgainers";

  const fetchData = async () => {
    try {
      const res = await supabase.functions.invoke("trending-stocks");
      if (!res.error && res.data) {
        setData(res.data as TrendingStocksData);
        setLastRefresh(new Date());
      }
    } catch (e) {
      console.error("trending-stocks fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, []);

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
  };

  const renderTable = (stocks: TrendingStock[] | undefined) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      );
    }
    if (!stocks || stocks.length === 0) {
      return <div className="text-center py-16 text-muted-foreground">No data available</div>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-left">
              <th className="py-2 px-2 font-medium">#</th>
              <th className="py-2 px-2 font-medium">Company</th>
              <th className="py-2 px-2 font-medium">Symbol</th>
              <th className="py-2 px-2 font-medium text-right">LTP</th>
              <th className="py-2 px-2 font-medium text-right">Prev Close</th>
              <th className="py-2 px-2 font-medium text-right">Change %</th>
              <th className="py-2 px-2 font-medium text-right">52W High</th>
              <th className="py-2 px-2 font-medium text-right">52W Low</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, idx) => {
              const ltp = parseFloat(stock.ltp);
              const close = parseFloat(stock.close);
              const change = close ? ((ltp - close) / close) * 100 : 0;
              const isPositive = change >= 0;
              return (
                <tr
                  key={`${stock.nseScriptCode}-${idx}`}
                  className="border-b border-border/50 hover:bg-secondary/40 cursor-pointer transition-colors"
                  onClick={() => navigate(`/stock-detail?symbol=${stock.nseScriptCode}`)}
                >
                  <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center overflow-hidden shrink-0"
                        style={{ backgroundColor: "#2a2e39" }}
                      >
                        <img
                          src={`https://runalgo.xyz/top/chart/data/svg/nse_${stock.nseScriptCode}.svg`}
                          alt={stock.nseScriptCode}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const t = e.target as HTMLImageElement;
                            t.style.display = "none";
                            t.parentElement!.innerHTML = `<span class="text-[10px] font-bold text-white">${stock.companyName.charAt(0)}</span>`;
                          }}
                        />
                      </div>
                      <span className="font-medium truncate max-w-[220px]">{stock.companyName}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{stock.nseScriptCode}</td>
                  <td className="py-2 px-2 text-right font-medium">₹{ltp.toLocaleString("en-IN")}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">₹{close.toLocaleString("en-IN")}</td>
                  <td className={`py-2 px-2 text-right font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
                    {isPositive ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                  </td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{stock.yearHigh}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{stock.yearLow}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl sm:text-2xl font-semibold">Trending Stocks</h1>
          <div className="flex items-center gap-2">
            <LastRefreshBadge lastRefresh={lastRefresh} />
            <PageInfoModal
              title="Trending Stocks"
              subtitle="Live movers across the NSE universe"
              overview="Real-time snapshot of the most active names on the NSE — top gainers, losers, volume shockers, most-traded, 52-week highs/lows and popular tickers. Auto-refreshes every minute."
              legend={[
                { label: "Top Gainers / Losers", text: "Largest % move vs previous close", color: "#10b981" },
                { label: "Volume Shockers", text: "Unusual volume spikes vs their 20-day average", color: "#f59e0b" },
                { label: "Top Volume", text: "Highest traded quantity today", color: "#3b82f6" },
                { label: "52W High / Low", text: "Stocks hitting yearly extremes — momentum extremes", color: "#ef4444" },
                { label: "Most Popular", text: "Most-viewed tickers on the platform — crowd attention" },
              ]}
              sections={[
                {
                  heading: "Why It Matters",
                  body: "Movers lists are the fastest way to spot rotation, news-driven bursts, and unusual institutional activity before it shows up in slower scans.",
                },
              ]}
              howToUse="Scan gainers/losers for the day's leaders, cross-check volume shockers for genuine participation, and click any ticker to open Stock Detail for deeper analysis."
              tips={[
                "A gainer without volume support often fades — always confirm with volume.",
                "Repeat appearances in volume shockers over 2-3 sessions signal accumulation/distribution.",
                "52W highs breaking on high volume are stronger continuation candidates than isolated spikes.",
              ]}
            />
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg font-semibold">Market Movers</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <TabsList className="bg-transparent border-b border-border rounded-none w-max sm:w-full justify-start gap-3 sm:gap-6 h-auto p-0 mb-4">
                  {TAB_CONFIG.map((t) => (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 whitespace-nowrap text-xs sm:text-sm"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {TAB_CONFIG.map((t) => (
                <TabsContent key={t.value} value={t.value}>
                  {renderTable(data?.[t.key])}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
