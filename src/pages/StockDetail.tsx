import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Maximize2, Loader2, MoreVertical, Wifi, WifiOff } from "lucide-react";
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
import { upstoxWebSocket } from "@/services/upstoxWebSocket";

const StockDetail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const symbol = searchParams.get("symbol") || "ITC";
  const sector = searchParams.get("sector") || "All";
  const [activeTab, setActiveTab] = useState("chart");
  const [stockData, setStockData] = useState<StockOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Live data state
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [liveChange, setLiveChange] = useState<number | null>(null);
  const [liveChangePct, setLiveChangePct] = useState<number | null>(null);
  const [tickDirection, setTickDirection] = useState<'up' | 'down' | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsInitialized = useRef(false);
  const prevLtpRef = useRef<number | null>(null);

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
    // Only poll every 5 minutes as backup when WebSocket is connected
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [symbol]);

  // Initialize WebSocket for live data
  useEffect(() => {
    if (wsInitialized.current) return;

    const initWebSocket = async () => {
      try {
        wsInitialized.current = true;

        // Set up feed callback
        upstoxWebSocket.setFeedCallback((updates) => {
          updates.forEach((update) => {
            const token = update.token;
            // Check if this update is for our stock (NSE_EQ format)
            if (token.includes(`NSE_EQ|${symbol}`) || token === `NSE_EQ|${symbol}`) {
              const newLtp = update.data.ltp;
              const prevClose = update.data.prev_close || stockData?.price || 0;
              
              // Determine tick direction
              if (prevLtpRef.current !== null && newLtp !== prevLtpRef.current) {
                setTickDirection(newLtp > prevLtpRef.current ? 'up' : 'down');
                // Reset tick direction after animation
                setTimeout(() => setTickDirection(null), 500);
              }
              prevLtpRef.current = newLtp;

              setLivePrice(newLtp);
              if (prevClose > 0) {
                const change = newLtp - prevClose;
                const changePct = (change / prevClose) * 100;
                setLiveChange(change);
                setLiveChangePct(changePct);
              }
              setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " IST");
            }
          });
        });

        const connected = await upstoxWebSocket.connect();
        setWsConnected(connected);

        if (connected) {
          // Subscribe to stock token (NSE equity format)
          upstoxWebSocket.subscribe([`NSE_EQ|${symbol}`]);
        }
      } catch (error) {
        console.error("WebSocket initialization error:", error);
        setWsConnected(false);
      }
    };

    initWebSocket();

    return () => {
      // Don't disconnect - keep connection persistent
    };
  }, [symbol, stockData?.price]);

  // Re-subscribe when symbol changes
  useEffect(() => {
    if (wsConnected) {
      upstoxWebSocket.subscribe([`NSE_EQ|${symbol}`]);
    }
  }, [symbol, wsConnected]);

  // Use live data if available, otherwise use static data
  const displayPrice = livePrice ?? stockData?.price ?? 0;
  const displayChange = liveChange ?? (stockData ? stockData.price - (stockData.price / (1 + stockData.change_percent / 100)) : 0);
  const displayChangePct = liveChangePct ?? stockData?.change_percent ?? 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TickerRibbon />
      <Navbar />

      <div className="flex-1 p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full border border-border"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <img src={`https://runalgo.xyz/top/chart/data/svg/nse_${symbol}.svg`} alt={`Chart for ${symbol}`} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{stockData?.company_name || symbol}</h1>
                  <Badge variant="secondary" className="text-xs bg-primary text-primary-foreground">
                    NSE
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground uppercase">{stockData?.sector || "Loading..."}</p>
              </div>
            </div>

            {loading && !livePrice ? (
              <div className="flex items-center gap-2 ml-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              (stockData || livePrice) && (
                <div className="flex items-center gap-2 ml-4">
                  <span 
                    className={`text-2xl font-bold transition-colors duration-300 ${
                      tickDirection === 'up' ? 'text-emerald-500' : 
                      tickDirection === 'down' ? 'text-red-500' : 
                      'text-foreground'
                    }`}
                  >
                    {formatPrice(displayPrice)}
                  </span>
                  <span
                    className={`text-sm font-medium ${displayChangePct >= 0 ? "text-emerald-500" : "text-red-500"}`}
                  >
                    {displayChangePct >= 0 ? '+' : ''}{displayChange.toFixed(2)} ({displayChangePct >= 0 ? '+' : ''}{displayChangePct.toFixed(2)}%)
                  </span>
                  {wsConnected ? (
                    <Wifi className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full border border-border">
              <Star className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full border border-border">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full border border-border">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        {stockData && (
          <div className="grid grid-cols-5 gap-4 py-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Market Cap</p>
              <p className="text-sm font-semibold text-foreground">{formatMarketCap(stockData.market_cap)}</p>
              <p className="text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">P/E Ratio</p>
              <p className="text-sm font-semibold text-foreground">{stockData.pe_ratio?.toFixed(2) || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Dividend Yield</p>
              <p className="text-sm font-semibold text-foreground">{stockData.dividend_yield?.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">EPS</p>
              <p className="text-sm font-semibold text-foreground">₹{stockData.eps?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Volume</p>
              <p className="text-sm font-semibold text-foreground">{stockData.volume?.toLocaleString("en-IN")}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/30 border border-border w-full justify-start overflow-x-auto">
            <TabsTrigger value="chart" className="data-[state=active]:bg-background">
              Chart
            </TabsTrigger>
            <TabsTrigger value="overview" className="data-[state=active]:bg-background">
              Overview
            </TabsTrigger>
            <TabsTrigger value="financials" className="data-[state=active]:bg-background">
              Financials
            </TabsTrigger>
            <TabsTrigger value="options" className="data-[state=active]:bg-background">
              Options
            </TabsTrigger>
            <TabsTrigger value="peers" className="data-[state=active]:bg-background">
              Peers
            </TabsTrigger>
            <TabsTrigger value="technicals" className="data-[state=active]:bg-background">
              Technicals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-4">
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
