import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GreeksChartControls } from "@/components/greeksChart/GreeksChartControls";
import { CombinedGreeksChart } from "@/components/greeksChart/CombinedGreeksChart";
import { IndividualGreeksChart } from "@/components/greeksChart/IndividualGreeksChart";
import { fetchCombinedGreeksData, ParsedGreeksData } from "@/services/greeksChartApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
          const midIndex = Math.floor(strikeList.length / 2);
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
    if (selectedSymbol && selectedExpiry && selectedStrike && !loadingStrikes) {
      handleGo();
    }
  }, [selectedStrike]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <main className="container py-6 space-y-6">
        {/* Controls Card */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
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
                optionType="CE"
                data={greeksData?.callData || []}
              />
              <IndividualGreeksChart
                symbol={selectedSymbol}
                expiry={selectedExpiry}
                strike={selectedStrike}
                optionType="PE"
                data={greeksData?.putData || []}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default GreeksChart;
