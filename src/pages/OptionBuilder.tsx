import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Save,
  Download,
  RefreshCw,
  Plus,
  Copy,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Wifi,
  WifiOff,
} from "lucide-react";
import OptionBuilderChart from "@/components/optionBuilder/OptionBuilderChart";
import OptionBuilderPositions from "@/components/optionBuilder/OptionBuilderPositions";
import OptionBuilderGreeks from "@/components/optionBuilder/OptionBuilderGreeks";
import OptionBuilderMetrics from "@/components/optionBuilder/OptionBuilderMetrics";
import OptionBuilderStrategies from "@/components/optionBuilder/OptionBuilderStrategies";
import OptionBuilderChain from "@/components/optionBuilder/OptionBuilderChain";
import OptionBuilderSettings, {
  OptionBuilderSettingsConfig,
  DEFAULT_SETTINGS,
} from "@/components/optionBuilder/OptionBuilderSettings";
import SaveStrategyDialog from "@/components/optionBuilder/SaveStrategyDialog";
import LoadStrategyDialog from "@/components/optionBuilder/LoadStrategyDialog";
import { useSavedStrategies, SavedStrategy } from "@/hooks/useSavedStrategies";
import {
  Position,
  OptionChainResponse,
  ExpiryData,
  generatePLChartData,
  findBreakevenPoints,
  calculateTotalGreeks,
  fetchOptionChainData,
  calculateMargin,
  formatIndianNumber,
} from "@/services/optionBuilderApi";
import { getStrategyPositions, StrategyContext } from "@/utils/optionStrategies";
import { upstoxWebSocket } from "@/services/upstoxWebSocket";

interface SymbolsData {
  indexSymbols: string[];
  stockSymbols: string[];
}

const STORAGE_KEY_SETTINGS = "optionBuilder_settings";

