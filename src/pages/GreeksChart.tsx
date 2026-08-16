import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GreeksChartControls } from "@/components/greeksChart/GreeksChartControls";
import { CombinedGreeksChart } from "@/components/greeksChart/CombinedGreeksChart";
import { IndividualGreeksChart } from "@/components/greeksChart/IndividualGreeksChart";
import { fetchCombinedGreeksData, ParsedGreeksData } from "@/services/greeksChartApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { PageInfoModal } from "@/components/PageInfoModal";
import { MobileSymbolExpiryBar } from "@/components/mobile/MobileSymbolExpiryBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

const GreeksChart = () => {
  const { toast } = useToast();
  const [symbols, setSymbols] = useState<SymbolGroup>({ indexSymbols: [], stockSymbols: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [strikes, setStrikes] = useState<number[]>([]);

  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [selectedStrike, setSelectedStrike] = useState(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState("3min");
  const [activeTab, setActiveTab] = useState("combined");

  const [greeksData, setGreeksData] = useState<ParsedGreeksData | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [loadingStrikes, setLoadingStrikes] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch symbols on mount
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
          body: { endpoint: "symbols" },
        });
        if (error) throw error;

        const indexSymbols = data?.["index symbols"] || [];
        const stockSymbols = data?.symbols || [];
        setSymbols({ indexSymbols, stockSymbols });
      } catch (err) {
        console.error("Error fetching symbols:", err);
        toast({
          title: "Error",
          description: "Failed to load symbols",
          variant: "destructive",
        });
      } finally {
        setLoadingSymbols(false);
      }
    };
    fetchSymbols();
  }, [toast]);

  // Fetch expiry dates when symbol changes
  useEffect(() => {
    if (!selectedSymbol) return;

    const fetchExpiry = async () => {
      setLoadingExpiry(true);
      setSelectedExpiry("");
      setStrikes([]);
      setSelectedStrike(0);
      try {
        const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
          body: { endpoint: "expiry", params: { symbol: selectedSymbol } },
        });
        if (error) throw error;

        let dates: string[] = [];
        if (Array.isArray(data)) {
          dates = data;
        } else if (data?.expiry_dates && Array.isArray(data.expiry_dates)) {
          dates = data.expiry_dates;
        } else if (data?.expiryDates && Array.isArray(data.expiryDates)) {
          dates = data.expiryDates;
        } else if (data?.data && Array.isArray(data.data)) {
          dates = data.data;
        }

        setExpiryDates(dates);

        if (dates.length > 0) {
          setSelectedExpiry(dates[0]);
        }
      } catch (err) {
        console.error("Error fetching expiry dates:", err);
        toast({
          title: "Error",
          description: "Failed to load expiry dates",
          variant: "destructive",
        });
      } finally {
        setLoadingExpiry(false);
      }
    };
    fetchExpiry();
  }, [selectedSymbol, toast]);

  // Fetch strikes when expiry changes
  useEffect(() => {
    if (!selectedSymbol || !selectedExpiry) return;

    const fetchStrikes = async () => {
      setLoadingStrikes(true);
      try {
        const { data, error } = await supabase.functions.invoke("toi-data", {
          body: { endpoint: "strikes", symbol: selectedSymbol, expiry: selectedExpiry },
        });
        if (error) throw error;

        let strikeList: number[] = [];
        if (Array.isArray(data)) {
          strikeList = data.map(Number).filter((n: number) => !isNaN(n));
        } else if (data?.strikes && Array.isArray(data.strikes)) {
          strikeList = data.strikes.map(Number).filter((n: number) => !isNaN(n));
        } else if (data?.data && Array.isArray(data.data)) {
          strikeList = data.data.map(Number).filter((n: number) => !isNaN(n));
        }

        strikeList.sort((a, b) => a - b);
        setStrikes(strikeList);

        // Select ATM strike (middle of the list)
        if (strikeList.length > 0) {
          const midIndex = strikeList.indexOf(data.atm);
          setSelectedStrike(strikeList[midIndex]);
        }
      } catch (err) {
        console.error("Error fetching strikes:", err);
        toast({
          title: "Error",
          description: "Failed to load strikes",
          variant: "destructive",
        });
      } finally {
        setLoadingStrikes(false);
      }
    };
    fetchStrikes();
  }, [selectedSymbol, selectedExpiry, toast]);

  const handleGo = useCallback(async () => {
    if (!selectedSymbol || !selectedExpiry || !selectedStrike) return;

    setLoadingData(true);
    try {
      const data = await fetchCombinedGreeksData(selectedSymbol, selectedExpiry, selectedStrike, selectedTimeframe);
      setGreeksData(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error fetching Greeks data:", err);
      toast({
        title: "Error",
        description: "Failed to load Greeks data",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  }, [selectedSymbol, selectedExpiry, selectedStrike, selectedTimeframe, toast]);

  // Auto-fetch when all selections are ready
  useEffect(() => {
    if (selectedSymbol && selectedExpiry && selectedStrike && !loadingStrikes && !loadingExpiry) {
      handleGo();
    }
  }, [selectedSymbol, selectedExpiry, selectedStrike, loadingStrikes, loadingExpiry]);

  // Auto-refresh every 3 minutes
  useEffect(() => {
    if (!selectedSymbol || !selectedExpiry || !selectedStrike) return;
    const interval = setInterval(() => {
      handleGo();
    }, 60000);
    return () => clearInterval(interval);
  }, [handleGo]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <ProFeatureGate featureName="Greeks Chart">
        <main className="container py-6 space-y-6">
          <div className="flex items-center justify-end gap-2">
            <LastRefreshBadge lastRefresh={lastRefresh} isFetching={loadingData} />
            <PageInfoModal
              title="Greeks Chart"
              subtitle="Intraday visualization of option Greeks"
              overview="Track Delta, Gamma, Theta and Vega for any strike over time. See how Greeks evolve intraday to understand the true forces driving option prices — not just the premium."
              legend={[
                { label: "Delta (Δ)", text: "Rate of change of premium vs spot. Range 0-1 for calls, 0 to -1 for puts", color: "#3b82f6" },
                { label: "Gamma (Γ)", text: "Rate of change of Delta. Peaks at ATM, near expiry — the 'acceleration'", color: "#8b5cf6" },
                { label: "Theta (Θ)", text: "Time decay per day. Negative for buyers, positive for sellers", color: "#f59e0b" },
                { label: "Vega (ν)", text: "Sensitivity to IV changes. Highest for ATM and longer expiries", color: "#10b981" },
              ]}
              sections={[
                {
                  heading: "Intraday Behaviour",
                  body: "Delta shifts with spot, Gamma explodes near ATM at expiry, Theta accelerates in the final hours, Vega collapses as IV crush hits post-events.",
                },
              ]}
              howToUse="Sellers monitor Theta and Vega closely (want +ve Theta, low Vega risk). Buyers care about Delta and Gamma (need move + speed to overcome Theta)."
              tips={[
                "Gamma exposure is the hidden killer of short-option positions near expiry.",
                "A rising Vega chart pre-event = market pricing in a move; sellers should reduce size.",
                "Compare CE and PE Greeks at the same strike to spot skew opportunities.",
              ]}
            />
          </div>
          {/* Controls Card */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            {/* Mobile controls */}
            <MobileSymbolExpiryBar
              indexSymbols={symbols.indexSymbols}
              stockSymbols={symbols.stockSymbols}
              selectedSymbol={selectedSymbol}
              onSymbolChange={setSelectedSymbol}
              loadingSymbols={loadingSymbols}
              expiryDates={expiryDates}
              selectedExpiry={selectedExpiry}
              onExpiryChange={setSelectedExpiry}
              loadingExpiry={loadingExpiry}
              actions={
                <Button
                  onClick={handleGo}
                  disabled={loadingData || !selectedSymbol || !selectedExpiry || !selectedStrike}
                  size="sm"
                  className="h-9 bg-primary hover:bg-primary/90"
                >
                  {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : "GO"}
                </Button>
              }
              filtersContent={
                <>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-medium">Strike</label>
                    <Select value={selectedStrike.toString()} onValueChange={(v) => setSelectedStrike(parseInt(v))} disabled={loadingStrikes || strikes.length === 0}>
                      <SelectTrigger className="w-full bg-secondary h-9 text-xs"><SelectValue placeholder={loadingStrikes ? "Loading..." : "Strike"} /></SelectTrigger>
                      <SelectContent className="max-h-[300px] bg-popover">
                        {strikes.map((s) => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-medium">Timeframe</label>
                    <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                      <SelectTrigger className="w-full bg-secondary h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        {["1min","3min","5min","15min","30min","60min"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              }
            />
            <div className="hidden md:block">
              <GreeksChartControls
                symbols={symbols}
                expiryDates={expiryDates}
                strikes={strikes}
                selectedSymbol={selectedSymbol}
                selectedExpiry={selectedExpiry}
                selectedStrike={selectedStrike}
                selectedTimeframe={selectedTimeframe}
                loadingSymbols={loadingSymbols}
                loadingExpiry={loadingExpiry}
                loadingStrikes={loadingStrikes}
                loadingData={loadingData}
                onSymbolChange={setSelectedSymbol}
                onExpiryChange={setSelectedExpiry}
                onStrikeChange={setSelectedStrike}
                onTimeframeChange={setSelectedTimeframe}
                onGo={handleGo}
              />
            </div>
          </CardContent>
        </Card>


        {/* Charts Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="combined">Combined Chart</TabsTrigger>
            <TabsTrigger value="individual">Individual Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="combined" className="mt-4">
            <CombinedGreeksChart
              symbol={selectedSymbol}
              expiry={selectedExpiry}
              strike={selectedStrike}
              timeframe={selectedTimeframe}
              callData={greeksData?.callData || []}
              putData={greeksData?.putData || []}
            />
          </TabsContent>

          <TabsContent value="individual" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <IndividualGreeksChart
                symbol={selectedSymbol}
                expiry={selectedExpiry}
                strike={selectedStrike}
                timeframe={selectedTimeframe}
                optionType="CE"
                data={greeksData?.callData || []}
              />
              <IndividualGreeksChart
                symbol={selectedSymbol}
                expiry={selectedExpiry}
                strike={selectedStrike}
                timeframe={selectedTimeframe}
                optionType="PE"
                data={greeksData?.putData || []}
              />
            </div>
          </TabsContent>
        </Tabs>
        </main>
      </ProFeatureGate>
      <Footer />
    </div>
  );
};

export default GreeksChart;
