import { useState, useEffect, useCallback, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GreeksChartControls } from "@/components/greeksChart/GreeksChartControls";
import { CombinedGreeksChart } from "@/components/greeksChart/CombinedGreeksChart";
import { IndividualGreeksChart } from "@/components/greeksChart/IndividualGreeksChart";
import { fetchCombinedGreeksData, ParsedGreeksData, GreeksDataPoint } from "@/services/greeksChartApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { PageInfoModal } from "@/components/PageInfoModal";
import { MobileSymbolExpiryBar } from "@/components/mobile/MobileSymbolExpiryBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let total = 9 * 60 + 15; total <= 15 * 60 + 30; total += 3) {
    const h = Math.floor(total / 60).toString().padStart(2, "0");
    const m = (total % 60).toString().padStart(2, "0");
    slots.push(`${h}${m}`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const formatTimeDisplay = (time: string) => {
  if (!time || time.length < 4) return "";
  const hour = parseInt(time.slice(0, 2));
  const min = time.slice(2, 4);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour.toString().padStart(2, "0")}:${min} ${period}`;
};

const closestSlot = () => {
  const now = new Date();
  const cur = `${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}`;
  return TIME_SLOTS.reduce(
    (prev, curr) =>
      Math.abs(parseInt(curr) - parseInt(cur)) < Math.abs(parseInt(prev) - parseInt(cur)) ? curr : prev,
    TIME_SLOTS[0]
  );
};

// Candle timestamps are ms with IST already baked in (read as UTC parts)
const minuteOfDay = (ts: number) => {
  const d = new Date(ts);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};


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

  const [selectedTime, setSelectedTime] = useState("");
  const [isHistoricalMode, setIsHistoricalMode] = useState(false);


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

  // Auto-refresh every minute (only in Live mode)
  useEffect(() => {
    if (isHistoricalMode) return;
    if (!selectedSymbol || !selectedExpiry || !selectedStrike) return;
    const interval = setInterval(() => {
      handleGo();
    }, 60000);
    return () => clearInterval(interval);
  }, [handleGo, isHistoricalMode]);

  // Clip data from 09:15 up to the selected time
  const cutoffMinute = useMemo(() => {
    if (!isHistoricalMode || !selectedTime) return null;
    return parseInt(selectedTime.slice(0, 2)) * 60 + parseInt(selectedTime.slice(2, 4));
  }, [isHistoricalMode, selectedTime]);

  const clip = useCallback(
    (data: GreeksDataPoint[]) =>
      cutoffMinute === null ? data : data.filter((d) => minuteOfDay(d.timestamp) <= cutoffMinute),
    [cutoffMinute]
  );

  const callData = useMemo(() => clip(greeksData?.callData || []), [greeksData, clip]);
  const putData = useMemo(() => clip(greeksData?.putData || []), [greeksData, clip]);

  const handleTimeChange = (direction: "prev" | "next") => {
    const baseTime = selectedTime && TIME_SLOTS.includes(selectedTime) ? selectedTime : closestSlot();
    const idx = TIME_SLOTS.indexOf(baseTime);
    const next = Math.min(Math.max(idx + (direction === "prev" ? -1 : 1), 0), TIME_SLOTS.length - 1);
    setSelectedTime(TIME_SLOTS[next]);
  };

  const enableHistoricalMode = () => {
    if (!isHistoricalMode) {
      setIsHistoricalMode(true);
      setSelectedTime(closestSlot());
    }
  };

  const resetToLive = () => {
    setIsHistoricalMode(false);
    setSelectedTime("");
  };

  const timeControls = (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 border-primary/50"
        onClick={() => { enableHistoricalMode(); handleTimeChange("prev"); }}
        disabled={isHistoricalMode && TIME_SLOTS.indexOf(selectedTime) <= 0}
        title="Earlier time"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant={isHistoricalMode ? "default" : "outline"}
        className={`h-8 px-3 flex items-center gap-2 text-xs ${isHistoricalMode ? "bg-cyan-600 hover:bg-cyan-700" : "border-primary/50"}`}
        onClick={enableHistoricalMode}
        title="Show data from market open up to this time"
      >
        <Clock className="h-3.5 w-3.5" />
        <span className="font-medium">{isHistoricalMode ? formatTimeDisplay(selectedTime) : "Live"}</span>
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 border-primary/50"
        onClick={() => { enableHistoricalMode(); handleTimeChange("next"); }}
        disabled={isHistoricalMode && TIME_SLOTS.indexOf(selectedTime) >= TIME_SLOTS.length - 1}
        title="Later time"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {isHistoricalMode && (
        <Button
          variant="default"
          size="icon"
          className="h-8 w-8 bg-cyan-600 hover:bg-cyan-700"
          onClick={resetToLive}
          title="Reset to Live"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );


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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {timeControls}
              <span className="text-[11px] text-muted-foreground">
                {isHistoricalMode
                  ? `Analyzing 09:15 AM → ${formatTimeDisplay(selectedTime)}`
                  : "Live mode · auto refresh every 1 min"}
              </span>
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