const OptionBuilder = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Database-backed strategies
  const { strategies: savedStrategies, saveStrategy, deleteStrategy, loading: strategiesLoading } = useSavedStrategies({ source: "builder" });

  const [symbol, setSymbol] = useState("Nifty 50");
  const [optionChainData, setOptionChainData] = useState<OptionChainResponse | null>(null);
  const [expiries, setExpiries] = useState<string[]>([]);
  const [activeExpiry, setActiveExpiry] = useState<string>("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [lotSize, setLotSize] = useState(75);
  const [showStrategies, setShowStrategies] = useState(true);
  const [showOptionChain, setShowOptionChain] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [margin, setMargin] = useState<number>(0);

  // Symbols from API
  const [symbols, setSymbols] = useState<SymbolsData>({ indexSymbols: [], stockSymbols: [] });
  const [loadingSymbols, setLoadingSymbols] = useState(false);

  // Settings and dialogs
  const [settings, setSettings] = useState<OptionBuilderSettingsConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);

  // WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const wsInitialized = useRef(false);

  // Handle authentication
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Load strategy from profile page (if navigated with loadStrategy in sessionStorage)
  useEffect(() => {
    const storedStrategy = sessionStorage.getItem("loadStrategy");
    if (storedStrategy) {
      try {
        const strategy = JSON.parse(storedStrategy);
        if (strategy.source === "builder") {
          // Set symbol first
          if (strategy.symbol) {
            setSymbol(strategy.symbol);
          }
          // Load positions with new IDs
          setPositions(
            strategy.positions.map((p: Position) => ({
              ...p,
              id: Math.random().toString(36).substr(2, 9),
            }))
          );
          setShowStrategies(false);
          toast.success(`Loaded: ${strategy.name}`);
        }
      } catch (e) {
        console.error("Error loading strategy from session:", e);
      } finally {
        sessionStorage.removeItem("loadStrategy");
      }
    }
  }, []);

  // Fetch symbols on mount
  useEffect(() => {
    const fetchSymbols = async () => {
      setLoadingSymbols(true);
      try {
        const { data, error } = await supabase.functions.invoke("option-chain", {
          body: { action: "getSymbols" },
        });

        if (error) throw error;

        const idxSymbols = data?.["index symbols"] || data?.index_symbols || [];
        const stkSymbols = data?.symbols || [];
        setSymbols({ indexSymbols: idxSymbols, stockSymbols: stkSymbols });
      } catch (error) {
        console.error("Error fetching symbols:", error);
      } finally {
        setLoadingSymbols(false);
      }
    };
    fetchSymbols();
  }, []);

  // Initialize WebSocket for live data
  useEffect(() => {
    if (!settings.liveFeedEnabled || wsInitialized.current) return;

    const initWebSocket = async () => {
      try {
        wsInitialized.current = true;

        // Set up feed callback
        upstoxWebSocket.setFeedCallback((updates) => {
          // Update positions with live data
          setPositions((prev) =>
            prev.map((p) => {
              const update = updates.find((u) => {
                const token = u.token.split("|")[1] || u.token;
                return p.instrumentToken === token || p.instrumentToken?.includes(token);
              });
              if (update && !p.exitPrice) {
                return { ...p, currentPrice: update.data.ltp };
              }
              return p;
            }),
          );

          // Update option chain data with live prices
          if (optionChainData) {
            // We could update the expiryData here if needed
          }
        });

        const connected = await upstoxWebSocket.connect();
        setWsConnected(connected);

        if (connected) {
          toast.success("Live feed connected");
        }
      } catch (error) {
        console.error("WebSocket initialization error:", error);
        setWsConnected(false);
      }
    };

    initWebSocket();

    return () => {
      // Don't disconnect on unmount to keep connection persistent
    };
  }, [settings.liveFeedEnabled]);

  // Subscribe to tokens when option chain data changes
  useEffect(() => {
    if (!wsConnected || !optionChainData) return;

    // Collect all tokens from all expiries
    const allTokens: string[] = [];
    Object.values(optionChainData.expiryWise || {}).forEach((expiryData) => {
      if (expiryData.ceToken) allTokens.push(...expiryData.ceToken);
      if (expiryData.peToken) allTokens.push(...expiryData.peToken);
    });

    // Also add spot token if available
    if (optionChainData.spotToken) {
      allTokens.push(optionChainData.spotToken);
    }

    if (allTokens.length > 0) {
      upstoxWebSocket.subscribe(allTokens);
    }
  }, [wsConnected, optionChainData]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Fetch option chain data when symbol changes
  useEffect(() => {
    const loadOptionChainData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchOptionChainData(symbol);
        console.log("Option chain data:", data);
        setOptionChainData(data);

        // Set lot size from API
        setLotSize(data.lot || 75);

        // Set current price
        setCurrentPrice(data.spotPrice || 24000);

        // Extract expiry dates from expiryWise
        if (data.expiryWise) {
          const expiryKeys = Object.keys(data.expiryWise).sort();
          setExpiries(expiryKeys);
          if (expiryKeys.length > 0 && !activeExpiry) {
            setActiveExpiry(expiryKeys[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching option chain data:", error);
        toast.error("Failed to load option chain data");
      } finally {
        setIsLoading(false);
      }
    };

    loadOptionChainData();
  }, [symbol]);

  // Calculate margin when positions change
  useEffect(() => {
    const loadMargin = async () => {
      const enabledPositions = positions.filter((p) => p.enabled && !p.exitPrice);
      if (enabledPositions.length === 0) {
        setMargin(0);
        return;
      }

      const marginPositions = enabledPositions.map((p) => ({
        instrumentKey: p.instrumentToken || "",
        side: p.action === "Buy" ? "B" : "S",
        quantity: p.lots * p.lotSize,
        product: "D",
      }));

      try {
        const marginData = await calculateMargin(marginPositions);
        setMargin(marginData.finalMargin || 0);
      } catch (error) {
        console.error("Error calculating margin:", error);
      }
    };

    loadMargin();
  }, [positions]);

  // Get current expiry data
  const currentExpiryData: ExpiryData | null = optionChainData?.expiryWise?.[activeExpiry] || null;

  // Calculate chart data
  const chartData = generatePLChartData(positions, currentPrice, 0.1);
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
          // Create exited position with the lots that are exited
          const exitedPosition: Position = {
            ...p,
            id: Math.random().toString(36).substr(2, 9),
            lots: lotsToExit,
            exitPrice,
          };
          newPositions.push(exitedPosition);

          // Keep remaining lots if any
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
    (strategyId: string) => {
      const today = new Date().toISOString().split("T")[0];
      const strikeDiff = symbol.includes("Bank") ? 100 : 50;
      const atm = Math.round(currentPrice / strikeDiff) * strikeDiff;

      // Create strategy context with optional live data integration
      const ctx: StrategyContext = {
        atmStrike: atm,
        strikeDiff,
        expiry: activeExpiry,
        date: today,
        lotSize,
        getOptionData: currentExpiryData
          ? (strike: number, optType: "CE" | "PE") => {
              // Find the strike data in the data array
              const strikeData = currentExpiryData.data.find((d) => Math.abs(d.strike_price - strike) < 0.01);
              if (!strikeData) return null;

              const optionData = optType === "CE" ? strikeData.call_options : strikeData.put_options;
              if (!optionData) return null;

              return {
                price: optionData.market_data.ltp,
                iv: optionData.option_greeks.iv,
                token: optionData.instrument_key,
              };
            }
          : undefined,
      };

      // Get strategy positions
      const strategyPositions = getStrategyPositions(strategyId, ctx);

      if (strategyPositions.length === 0) {
        toast.info("Strategy coming soon");
        return;
      }

      // Add all positions
      strategyPositions.forEach((pos) => {
        addPosition({
          action: pos.action,
          lots: pos.lots,
          date: pos.date,
          expiry: pos.expiry,
          strike: pos.strike,
          optType: pos.optType,
          entryPrice: pos.entryPrice,
          currentPrice: pos.currentPrice,
          IV: pos.IV,
          lotSize: pos.lotSize,
          instrumentToken: pos.instrumentToken,
        });
      });

      setShowStrategies(false);
    },
    [activeExpiry, currentPrice, lotSize, addPosition, symbol, currentExpiryData],
  );

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchOptionChainData(symbol);
      setOptionChainData(data);
      setCurrentPrice(data.spotPrice || currentPrice);
      toast.success("Data refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  }, [symbol, currentPrice]);

  const handleSaveStrategy = useCallback(
    async (name: string, description: string, type: string) => {
      await saveStrategy(name, description, type, positions, symbol);
    },
    [positions, symbol, saveStrategy],
  );

  const handleLoadStrategy = useCallback((strategy: SavedStrategy) => {
    setPositions(
      strategy.positions.map((p) => ({
        ...p,
        id: Math.random().toString(36).substr(2, 9),
      })),
    );
    setShowStrategies(false);
    toast.success(`Loaded: ${strategy.name}`);
  }, []);

  const handleDeleteStrategy = useCallback(async (id: string) => {
    await deleteStrategy(id);
  }, [deleteStrategy]);

  const handleCopyToClipboard = useCallback(() => {
    const strategyData = {
      symbol,
      positions: positions.map((p) => ({
        action: p.action,
        strike: p.strike,
        optType: p.optType,
        lots: p.lots,
        expiry: p.expiry,
        entryPrice: p.entryPrice,
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(strategyData, null, 2));
    toast.success("Strategy copied to clipboard");
  }, [positions, symbol]);

  const navigateExpiry = (direction: "prev" | "next") => {
    const currentIndex = expiries.indexOf(activeExpiry);
    if (direction === "prev" && currentIndex > 0) {
      setActiveExpiry(expiries[currentIndex - 1]);
    } else if (direction === "next" && currentIndex < expiries.length - 1) {
      setActiveExpiry(expiries[currentIndex + 1]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasPositions = positions.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>
      <ProFeatureGate featureName="Option Builder">
        {/* Header */}
        <div className="border-b border-border">
          <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Select value={symbol} onValueChange={setSymbol} disabled={loadingSymbols}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={loadingSymbols ? "Loading..." : "Select Symbol"} />
                </SelectTrigger>
                <SelectContent>
                  {symbols.indexSymbols.length > 0 && (
                    <>
                      <SelectItem
                        value="__index_header"
                        disabled
                        className="font-semibold text-xs text-muted-foreground"
                      >
                        INDEX
                      </SelectItem>
                      {symbols.indexSymbols.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {symbols.stockSymbols.length > 0 && (
                    <>
                      <SelectItem
                        value="__stock_header"
                        disabled
                        className="font-semibold text-xs text-muted-foreground mt-2"
                      >
                        STOCKS
                      </SelectItem>
                      {symbols.stockSymbols.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {symbols.indexSymbols.length === 0 && symbols.stockSymbols.length === 0 && (
                    <>
                      <SelectItem value="Nifty 50">NIFTY</SelectItem>
                      <SelectItem value="Nifty Bank">BANKNIFTY</SelectItem>
                      <SelectItem value="Nifty Fin Service">FINNIFTY</SelectItem>
                      <SelectItem value="Nifty Mid Select">MIDCPNIFTY</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {/* WebSocket status indicator */}
              <div className="flex items-center gap-1 text-xs">
                {wsConnected ? (
                  <Wifi className="h-3 w-3 text-emerald-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-muted-foreground" />
                )}
                <span className={wsConnected ? "text-emerald-500" : "text-muted-foreground"}>
                  {wsConnected ? "Live" : "Offline"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)} disabled={!hasPositions}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLoadDialogOpen(true)}>
                <Download className="h-4 w-4 mr-1" />
                Load
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllPositions}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyToClipboard} disabled={!hasPositions}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Spot: <span className="text-foreground font-medium">{currentPrice.toFixed(2)}</span>
              </span>
              <span className="text-muted-foreground">
                Lot Size: <span className="text-foreground font-medium">{lotSize}</span>
              </span>
              {margin > 0 && (
                <span className="text-muted-foreground">
                  Margin: <span className="text-foreground font-medium">₹{formatIndianNumber(Math.round(margin))}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expiry Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <div className="container mx-auto px-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateExpiry("prev")}
              disabled={expiries.indexOf(activeExpiry) === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {expiries.map((exp) => (
              <button
                key={exp}
                className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeExpiry === exp
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveExpiry(exp)}
              >
                {exp}
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateExpiry("next")}
              disabled={expiries.indexOf(activeExpiry) === expiries.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Option Chain (always visible) */}
          <div className="space-y-6">
            {/* Option Chain - always visible */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Option Chain - {activeExpiry}</h3>
                  <div className="flex items-center gap-2">
                    {hasPositions && (
                      <Button variant="ghost" size="sm" onClick={() => setShowStrategies(!showStrategies)}>
                        {showStrategies ? "Hide" : "Show"} Strategies
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setShowOptionChain(!showOptionChain)}>
                      {showOptionChain ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {showOptionChain && (
                  <OptionBuilderChain
                    symbol={symbol}
                    expiry={activeExpiry}
                    currentPrice={currentPrice}
                    lotSize={lotSize}
                    expiryData={currentExpiryData}
                    isLoading={isLoading}
                    onAddPosition={addPosition}
                    callColumns={settings.callColumns}
                    putColumns={settings.putColumns}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Chart & Metrics (only show when positions exist) */}
          <div className="space-y-6">
            {/* Strategies Panel - only show when no positions */}
            {showStrategies && !hasPositions && <OptionBuilderStrategies onSelectStrategy={handleAddStrategy} />}
            {hasPositions && (
              <>
                {/* Metrics */}
                <OptionBuilderMetrics
                  maxProfit={maxProfit}
                  maxLoss={maxLoss}
                  breakevens={breakevens}
                  currentPL={currentPL}
                  riskReward={
                    typeof maxProfit === "number" && typeof maxLoss === "number" && maxLoss !== 0
                      ? Math.abs(maxProfit / maxLoss)
                      : null
                  }
                  margin={margin}
                />

                {/* Chart */}
                <Card>
                  <CardContent className="p-4">
                    <OptionBuilderChart
                      expiryData={chartData.expiry}
                      todayData={chartData.today}
                      currentPrice={currentPrice}
                    />
                  </CardContent>
                </Card>
              </>
            )}

            {!hasPositions && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-muted-foreground">
                    <p className="text-lg mb-2">No positions yet</p>
                    <p className="text-sm">
                      Select a strategy or add positions from the option chain to see the payoff chart
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Bottom Panel - Positions Table */}
        <div className="mt-6">
          <Card>
            <CardContent className="p-4">
              <Tabs defaultValue="legs">
                <TabsList>
                  <TabsTrigger value="legs">Legs</TabsTrigger>
                  <TabsTrigger value="greeks">Greeks</TabsTrigger>
                </TabsList>
                <TabsContent value="legs" className="mt-4">
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
                <TabsContent value="greeks" className="mt-4">
                  <OptionBuilderGreeks positions={positions} totalGreeks={greeks} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />

      {/* Dialogs */}
      <OptionBuilderSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
      />

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
      </ProFeatureGate>
    </div>
  );
};

export default OptionBuilder;
