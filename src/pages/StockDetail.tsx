import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Maximize2, Loader2, MoreVertical } from "lucide-react";
import {
  StockOverview,
  fetchStockOverview,
  formatMarketCap,
  formatPrice,
  formatPercentage,
} from "@/services/stockDetailApi";
import { StockDetailChart } from "@/components/stockDetail/StockDetailChart";
import { StockDetailOverview } from "@/components/stockDetail/StockDetailOverview";
import { StockDetailFinancials } from "@/components/stockDetail/StockDetailFinancials";
import { StockDetailOptions } from "@/components/stockDetail/StockDetailOptions";
import { StockDetailPeers } from "@/components/stockDetail/StockDetailPeers";
import { StockDetailTechnicals } from "@/components/stockDetail/StockDetailTechnicals";

const StockDetail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const symbol = searchParams.get("symbol") || "ITC";
  const sector = searchParams.get("sector") || "All";
  const [activeTab, setActiveTab] = useState("chart");
  const [stockData, setStockData] = useState<StockOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await fetchStockOverview(symbol);
        if (data) {
          setStockData(data);
        }
        setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " IST");
      } catch (error) {
        console.error("Error fetching stock data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [symbol]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TickerRibbon />
      <Navbar />

      <div className="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full border border-border shrink-0 h-8 w-8 sm:h-9 sm:w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <img
                  src={`https://runalgo.xyz/top/chart/data/svg/nse_${symbol}.svg`}
                  alt={`Chart for ${symbol}`}
                  className="w-6 h-6 sm:w-8 sm:h-8"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-sm sm:text-xl font-bold text-foreground truncate">
                    {stockData?.company_name || symbol}
                  </h1>
                  <Badge
                    variant="secondary"
                    className="text-[10px] sm:text-xs bg-primary text-primary-foreground shrink-0"
                  >
                    NSE
                  </Badge>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase truncate">
                  {stockData?.sector || "Loading..."}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 shrink-0">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              stockData && (
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <span className="text-base sm:text-2xl font-bold text-foreground">
                    {formatPrice(stockData.close)}
                  </span>
                  <span
                    className={`text-[10px] sm:text-sm font-medium ${stockData.change >= 0 ? "text-emerald-500" : "text-red-500"}`}
                  >
                    {formatPercentage(stockData.change)}
                  </span>
                </div>
              )
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="rounded-full border border-border h-8 w-8 sm:h-9 sm:w-9">
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-border h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex"
            >
              <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-border h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex"
            >
              <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        {stockData && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4 py-2">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase">Market Cap</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {formatMarketCap(stockData.market_cap_basic)}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                Last updated: {lastUpdated}
              </p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase">P/E Ratio</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {stockData.price_earnings_ttm?.toFixed(2) || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase">Div Yield</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {stockData.dividends_yield_current?.toFixed(1)}%
              </p>
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase">EPS</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                ₹{stockData.earnings_per_share_diluted_ttm?.toFixed(2)}
              </p>
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase">Volume</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {stockData.volume?.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="bg-muted/30 border border-border w-max sm:w-full justify-start">
              <TabsTrigger value="chart" className="data-[state=active]:bg-background text-xs sm:text-sm">
                Chart
              </TabsTrigger>
              <TabsTrigger value="overview" className="data-[state=active]:bg-background text-xs sm:text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="financials" className="data-[state=active]:bg-background text-xs sm:text-sm">
                Financials
              </TabsTrigger>
              <TabsTrigger value="options" className="data-[state=active]:bg-background text-xs sm:text-sm">
                Options
              </TabsTrigger>
              <TabsTrigger value="peers" className="data-[state=active]:bg-background text-xs sm:text-sm">
                Peers
              </TabsTrigger>
              <TabsTrigger value="technicals" className="data-[state=active]:bg-background text-xs sm:text-sm">
                Technicals
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chart" className="mt-3 sm:mt-4">
            <StockDetailChart symbol={symbol} />
          </TabsContent>

          <TabsContent value="overview" className="mt-4">
            <StockDetailOverview symbol={symbol} />
          </TabsContent>

          <TabsContent value="financials" className="mt-4">
            <StockDetailFinancials symbol={symbol} />
          </TabsContent>

          <TabsContent value="options" className="mt-4">
            <StockDetailOptions symbol={symbol} />
          </TabsContent>

          <TabsContent value="peers" className="mt-4">
            <StockDetailPeers symbol={symbol} sector={stockData?.sector || ""} />
          </TabsContent>

          <TabsContent value="technicals" className="mt-4">
            <StockDetailTechnicals symbol={symbol} sector={stockData?.sector || ""} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StockDetail;
