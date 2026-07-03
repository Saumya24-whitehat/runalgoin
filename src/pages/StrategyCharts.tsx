import { PageInfoButton } from "@/components/PageInfoButton";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Minus, Trash2, TrendingUp, TrendingDown, BarChart3, RefreshCw } from "lucide-react";
import { fetchStrategyChartData, ChartPosition, OHLCDataPoint } from "@/services/strategyChartApi";
import StrategyOHLCChart from "@/components/strategyChart/StrategyOHLCChart";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

interface OptionChainRow {
  strike: number;
  callLTP: number;
  callOI: number;
  callIV: number;
  putLTP: number;
  putOI: number;
  putIV: number;
}

interface SelectedPosition extends ChartPosition {
  id: string;
  side: "Long" | "Short";
  ltp: number;
}

const TIMEFRAME_OPTIONS = [
  { value: "1min", label: "1 Min" },
  { value: "3min", label: "3 Min" },
  { value: "5min", label: "5 Min" },
  { value: "15min", label: "15 Min" },
];

const StrategyCharts = () => {
  const { toast } = useToast();

  // Symbol and expiry state
  const [symbols, setSymbols] = useState<SymbolGroup>({ indexSymbols: [], stockSymbols: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1min");

  // Option chain state
  const [optionChain, setOptionChain] = useState<OptionChainRow[]>([]);
  const [atmStrike, setAtmStrike] = useState<number>(0);

  // Selected positions
  const [positions, setPositions] = useState<SelectedPosition[]>([]);

  // Chart data
  const [chartData, setChartData] = useState<OHLCDataPoint[]>([]);

  // Loading states
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [loadingChain, setLoadingChain] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);

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
      setOptionChain([]);
      setPositions([]);
      setChartData([]);

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

  // Fetch option chain when expiry changes
  useEffect(() => {
    if (!selectedSymbol || !selectedExpiry) return;

    const fetchOptionChain = async () => {
      setLoadingChain(true);
      try {
        const { data, error } = await supabase.functions.invoke("option-chain", {
          body: {
            action: "getOptionChain",
            expiry_date: selectedExpiry,
            symbol: selectedSymbol,
          },
        });
        if (error) throw error;

        // Parse option chain data
        const chainData = data?.option_chain.data;
        const spotPrice = data?.option_chain.data[0].underlying_spot_price;

        // Find ATM strike
        let nearestStrike = 0;
        let minDiff = Infinity;

        const parsedChain: OptionChainRow[] = chainData
          .map((row: any) => {
            const strike = row.strike_price;
            const diff = Math.abs(strike - spotPrice);
            if (diff < minDiff) {
              minDiff = diff;
              nearestStrike = strike;
            }

            return {
              strike,
              callLTP: row.call_options.market_data.ltp,
              callOI: row.call_options.market_data.oi,
              callIV: row.call_options.option_greeks.iv,
              putLTP: row.put_options.market_data.ltp,
              putOI: row.put_options.market_data.oi,
              putIV: row.put_options.option_greeks.iv,
            };
          })
          .sort((a: OptionChainRow, b: OptionChainRow) => a.strike - b.strike);

        setOptionChain(parsedChain);
        setAtmStrike(nearestStrike);
      } catch (err) {
        console.error("Error fetching option chain:", err);
        toast({
          title: "Error",
          description: "Failed to load option chain",
          variant: "destructive",
        });
      } finally {
        setLoadingChain(false);
      }
    };
    fetchOptionChain();
  }, [selectedSymbol, selectedExpiry, toast]);

  // Add position
  const addPosition = (strike: number, type: "Call" | "Put", side: "Long" | "Short", ltp: number) => {
    const id = `${strike}-${type}-${side}-${Date.now()}`;
    const newPosition: SelectedPosition = {
      id,
      expiry: selectedExpiry,
      strike,
      lots: 1,
      type,
      side,
      ltp,
    };
    setPositions((prev) => [...prev, newPosition]);
  };

  // Update lots
  const updateLots = (id: string, delta: number) => {
    setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, lots: Math.max(1, p.lots + delta) } : p)));
  };

  // Remove position
  const removePosition = (id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  // Get longs and shorts
  const { longs, shorts } = useMemo(() => {
    const longs: ChartPosition[] = positions
      .filter((p) => p.side === "Long")
      .map(({ expiry, strike, lots, type }) => ({ expiry, strike, lots, type }));
    const shorts: ChartPosition[] = positions
      .filter((p) => p.side === "Short")
      .map(({ expiry, strike, lots, type }) => ({ expiry, strike, lots, type }));
    return { longs, shorts };
  }, [positions]);

  // Fetch chart data
  const fetchChart = useCallback(async () => {
    if (positions.length === 0) {
      toast({
        title: "No Positions",
        description: "Please add at least one position to view the chart",
        variant: "destructive",
      });
      return;
    }

    setLoadingChart(true);
    try {
      const response = await fetchStrategyChartData(selectedSymbol, selectedTimeframe, longs, shorts);

      if (response.error) {
        throw new Error(response.error);
      }

      setChartData(response.data);

      if (response.data.length === 0) {
        toast({
          title: "No Data",
          description: "No chart data available for the selected positions",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error fetching chart:", err);
      toast({
        title: "Error",
        description: "Failed to load chart data",
        variant: "destructive",
      });
    } finally {
      setLoadingChart(false);
    }
  }, [selectedSymbol, selectedTimeframe, longs, shorts, positions.length, toast]);

  // Display strikes around ATM (10 above and 10 below)
  const displayedStrikes = useMemo(() => {
    if (optionChain.length === 0 || atmStrike === 0) return optionChain;

    const atmIndex = optionChain.findIndex((row) => row.strike === atmStrike);
    if (atmIndex === -1) return optionChain.slice(0, 21);

    const startIndex = Math.max(0, atmIndex - 10);
    const endIndex = Math.min(optionChain.length, atmIndex + 11);
    return optionChain.slice(startIndex, endIndex);
  }, [optionChain, atmStrike]);

  return (
    <>
      <Helmet>
        <title>Strategy Charts - Combined Options Chart | Runalgo</title>
        <meta
          name="description"
          content="Visualize combined options positions with OHLC candlestick charts. Select multiple options from the chain and see their combined price movement."
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50">
          <TickerRibbon />
          <Navbar />
        </div>

        <ProFeatureGate featureName="Strategy Charts">
          <main className="container py-6 space-y-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Strategy OHLC Charts</h1>
              <PageInfoButton title="Strategy OHLC Charts" description="Combined OHLC candlestick chart for a multi-leg option strategy, letting you visualize the strategy's price action as a single instrument." />
            </div>
            {/* Controls */}
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
                  {/* Symbol Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Symbol</label>
                    <Select value={selectedSymbol} onValueChange={setSelectedSymbol} disabled={loadingSymbols}>
                      <SelectTrigger className="w-full bg-background/50">
                        <SelectValue placeholder="Select Symbol" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] bg-popover">
                        {symbols.indexSymbols.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50">INDEX</div>
                            {symbols.indexSymbols.map((sym) => (
                              <SelectItem key={sym} value={sym}>
                                {sym}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {symbols.stockSymbols.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50 mt-1">
                              STOCKS
                            </div>
                            {symbols.stockSymbols.map((sym) => (
                              <SelectItem key={sym} value={sym}>
                                {sym}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Expiry Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Expiry</label>
                    <Select
                      value={selectedExpiry}
                      onValueChange={setSelectedExpiry}
                      disabled={loadingExpiry || expiryDates.length === 0}
                    >
                      <SelectTrigger className="w-full bg-background/50">
                        <SelectValue placeholder={loadingExpiry ? "Loading..." : "Select expiry"} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {expiryDates.map((date) => (
                          <SelectItem key={date} value={date}>
                            {date}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Timeframe Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Timeframe</label>
                    <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                      <SelectTrigger className="w-full bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {TIMEFRAME_OPTIONS.map((tf) => (
                          <SelectItem key={tf.value} value={tf.value}>
                            {tf.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* View Chart Button */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground invisible">Action</label>
                    <Button onClick={fetchChart} disabled={loadingChart || positions.length === 0} className="w-full">
                      {loadingChart ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <BarChart3 className="h-4 w-4 mr-2" />
                      )}
                      View Chart
                    </Button>
                  </div>

                  {/* Refresh Button */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground invisible">Refresh</label>
                    <Button
                      variant="outline"
                      onClick={fetchChart}
                      disabled={loadingChart || positions.length === 0}
                      className="w-full"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loadingChart ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Option Chain */}
              <Card className="lg:col-span-2 bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Option Chain - Select Positions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  {loadingChain ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead className="text-center text-call-color">Buy CE</TableHead>
                            <TableHead className="text-center text-put-color">Sell CE</TableHead>
                            <TableHead className="text-right text-call-color">CE LTP</TableHead>
                            <TableHead className="text-center font-bold bg-muted/30">Strike</TableHead>
                            <TableHead className="text-left text-put-color">PE LTP</TableHead>
                            <TableHead className="text-center text-call-color">Buy PE</TableHead>
                            <TableHead className="text-center text-put-color">Sell PE</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedStrikes.map((row) => (
                            <TableRow
                              key={row.strike}
                              className={`text-xs ${row.strike === atmStrike ? "bg-primary/10" : ""}`}
                            >
                              <TableCell className="text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-call-color hover:bg-call-color/20"
                                  onClick={() => addPosition(row.strike, "Call", "Long", row.callLTP)}
                                >
                                  <TrendingUp className="h-3 w-3" />
                                </Button>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-put-color hover:bg-put-color/20"
                                  onClick={() => addPosition(row.strike, "Call", "Short", row.callLTP)}
                                >
                                  <TrendingDown className="h-3 w-3" />
                                </Button>
                              </TableCell>
                              <TableCell className="text-right font-mono text-call-color">
                                {row.callLTP.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-center font-bold bg-muted/30">{row.strike}</TableCell>
                              <TableCell className="text-left font-mono text-put-color">
                                {row.putLTP.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-call-color hover:bg-call-color/20"
                                  onClick={() => addPosition(row.strike, "Put", "Long", row.putLTP)}
                                >
                                  <TrendingUp className="h-3 w-3" />
                                </Button>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-put-color hover:bg-put-color/20"
                                  onClick={() => addPosition(row.strike, "Put", "Short", row.putLTP)}
                                >
                                  <TrendingDown className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Selected Positions */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      Selected Positions
                      <Badge variant="secondary" className="text-xs">
                        {positions.length}
                      </Badge>
                    </span>
                    {positions.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPositions([])}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        Clear All
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  {positions.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Click on the option chain to add positions
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-auto">
                      {positions.map((pos) => (
                        <div
                          key={pos.id}
                          className={`flex items-center justify-between p-2 rounded border ${
                            pos.side === "Long"
                              ? "bg-call-color/5 border-call-color/30"
                              : "bg-put-color/5 border-put-color/30"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant={pos.side === "Long" ? "default" : "destructive"} className="text-xs">
                              {pos.side}
                            </Badge>
                            <span className="text-xs font-medium">
                              {pos.strike} {pos.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => updateLots(pos.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-xs font-bold w-6 text-center">{pos.lots}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => updateLots(pos.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => removePosition(pos.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Combined Strategy Chart
                  {chartData.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {chartData.length} candles
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingChart ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : chartData.length > 0 ? (
                  <StrategyOHLCChart data={chartData} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-sm">Select positions and click "View Chart" to see the combined price chart</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </ProFeatureGate>
      </div>
    </>
  );
};

export default StrategyCharts;
