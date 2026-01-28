import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Maximize2, Loader2 } from "lucide-react";
import { fetchMarketBreadthData } from "@/services/marketBreadthApi";
import { getIndexSymbol } from "@/services/indexDetailApi";
import { IndexDetailChart } from "@/components/indexDetail/IndexDetailChart";
import { IndexDetailStocks } from "@/components/indexDetail/IndexDetailStocks";
import { IndexDetailTechnicals } from "@/components/indexDetail/IndexDetailTechnicals";
import { IndexDetailBreadth } from "@/components/indexDetail/IndexDetailBreadth";
import { IndexDetailDeliveries } from "@/components/indexDetail/IndexDetailDeliveries";
import { IndexDetailShareholding } from "@/components/indexDetail/IndexDetailShareholding";

const IndexDetail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const indexName = searchParams.get("index") || "NIFTY 50";
  const [activeTab, setActiveTab] = useState("chart");
  const [indexData, setIndexData] = useState<{ ltp: number; change: number; changePct: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const indexSymbol = getIndexSymbol(indexName);

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
    const interval = setInterval(fetchIndexPrice, 60000);
    return () => clearInterval(interval);
  }, [indexSymbol]);

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
              
              {loading ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : indexData && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-semibold text-foreground">
                    {indexData.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`text-sm font-medium ${indexData.changePct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {indexData.changePct >= 0 ? '+' : ''}{indexData.change.toFixed(2)} ({indexData.changePct >= 0 ? '+' : ''}{indexData.changePct.toFixed(2)}%)
                  </span>
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
