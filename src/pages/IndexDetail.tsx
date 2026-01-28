import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Maximize2, Loader2, Wifi, WifiOff } from "lucide-react";
import { fetchMarketBreadthData } from "@/services/marketBreadthApi";
import { getIndexSymbol } from "@/services/indexDetailApi";
import { IndexDetailChart } from "@/components/indexDetail/IndexDetailChart";
import { IndexDetailStocks } from "@/components/indexDetail/IndexDetailStocks";
import { IndexDetailTechnicals } from "@/components/indexDetail/IndexDetailTechnicals";
import { IndexDetailBreadth } from "@/components/indexDetail/IndexDetailBreadth";
import { IndexDetailDeliveries } from "@/components/indexDetail/IndexDetailDeliveries";
import { IndexDetailShareholding } from "@/components/indexDetail/IndexDetailShareholding";
import { upstoxWebSocket } from "@/services/upstoxWebSocket";

// Index token mapping for Upstox WebSocket
const INDEX_TOKEN_MAP: Record<string, string> = {
  "NIFTY 50": "NSE_INDEX|Nifty 50",
  "NIFTY BANK": "NSE_INDEX|Nifty Bank",
  "NIFTY IT": "NSE_INDEX|Nifty IT",
  "NIFTY METAL": "NSE_INDEX|Nifty Metal",
  "NIFTY PHARMA": "NSE_INDEX|Nifty Pharma",
  "NIFTY AUTO": "NSE_INDEX|Nifty Auto",
  "NIFTY ENERGY": "NSE_INDEX|NIFTY ENERGY",
  "NIFTY FMCG": "NSE_INDEX|Nifty FMCG",
  "NIFTY REALTY": "NSE_INDEX|Nifty Realty",
  "NIFTY INFRA": "NSE_INDEX|Nifty Infra",
  "NIFTY PSE": "NSE_INDEX|Nifty PSE",
  "NIFTY MEDIA": "NSE_INDEX|Nifty Media",
  "NIFTY PRIVATE BANK": "NSE_INDEX|Nifty Pvt Bank",
  "NIFTY PSU BANK": "NSE_INDEX|Nifty PSU Bank",
  "NIFTY FIN SERVICE": "NSE_INDEX|Nifty Fin Service",
  "NIFTY NEXT 50": "NSE_INDEX|Nifty Next 50",
  "NIFTY MIDCAP 50": "NSE_INDEX|NIFTY MID SELECT",
  "NIFTY 100": "NSE_INDEX|NIFTY 100",
  "NIFTY 200": "NSE_INDEX|NIFTY 200",
  "NIFTY 500": "NSE_INDEX|NIFTY 500",
  "NIFTY COMMODITIES": "NSE_INDEX|Nifty Commodities",
  "NIFTY CONSUMPTION": "NSE_INDEX|Nifty Consumption",
  "NIFTY CPSE": "NSE_INDEX|Nifty CPSE",
  "NIFTY MNC": "NSE_INDEX|Nifty MNC",
  "NIFTY OIL & GAS": "NSE_INDEX|Nifty Oil & Gas",
  "SENSEX": "BSE_INDEX|SENSEX",
  "BANK NIFTY": "NSE_INDEX|Nifty Bank",
  "FINNIFTY": "NSE_INDEX|Nifty Fin Service",
  "MIDCPNIFTY": "NSE_INDEX|NIFTY MID SELECT",
};

const getIndexToken = (indexName: string): string => {
  const upperName = indexName.toUpperCase();
  return INDEX_TOKEN_MAP[upperName] || `NSE_INDEX|${indexName}`;
};

