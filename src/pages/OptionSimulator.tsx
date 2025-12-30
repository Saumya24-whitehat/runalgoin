import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
  Save,
  Download,
  RefreshCw,
  Plus,
  Copy,
  ChevronUp,
  ChevronDown,
  CalendarIcon,
  Clock,
  Play,
} from "lucide-react";
import OptionBuilderChart from "@/components/optionBuilder/OptionBuilderChart";
import OptionBuilderPositions from "@/components/optionBuilder/OptionBuilderPositions";
import OptionBuilderGreeks from "@/components/optionBuilder/OptionBuilderGreeks";
import OptionBuilderMetrics from "@/components/optionBuilder/OptionBuilderMetrics";
import OptionBuilderStrategies from "@/components/optionBuilder/OptionBuilderStrategies";
import SaveStrategyDialog from "@/components/optionBuilder/SaveStrategyDialog";
import LoadStrategyDialog, { SavedStrategy } from "@/components/optionBuilder/LoadStrategyDialog";
import {
  Position,
  generatePLChartData,
  findBreakevenPoints,
  calculateTotalGreeks,
  formatIndianNumber,
} from "@/services/optionBuilderApi";
import {
  fetchSimulatorExpiryDates,
  fetchSimulatorStrikesData,
  SimulatorData,
  getMarketTimeSlots,
  getLotSizeForSymbol,
} from "@/services/optionSimulatorApi";

const SYMBOLS = [
  { value: "Nifty 50", label: "NIFTY" },
  { value: "Nifty Bank", label: "BANKNIFTY" },
  { value: "Nifty Fin Service", label: "FINNIFTY" },
  { value: "Nifty Mid Select", label: "MIDCPNIFTY" },
];

const TIME_SLOTS = getMarketTimeSlots();
const STORAGE_KEY_STRATEGIES = "optionSimulator_strategies";