const IndexDetail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const indexName = searchParams.get("index") || "NIFTY 50";
  const [activeTab, setActiveTab] = useState("chart");
  const [indexData, setIndexData] = useState<{ ltp: number; change: number; changePct: number } | null>(null);
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

  const indexSymbol = getIndexSymbol(indexName);
  const indexToken = getIndexToken(indexName);

  useEffect(() => {
    const fetchIndexPrice = async () => {
      setLoading(true);
      try {
        const data = await fetchMarketBreadthData(indexSymbol);
        if (data && data.content && data.content.length > 0) {
          // Calculate average or get index data
          const advances = data.content.filter(s => s.changePct > 0).length;
          const declines = data.content.filter(s => s.changePct < 0).length;
          
          // For now, we'll show placeholder data - real implementation would fetch actual index price
          setIndexData({
            ltp: 25982.70,
            change: 72.65,
            changePct: 0.3
          });
        }
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (error) {
        console.error('Error fetching index price:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIndexPrice();
    // Only poll every 5 minutes as backup when WebSocket is connected
    const interval = setInterval(fetchIndexPrice, 300000);
    return () => clearInterval(interval);
  }, [indexSymbol]);

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
            // Check if this update is for our index
            if (token === indexToken || token.includes(indexToken.split('|')[1])) {
              const newLtp = update.data.ltp;
              const prevClose = update.data.prev_close || indexData?.ltp || 0;
              
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
              setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            }
          });
        });

        const connected = await upstoxWebSocket.connect();
        setWsConnected(connected);

        if (connected) {
          // Subscribe to index token
          upstoxWebSocket.subscribe([indexToken]);
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
  }, [indexToken, indexData?.ltp]);

  // Re-subscribe when index changes
  useEffect(() => {
    if (wsConnected) {
      upstoxWebSocket.subscribe([indexToken]);
    }
  }, [indexToken, wsConnected]);

  // Use live data if available, otherwise use static data
  const displayPrice = livePrice ?? indexData?.ltp ?? 0;
  const displayChange = liveChange ?? indexData?.change ?? 0;
  const displayChangePct = liveChangePct ?? indexData?.changePct ?? 0;

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
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{indexName}</h1>
                <Badge variant="secondary" className="text-xs">NSE</Badge>
              </div>
              
              {loading && !livePrice ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (displayPrice > 0) && (
                <div className="flex items-center gap-2 mt-1">
                  <span 
                    className={`text-lg font-semibold transition-colors duration-300 ${
                      tickDirection === 'up' ? 'text-emerald-500' : 
                      tickDirection === 'down' ? 'text-red-500' : 
                      'text-foreground'
                    }`}
                  >
                    {displayPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`text-sm font-medium ${displayChangePct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {displayChangePct >= 0 ? '+' : ''}{displayChange.toFixed(2)} ({displayChangePct >= 0 ? '+' : ''}{displayChangePct.toFixed(2)}%)
                  </span>
                  {wsConnected ? (
                    <Wifi className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full border border-border">
              <Star className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full border border-border">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/30 border border-border w-full justify-start overflow-x-auto">
            <TabsTrigger value="chart" className="data-[state=active]:bg-background">Chart</TabsTrigger>
            <TabsTrigger value="stocks" className="data-[state=active]:bg-background">Stocks</TabsTrigger>
            <TabsTrigger value="technicals" className="data-[state=active]:bg-background">Stock Technicals</TabsTrigger>
            <TabsTrigger value="breadth" className="data-[state=active]:bg-background">Index Breadth</TabsTrigger>
            <TabsTrigger value="deliveries" className="data-[state=active]:bg-background">Deliveries</TabsTrigger>
            <TabsTrigger value="shareholding" className="data-[state=active]:bg-background">Shareholding</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-4">
            <IndexDetailChart indexName={indexName} />
          </TabsContent>

          <TabsContent value="stocks" className="mt-4">
            <IndexDetailStocks indexSymbol={indexSymbol} />
          </TabsContent>

          <TabsContent value="technicals" className="mt-4">
            <IndexDetailTechnicals indexSymbol={indexSymbol} />
          </TabsContent>

          <TabsContent value="breadth" className="mt-4">
            <IndexDetailBreadth indexSymbol={indexSymbol} />
          </TabsContent>

          <TabsContent value="deliveries" className="mt-4">
            <IndexDetailDeliveries indexSymbol={indexSymbol} />
          </TabsContent>

          <TabsContent value="shareholding" className="mt-4">
            <IndexDetailShareholding indexSymbol={indexSymbol} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default IndexDetail;