const OptionSimulator = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Simulator controls
  const [symbol, setSymbol] = useState("Nifty 50");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("0915");
  const [expiries, setExpiries] = useState<string[]>([]);
  const [activeExpiry, setActiveExpiry] = useState<string>("");
  const [simulatorData, setSimulatorData] = useState<SimulatorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExpiries, setIsLoadingExpiries] = useState(false);

  // Positions and UI state
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [lotSize, setLotSize] = useState(75);
  const [showStrategies, setShowStrategies] = useState(true);
  const [showChain, setShowChain] = useState(true);

  // Dialogs
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [savedStrategies, setSavedStrategies] = useState<SavedStrategy[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STRATEGIES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Handle authentication
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Save strategies to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STRATEGIES, JSON.stringify(savedStrategies));
  }, [savedStrategies]);

  // Set lot size when symbol changes
  useEffect(() => {
    setLotSize(getLotSizeForSymbol(symbol));
  }, [symbol]);

  // Fetch expiry dates when symbol or date changes
  useEffect(() => {
    const loadExpiries = async () => {
      setIsLoadingExpiries(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const expiryList = await fetchSimulatorExpiryDates(symbol, dateStr);
        setExpiries(expiryList);
        if (expiryList.length > 0) {
          setActiveExpiry(expiryList[0]);
        }
      } catch (error) {
        console.error("Error fetching expiries:", error);
        toast.error("Failed to load expiry dates");
      } finally {
        setIsLoadingExpiries(false);
      }
    };

    loadExpiries();
  }, [symbol, selectedDate]);

  // Fetch strikes data when expiry or time changes
  const loadStrikesData = useCallback(async () => {
    if (!activeExpiry) return;

    setIsLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const data = await fetchSimulatorStrikesData(symbol, dateStr, selectedTime, activeExpiry);
      setSimulatorData(data);
      setCurrentPrice(data.spotPrice);
      setLotSize(data.lotSize || getLotSizeForSymbol(symbol));
    } catch (error) {
      console.error("Error fetching strikes data:", error);
      toast.error("Failed to load strikes data");
    } finally {
      setIsLoading(false);
    }
  }, [symbol, selectedDate, selectedTime, activeExpiry]);

  // Auto-load when expiry changes
  useEffect(() => {
    if (activeExpiry) {
      loadStrikesData();
    }
  }, [activeExpiry]);

  // Calculate chart data
  const chartData = generatePLChartData(positions, currentPrice, 0.03);
  const breakevens = findBreakevenPoints(chartData.expiry);
  const greeks = calculateTotalGreeks(positions);

  // Calculate metrics
  const enabledPositions = positions.filter((p) => p.enabled);
  let maxProfit: number | "Unlimited" = -Infinity;
  let maxLoss: number | "Unlimited" = Infinity;

  if (chartData.expiry.length > 0) {
    chartData.expiry.forEach(([, pl]) => {
      if (typeof maxProfit === "number" && pl > maxProfit) maxProfit = pl;
      if (typeof maxLoss === "number" && pl < maxLoss) maxLoss = pl;
    });
  }

  // Check for unlimited profit/loss
  const longCalls = enabledPositions
    .filter((p) => p.action === "Buy" && p.optType === "CE" && !p.exitPrice)
    .reduce((sum, p) => sum + p.lots, 0);
  const shortCalls = enabledPositions
    .filter((p) => p.action === "Sell" && p.optType === "CE" && !p.exitPrice)
    .reduce((sum, p) => sum + p.lots, 0);
  const longPuts = enabledPositions
    .filter((p) => p.action === "Buy" && p.optType === "PE" && !p.exitPrice)
    .reduce((sum, p) => sum + p.lots, 0);
  const shortPuts = enabledPositions
    .filter((p) => p.action === "Sell" && p.optType === "PE" && !p.exitPrice)
    .reduce((sum, p) => sum + p.lots, 0);

  if (longCalls !== shortCalls || longPuts !== shortPuts) {
    if (longCalls > shortCalls || longPuts > shortPuts) {
      maxProfit = "Unlimited";
    }
    if (shortCalls > longCalls || shortPuts > longPuts) {
      maxLoss = "Unlimited";
    }
  }

  // Current P&L
  const currentPL = enabledPositions.reduce((total, pos) => {
    if (pos.exitPrice !== undefined) {
      return total + (pos.exitPrice - pos.entryPrice) * pos.lots * pos.lotSize * (pos.action === "Buy" ? 1 : -1);
    }
    return total + (pos.currentPrice - pos.entryPrice) * pos.lots * pos.lotSize * (pos.action === "Buy" ? 1 : -1);
  }, 0);

  const addPosition = useCallback((newPosition: Omit<Position, "id" | "enabled">) => {
    const position: Position = {
      ...newPosition,
      id: Math.random().toString(36).substr(2, 9),
      enabled: true,
    };
    setPositions((prev) => [...prev, position]);
    setShowStrategies(false);
    toast.success(`${newPosition.action} ${newPosition.strike} ${newPosition.optType} added`);
  }, []);

  const removePosition = useCallback((id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
    toast.success("Position removed");
  }, []);

  const togglePosition = useCallback((id: string) => {
    setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  }, []);

  const exitPosition = useCallback((id: string, exitPrice: number) => {
    setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, exitPrice } : p)));
    toast.success("Position exited");
  }, []);

  const partialExitPosition = useCallback((id: string, lotsToExit: number, exitPrice: number) => {
    setPositions((prev) => {
      const newPositions: Position[] = [];
      prev.forEach((p) => {
        if (p.id === id) {
          const exitedPosition: Position = {
            ...p,
            id: Math.random().toString(36).substr(2, 9),
            lots: lotsToExit,
            exitPrice,
          };
          newPositions.push(exitedPosition);
          
          const remainingLots = p.lots - lotsToExit;
          if (remainingLots > 0) {
            newPositions.push({
              ...p,
              lots: remainingLots,
            });
          }
        } else {
          newPositions.push(p);
        }
      });
      return newPositions;
    });
    toast.success(`Exited ${lotsToExit} lot${lotsToExit > 1 ? "s" : ""}`);
  }, []);

  const updatePosition = useCallback((id: string, updates: Partial<Position>) => {
    setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const reEntryPosition = useCallback((id: string) => {
    setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, exitPrice: undefined } : p)));
    toast.success("Position re-entered");
  }, []);

  const clearAllPositions = useCallback(() => {
    setPositions([]);
    setShowStrategies(true);
    toast.success("All positions cleared");
  }, []);

  const handleAddStrategy = useCallback(
    (strategyType: string) => {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const strikeDiff = symbol.includes("Bank") ? 100 : 50;
      const atm = Math.round(currentPrice / strikeDiff) * strikeDiff;

      switch (strategyType) {
        case "buy-call":
          addPosition({
            action: "Buy",
            lots: 1,
            date: dateStr,
            expiry: activeExpiry,
            strike: atm,
            optType: "CE",
            entryPrice: 250,
            currentPrice: 250,
            IV: 15,
            lotSize,
          });
          break;
        case "sell-put":
          addPosition({
            action: "Sell",
            lots: 1,
            date: dateStr,
            expiry: activeExpiry,
            strike: atm,
            optType: "PE",
            entryPrice: 200,
            currentPrice: 200,
            IV: 15,
            lotSize,
          });
          break;
        case "bull-call-spread":
          addPosition({
            action: "Buy",
            lots: 1,
            date: dateStr,
            expiry: activeExpiry,
            strike: atm,
            optType: "CE",
            entryPrice: 250,
            currentPrice: 250,
            IV: 15,
            lotSize,
          });
          addPosition({
            action: "Sell",
            lots: 1,
            date: dateStr,
            expiry: activeExpiry,
            strike: atm + strikeDiff * 2,
            optType: "CE",
            entryPrice: 180,
            currentPrice: 180,
            IV: 14,
            lotSize,
          });
          break;
        case "iron-condor":
          addPosition({
            action: "Sell",
            lots: 1,
            date: dateStr,
            expiry: activeExpiry,
            strike: atm - strikeDiff * 2,
            optType: "PE",
            entryPrice: 150,
            currentPrice: 150,
            IV: 14,
            lotSize,
          });
          addPosition({
            action: "Buy",
            lots: 1,
            date: dateStr,
            expiry: activeExpiry,
            strike: atm - strikeDiff * 4,
            optType: "PE",
            entryPrice: 80,
            currentPrice: 80,
            IV: 15,
            lotSize,
          });
          addPosition({
            action: "Sell",
            lots: 1,
            date: dateStr,
            expiry: activeExpiry,
            strike: atm + strikeDiff * 2,
            optType: "CE",
            entryPrice: 150,
            currentPrice: 150,
            IV: 14,
            lotSize,
          });
          addPosition({
            action: "Buy",
            lots: 1,
            date: dateStr,
            expiry: activeExpiry,
            strike: atm + strikeDiff * 4,
            optType: "CE",
            entryPrice: 80,
            currentPrice: 80,
            IV: 15,
            lotSize,
          });
          break;
        default:
          toast.info("Strategy coming soon");
      }
    },
    [activeExpiry, currentPrice, lotSize, addPosition, symbol, selectedDate],
  );

  const handleSaveStrategy = (name: string, description: string, type: string) => {
    const strategy: SavedStrategy = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      type: type as "bullish" | "bearish" | "neutral",
      positions,
      symbol,
      createdAt: new Date().toISOString(),
    };
    setSavedStrategies((prev) => [...prev, strategy]);
    toast.success("Strategy saved");
  };

  const handleLoadStrategy = (strategy: SavedStrategy) => {
    setPositions(strategy.positions);
    setShowStrategies(false);
    toast.success(`Loaded: ${strategy.name}`);
  };

  const handleDeleteStrategy = (id: string) => {
    setSavedStrategies((prev) => prev.filter((s) => s.id !== id));
    toast.success("Strategy deleted");
  };

  const handleCopyStrategy = () => {
    const strategyData = {
      symbol,
      date: format(selectedDate, "yyyy-MM-dd"),
      time: selectedTime,
      expiry: activeExpiry,
      positions,
    };
    navigator.clipboard.writeText(JSON.stringify(strategyData, null, 2));
    toast.success("Strategy copied to clipboard");
  };

  const formatNumber = (num: number): string => {
    if (Math.abs(num) >= 10000000) return `${(num / 10000000).toFixed(2)}Cr`;
    if (Math.abs(num) >= 100000) return `${(num / 100000).toFixed(2)}L`;
    if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <TickerRibbon />

      <main className="flex-1 container mx-auto px-2 py-3">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SYMBOLS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-40 justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Time Picker */}
          <Select value={selectedTime} onValueChange={setSelectedTime}>
            <SelectTrigger className="w-28">
              <Clock className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS.map((slot) => (
                <SelectItem key={slot.value} value={slot.value}>
                  {slot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Expiry Selector */}
          <Select value={activeExpiry} onValueChange={setActiveExpiry} disabled={isLoadingExpiries}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={isLoadingExpiries ? "Loading..." : "Select Expiry"} />
            </SelectTrigger>
            <SelectContent>
              {expiries.map((exp) => (
                <SelectItem key={exp} value={exp}>
                  {exp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Load Data Button */}
          <Button onClick={loadStrikesData} disabled={isLoading || !activeExpiry} variant="default">
            <Play className="h-4 w-4 mr-2" />
            {isLoading ? "Loading..." : "Load Data"}
          </Button>

          <div className="flex-1" />

          {/* Spot Price Display */}
          {currentPrice > 0 && (
            <div className="text-sm font-medium">
              Spot: <span className="text-primary">{formatIndianNumber(currentPrice)}</span>
            </div>
          )}

          {/* Action Buttons */}
          <Button variant="outline" size="icon" onClick={() => setLoadDialogOpen(true)}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setSaveDialogOpen(true)} disabled={positions.length === 0}>
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleCopyStrategy} disabled={positions.length === 0}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Side - Option Chain */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Historical Option Chain</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowChain(!showChain)}>
                  {showChain ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>

              {showChain && (
                <div className="max-h-[500px] overflow-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : simulatorData && simulatorData.strikes.length > 0 ? (
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th colSpan={4} className="text-center py-2 text-emerald-500 border-r">CALL</th>
                          <th className="py-2">Strike</th>
                          <th colSpan={4} className="text-center py-2 text-red-500 border-l">PUT</th>
                        </tr>
                        <tr className="border-b text-muted-foreground">
                          <th className="py-1 px-1">OI</th>
                          <th className="py-1 px-1">Vol</th>
                          <th className="py-1 px-1">IV</th>
                          <th className="py-1 px-1 border-r">LTP</th>
                          <th className="py-1 px-1"></th>
                          <th className="py-1 px-1 border-l">LTP</th>
                          <th className="py-1 px-1">IV</th>
                          <th className="py-1 px-1">Vol</th>
                          <th className="py-1 px-1">OI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulatorData.strikes.map((strike) => {
                          const isATM = Math.abs(strike.strike - currentPrice) < 50;
                          return (
                            <tr
                              key={strike.strike}
                              className={`border-b hover:bg-muted/50 group ${isATM ? "bg-primary/10" : ""}`}
                            >
                              <td className="py-1 px-1 text-right">{formatNumber(strike.ceOI)}</td>
                              <td className="py-1 px-1 text-right">{formatNumber(strike.ceVolume)}</td>
                              <td className="py-1 px-1 text-right">{strike.ceIV.toFixed(1)}</td>
                              <td className="py-1 px-1 text-right border-r relative">
                                {strike.cePrice.toFixed(2)}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 bg-background/90">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-2 text-[10px] text-emerald-500 hover:text-emerald-600"
                                    onClick={() =>
                                      addPosition({
                                        action: "Buy",
                                        lots: 1,
                                        date: format(selectedDate, "yyyy-MM-dd"),
                                        expiry: activeExpiry,
                                        strike: strike.strike,
                                        optType: "CE",
                                        entryPrice: strike.cePrice,
                                        currentPrice: strike.cePrice,
                                        IV: strike.ceIV,
                                        lotSize,
                                      })
                                    }
                                  >
                                    B
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-2 text-[10px] text-red-500 hover:text-red-600"
                                    onClick={() =>
                                      addPosition({
                                        action: "Sell",
                                        lots: 1,
                                        date: format(selectedDate, "yyyy-MM-dd"),
                                        expiry: activeExpiry,
                                        strike: strike.strike,
                                        optType: "CE",
                                        entryPrice: strike.cePrice,
                                        currentPrice: strike.cePrice,
                                        IV: strike.ceIV,
                                        lotSize,
                                      })
                                    }
                                  >
                                    S
                                  </Button>
                                </div>
                              </td>
                              <td className={`py-1 px-1 text-center font-medium ${isATM ? "text-primary" : ""}`}>
                                {strike.strike}
                              </td>
                              <td className="py-1 px-1 text-left border-l relative">
                                {strike.pePrice.toFixed(2)}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 bg-background/90">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-2 text-[10px] text-emerald-500 hover:text-emerald-600"
                                    onClick={() =>
                                      addPosition({
                                        action: "Buy",
                                        lots: 1,
                                        date: format(selectedDate, "yyyy-MM-dd"),
                                        expiry: activeExpiry,
                                        strike: strike.strike,
                                        optType: "PE",
                                        entryPrice: strike.pePrice,
                                        currentPrice: strike.pePrice,
                                        IV: strike.peIV,
                                        lotSize,
                                      })
                                    }
                                  >
                                    B
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-2 text-[10px] text-red-500 hover:text-red-600"
                                    onClick={() =>
                                      addPosition({
                                        action: "Sell",
                                        lots: 1,
                                        date: format(selectedDate, "yyyy-MM-dd"),
                                        expiry: activeExpiry,
                                        strike: strike.strike,
                                        optType: "PE",
                                        entryPrice: strike.pePrice,
                                        currentPrice: strike.pePrice,
                                        IV: strike.peIV,
                                        lotSize,
                                      })
                                    }
                                  >
                                    S
                                  </Button>
                                </div>
                              </td>
                              <td className="py-1 px-1 text-left">{strike.peIV.toFixed(1)}</td>
                              <td className="py-1 px-1 text-left">{formatNumber(strike.peVolume)}</td>
                              <td className="py-1 px-1 text-left">{formatNumber(strike.peOI)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center text-muted-foreground py-10">
                      Select date, time, and expiry, then click "Load Data"
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Side - Chart and Metrics */}
          <div className="space-y-3">
            {/* Strategies or Chart */}
            {positions.length === 0 && showStrategies ? (
              <OptionBuilderStrategies onSelectStrategy={handleAddStrategy} />
            ) : (
              <>
                <OptionBuilderMetrics
                  maxProfit={maxProfit === -Infinity ? 0 : maxProfit}
                  maxLoss={maxLoss === Infinity ? 0 : maxLoss}
                  breakevens={breakevens}
                  currentPL={currentPL}
                  riskReward={
                    typeof maxProfit === "number" && typeof maxLoss === "number" && maxLoss !== 0
                      ? Math.abs(maxProfit / maxLoss)
                      : null
                  }
                />
                <Card>
                  <CardContent className="p-3">
                    <OptionBuilderChart
                      expiryData={chartData.expiry}
                      todayData={chartData.today}
                      currentPrice={currentPrice}
                    />
                  </CardContent>
                </Card>
              </>
            )}

            {/* Positions */}
            {positions.length > 0 && (
              <Card>
                <CardContent className="p-3">
                  <Tabs defaultValue="legs">
                    <div className="flex items-center justify-between mb-2">
                      <TabsList className="h-8">
                        <TabsTrigger value="legs" className="text-xs">Legs</TabsTrigger>
                        <TabsTrigger value="greeks" className="text-xs">Greeks</TabsTrigger>
                      </TabsList>
                      <Button variant="ghost" size="sm" onClick={clearAllPositions}>
                        Clear All
                      </Button>
                    </div>
                    <TabsContent value="legs" className="mt-0">
                      <OptionBuilderPositions
                        positions={positions}
                        onToggle={togglePosition}
                        onExit={exitPosition}
                        onRemove={removePosition}
                        onUpdatePosition={updatePosition}
                        onReEntry={reEntryPosition}
                        onPartialExit={partialExitPosition}
                      />
                    </TabsContent>
                    <TabsContent value="greeks" className="mt-0">
                      <OptionBuilderGreeks positions={positions} totalGreeks={greeks} />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Dialogs */}
      <SaveStrategyDialog
        isOpen={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveStrategy}
        positions={positions}
      />

      <LoadStrategyDialog
        isOpen={loadDialogOpen}
        onClose={() => setLoadDialogOpen(false)}
        strategies={savedStrategies}
        onLoad={handleLoadStrategy}
        onDelete={handleDeleteStrategy}
      />
    </div>
  );
};

export default OptionSimulator;
