import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, addDays, subDays, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import {
  Save,
  Download,
  RefreshCw,
  Copy,
  ChevronUp,
  ChevronDown,
  CalendarIcon,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Settings,
  FileDown,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import OptionBuilderChart from "@/components/optionBuilder/OptionBuilderChart";
import OptionBuilderPositions from "@/components/optionBuilder/OptionBuilderPositions";
import OptionBuilderGreeks from "@/components/optionBuilder/OptionBuilderGreeks";
import OptionBuilderMetrics from "@/components/optionBuilder/OptionBuilderMetrics";
import OptionBuilderStrategies from "@/components/optionBuilder/OptionBuilderStrategies";
import SaveStrategyDialog from "@/components/optionBuilder/SaveStrategyDialog";
import LoadStrategyDialog from "@/components/optionBuilder/LoadStrategyDialog";
import { useSavedStrategies, SavedStrategy } from "@/hooks/useSavedStrategies";
import AdjustmentModal, {
  AdjustmentRule,
  TriggerCondition,
  ExitAction,
} from "@/components/optionBuilder/AdjustmentModal";
import PLHistoryChart from "@/components/optionBuilder/PLHistoryChart";
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
  fetchTradingDays,
  SimulatorData,
  getLotSizeForSymbol,
} from "@/services/optionSimulatorApi";
import { getStrategyPositions, StrategyContext } from "@/utils/optionStrategies";

interface PLHistoryPoint {
  time: string;
  pnl: number;
  spotPrice: number;
  date: string;
}

interface SymbolsData {
  indexSymbols: string[];
  stockSymbols: string[];
}

const PLAYBACK_SPEEDS = [
  { value: 1000, label: "1s" },
  { value: 2000, label: "2s" },
  { value: 3000, label: "3s" },
  { value: 5000, label: "5s" },
];

const SKIP_INTERVALS = [
  { value: 3, label: "3m" },
  { value: 15, label: "15m" },
  { value: 30, label: "30m" },
  { value: 60, label: "1h" },
];

const OptionSimulator = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Database-backed strategies
  const { strategies: savedStrategies, saveStrategy, deleteStrategy, loading: strategiesLoading } = useSavedStrategies({ source: "simulator" });

  // Simulator controls
  const [symbol, setSymbol] = useState("Nifty 50");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(15);
  const [expiries, setExpiries] = useState<string[]>([]);
  const [activeExpiry, setActiveExpiry] = useState<string>("");
  const [simulatorData, setSimulatorData] = useState<SimulatorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExpiries, setIsLoadingExpiries] = useState(false);
  const [tradingDays, setTradingDays] = useState<string[]>([]);
  const [autoPlay, setAutoPlay] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2000); // milliseconds
  const [skipInterval, setSkipInterval] = useState(3); // minutes

  // Symbols from API
  const [symbols, setSymbols] = useState<SymbolsData>({ indexSymbols: [], stockSymbols: [] });
  const [loadingSymbols, setLoadingSymbols] = useState(false);

  // Positions and UI state
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [lotSize, setLotSize] = useState(75);
  const [showStrategies, setShowStrategies] = useState(true);
  const [showChain, setShowChain] = useState(true);
  const [plHistory, setPlHistory] = useState<PLHistoryPoint[]>([]);
  const lastRecordedTime = useRef<string>("");

  // Dialogs
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [adjustmentRules, setAdjustmentRules] = useState<AdjustmentRule[]>([]);

  // Computed selected time as string
  const selectedTime = useMemo(() => {
    return selectedHour.toString().padStart(2, "0") + selectedMinute.toString().padStart(2, "0");
  }, [selectedHour, selectedMinute]);

  // Load trading days and symbols on mount
  useEffect(() => {
    const loadTradingDays = async () => {
      try {
        const days = await fetchTradingDays();
        setTradingDays(days);
      } catch (error) {
        console.error("Error fetching trading days:", error);
      }
    };
    loadTradingDays();
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

  // Check if a date is a trading day
  const isTradingDay = useCallback(
    (date: Date) => {
      if (tradingDays.length === 0) return true; // Allow all if not loaded
      const dateStr = format(date, "yyyy-MM-dd");
      return tradingDays.includes(dateStr);
    },
    [tradingDays],
  );

  // Find next/previous trading day
  const findNextTradingDay = useCallback(
    (date: Date, direction: number = 1): Date => {
      const d = new Date(date);
      do {
        d.setDate(d.getDate() + direction);
      } while (!isTradingDay(d) && tradingDays.length > 0);
      return d;
    },
    [isTradingDay, tradingDays],
  );

  // Adjust time by minutes - auto-fetches data after change
  const adjustTime = useCallback(
    (minutes: number) => {
      // Handle day jump
      if (Math.abs(minutes) >= 1440) {
        const direction = minutes > 0 ? 1 : -1;
        const newDate = findNextTradingDay(selectedDate, direction);
        newDate.setHours(direction > 0 ? 9 : 15);
        newDate.setMinutes(direction > 0 ? 15 : 30);
        setSelectedDate(newDate);
        setSelectedHour(direction > 0 ? 9 : 15);
        setSelectedMinute(direction > 0 ? 15 : 30);
        return;
      }

      let totalMinutes = selectedHour * 60 + selectedMinute + minutes;

      const startMinutes = 9 * 60 + 15; // 9:15
      const endMinutes = 15 * 60 + 30; // 15:30

      // Handle overflow to next/previous day
      if (totalMinutes < startMinutes) {
        const prevDay = findNextTradingDay(selectedDate, -1);
        setSelectedDate(prevDay);
        setSelectedHour(15);
        setSelectedMinute(30);
        return;
      } else if (totalMinutes > endMinutes) {
        const nextDay = findNextTradingDay(selectedDate, 1);
        setSelectedDate(nextDay);
        setSelectedHour(9);
        setSelectedMinute(15);
        return;
      }

      // Round to nearest 3-minute interval
      totalMinutes = Math.round(totalMinutes / 3) * 3;

      const newHour = Math.floor(totalMinutes / 60);
      const newMinute = totalMinutes % 60;

      setSelectedHour(newHour);
      setSelectedMinute(newMinute);
    },
    [selectedHour, selectedMinute, selectedDate, findNextTradingDay],
  );

  // Auto-fetch data when time changes (but not date - date changes trigger expiry reload)
  useEffect(() => {
    if (activeExpiry && simulatorData) {
      loadStrikesData();
    }
  }, [selectedTime]);

  // Handle authentication
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

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

  // Update positions' currentPrice when simulator data changes
  useEffect(() => {
    if (!simulatorData || simulatorData.strikes.length === 0) return;

    setPositions((prevPositions) =>
      prevPositions.map((pos) => {
        // Find the strike data for this position
        const strikeData = simulatorData.strikes.find((s) => s.strike === pos.strike);
        if (!strikeData) return pos;

        // Get the current price based on option type
        const newCurrentPrice = pos.optType === "CE" ? strikeData.cePrice : strikeData.pePrice;
        const newIV = pos.optType === "CE" ? strikeData.ceIV : strikeData.peIV;

        // Only update if not exited
        if (pos.exitPrice !== undefined) return pos;

        return {
          ...pos,
          currentPrice: newCurrentPrice,
          IV: newIV,
        };
      }),
    );
  }, [simulatorData]);

  // Auto-play interval with configurable speed and skip interval
  useEffect(() => {
    if (!autoPlay) return;

    const interval = setInterval(() => {
      adjustTime(skipInterval);
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [autoPlay, adjustTime, playbackSpeed, skipInterval]);

  // Check and execute adjustment rules when data changes
  useEffect(() => {
    if (!simulatorData || adjustmentRules.length === 0) return;

    const checkTriggerCondition = (pos: Position, trigger: TriggerCondition): boolean => {
      const profitPercent =
        (((pos.currentPrice - pos.entryPrice) * (pos.action === "Buy" ? 1 : -1)) / pos.entryPrice) * 100;
      const profitAmount =
        (pos.currentPrice - pos.entryPrice) * pos.lots * pos.lotSize * (pos.action === "Buy" ? 1 : -1);

      switch (trigger.trigger) {
        case "profitPercent":
          return profitPercent >= trigger.value;
        case "profitAmount":
          return profitAmount >= trigger.value;
        case "lossPercent":
          return -profitPercent >= trigger.value;
        case "lossAmount":
          return -profitAmount >= trigger.value;
        case "priceLevel":
          return pos.action === "Buy" ? pos.currentPrice >= trigger.value : pos.currentPrice <= trigger.value;
        default:
          return false;
      }
    };

    const executeAdjustmentAction = (mainIndex: number, linkedIndices: number[], action: ExitAction) => {
      const allIndices = [mainIndex, ...linkedIndices];

      setPositions((prev) => {
        const newPositions: Position[] = [];

        prev.forEach((pos, idx) => {
          if (!allIndices.includes(idx)) {
            newPositions.push(pos);
            return;
          }

          switch (action.type) {
            case "exitAll":
              newPositions.push({ ...pos, exitPrice: pos.currentPrice });
              break;
            case "exitPartial":
              const lotsToExit = Math.min(action.lotsToExit || 1, pos.lots);
              if (lotsToExit >= pos.lots) {
                newPositions.push({ ...pos, exitPrice: pos.currentPrice });
              } else {
                // Exited portion
                newPositions.push({
                  ...pos,
                  id: Math.random().toString(36).substr(2, 9),
                  lots: lotsToExit,
                  exitPrice: pos.currentPrice,
                });
                // Remaining portion
                newPositions.push({
                  ...pos,
                  lots: pos.lots - lotsToExit,
                });
              }
              break;
            case "exitAndReenter":
              // Exit current
              newPositions.push({ ...pos, exitPrice: pos.currentPrice });
              // Reenter at new strike
              const strikeDiff = symbol.includes("Bank") ? 100 : 50;
              const newStrike = pos.strike + (action.strikeDiff || strikeDiff);
              const strikeData = simulatorData?.strikes.find((s) => s.strike === newStrike);
              if (strikeData) {
                const newPrice = pos.optType === "CE" ? strikeData.cePrice : strikeData.pePrice;
                const newIV = pos.optType === "CE" ? strikeData.ceIV : strikeData.peIV;
                newPositions.push({
                  ...pos,
                  id: Math.random().toString(36).substr(2, 9),
                  strike: newStrike,
                  entryPrice: newPrice,
                  currentPrice: newPrice,
                  IV: newIV,
                  exitPrice: undefined,
                });
              }
              break;
            case "sizeUp":
              // Keep existing position
              newPositions.push(pos);
              // Add new position with additional lots
              newPositions.push({
                ...pos,
                id: Math.random().toString(36).substr(2, 9),
                lots: action.additionalLots || 1,
                entryPrice: pos.currentPrice,
              });
              break;
            default:
              newPositions.push(pos);
          }
        });

        return newPositions;
      });
    };

    setAdjustmentRules((prevRules) => {
      const updatedRules = prevRules.map((rule) => {
        if (!rule.isActive) return rule;

        const mainPos = positions[rule.mainPositionIndex];
        if (!mainPos || mainPos.exitPrice !== undefined) {
          return { ...rule, isActive: false };
        }

        // Check if any trigger condition is met
        const triggered = rule.triggers.some((trigger) => checkTriggerCondition(mainPos, trigger));

        if (triggered) {
          executeAdjustmentAction(rule.mainPositionIndex, rule.linkedPositionIndices, rule.exitAction);
          toast.success(
            `Adjustment triggered: ${rule.exitAction.type} on ${mainPos.action} ${mainPos.strike}${mainPos.optType}`,
          );
          return { ...rule, isActive: false };
        }

        return rule;
      });

      return updatedRules;
    });
  }, [simulatorData, positions, symbol]);

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

  // Track P&L history when time changes and we have positions
  useEffect(() => {
    const timeKey = `${format(selectedDate, "yyyy-MM-dd")}_${selectedTime}`;
    if (positions.length > 0 && currentPrice > 0 && timeKey !== lastRecordedTime.current) {
      lastRecordedTime.current = timeKey;
      setPlHistory((prev) => {
        // Avoid duplicate entries
        const existing = prev.find((p) => p.date === format(selectedDate, "yyyy-MM-dd") && p.time === selectedTime);
        if (existing) return prev;

        return [
          ...prev,
          {
            time: selectedTime,
            pnl: currentPL,
            spotPrice: currentPrice,
            date: format(selectedDate, "yyyy-MM-dd"),
          },
        ];
      });
    }
  }, [selectedTime, selectedDate, currentPL, currentPrice, positions.length]);

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
    (strategyId: string) => {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const strikeDiff = symbol.includes("Bank") ? 100 : 50;
      const atm = Math.round(currentPrice / strikeDiff) * strikeDiff;

      // Create strategy context with live simulator data integration
      const ctx: StrategyContext = {
        atmStrike: atm,
        strikeDiff,
        expiry: activeExpiry,
        date: dateStr,
        lotSize,
        getOptionData: simulatorData
          ? (strike: number, optType: "CE" | "PE") => {
              const strikeData = simulatorData.strikes.find((s) => Math.abs(s.strike - strike) < 0.01);
              if (!strikeData) return null;

              return {
                price: optType === "CE" ? strikeData.cePrice : strikeData.pePrice,
                iv: optType === "CE" ? strikeData.ceIV : strikeData.peIV,
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
    [activeExpiry, currentPrice, lotSize, addPosition, symbol, selectedDate, simulatorData],
  );

  const handleSaveStrategy = async (name: string, description: string, type: string) => {
    await saveStrategy(name, description, type, positions, symbol);
  };

  const handleLoadStrategy = (strategy: SavedStrategy) => {
    setPositions(strategy.positions);
    setShowStrategies(false);
    toast.success(`Loaded: ${strategy.name}`);
  };

  const handleDeleteStrategy = async (id: string) => {
    await deleteStrategy(id);
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

  // Export functions
  const exportToJSON = () => {
    const exportData = {
      metadata: {
        symbol,
        date: format(selectedDate, "yyyy-MM-dd"),
        time: selectedTime,
        expiry: activeExpiry,
        spotPrice: currentPrice,
        exportedAt: new Date().toISOString(),
      },
      positions: positions.map((pos) => ({
        action: pos.action,
        strike: pos.strike,
        optType: pos.optType,
        lots: pos.lots,
        lotSize: pos.lotSize,
        entryPrice: pos.entryPrice,
        currentPrice: pos.currentPrice,
        exitPrice: pos.exitPrice,
        pnl:
          (pos.exitPrice !== undefined ? pos.exitPrice : pos.currentPrice - pos.entryPrice) *
          pos.lots *
          pos.lotSize *
          (pos.action === "Buy" ? 1 : -1),
        IV: pos.IV,
        expiry: pos.expiry,
        date: pos.date,
      })),
      plHistory: plHistory,
      summary: {
        totalPnL: currentPL,
        positionCount: positions.length,
        activePositions: positions.filter((p) => p.exitPrice === undefined).length,
        exitedPositions: positions.filter((p) => p.exitPrice !== undefined).length,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulation_${symbol.replace(/\s+/g, "_")}_${format(selectedDate, "yyyy-MM-dd")}_${selectedTime}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported to JSON");
  };

  const exportToCSV = () => {
    // Positions CSV
    const positionsHeader = [
      "Action",
      "Strike",
      "Type",
      "Lots",
      "Lot Size",
      "Entry Price",
      "Current Price",
      "Exit Price",
      "P&L",
      "IV",
      "Expiry",
      "Entry Date",
    ].join(",");

    const positionsRows = positions.map((pos) => {
      const pnl =
        ((pos.exitPrice !== undefined ? pos.exitPrice : pos.currentPrice) - pos.entryPrice) *
        pos.lots *
        pos.lotSize *
        (pos.action === "Buy" ? 1 : -1);
      return [
        pos.action,
        pos.strike,
        pos.optType,
        pos.lots,
        pos.lotSize,
        pos.entryPrice.toFixed(2),
        pos.currentPrice.toFixed(2),
        pos.exitPrice?.toFixed(2) || "",
        pnl.toFixed(2),
        pos.IV.toFixed(2),
        pos.expiry,
        pos.date,
      ].join(",");
    });

    const positionsCSV = [positionsHeader, ...positionsRows].join("\n");

    // P&L History CSV
    const historyHeader = ["Date", "Time", "P&L", "Spot Price"].join(",");
    const historyRows = plHistory.map((h) =>
      [h.date, h.time.replace(/^(\d{2})(\d{2})$/, "$1:$2"), h.pnl.toFixed(2), h.spotPrice.toFixed(2)].join(","),
    );
    const historyCSV = [historyHeader, ...historyRows].join("\n");

    // Combine both
    const fullCSV = `POSITIONS\n${positionsCSV}\n\nP&L HISTORY\n${historyCSV}\n\nSUMMARY\nSymbol,${symbol}\nDate,${format(selectedDate, "yyyy-MM-dd")}\nTime,${selectedTime}\nExpiry,${activeExpiry}\nSpot Price,${currentPrice}\nTotal P&L,${currentPL.toFixed(2)}`;

    const blob = new Blob([fullCSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulation_${symbol.replace(/\s+/g, "_")}_${format(selectedDate, "yyyy-MM-dd")}_${selectedTime}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
  };

  const clearPlHistory = () => {
    setPlHistory([]);
    lastRecordedTime.current = "";
    toast.success("P&L history cleared");
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
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <ProFeatureGate featureName="Option Simulator">
        <main className="flex-1 container mx-auto px-2 py-3">
          {/* Simulator Toolbar - Responsive */}
        <div className="flex flex-wrap items-center gap-1 mb-4 p-2 bg-card rounded-lg border">
          {/* Mobile: Simplified controls */}
          {isMobile ? (
            <>
              {/* Day Navigation */}
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  let prevDate = subDays(selectedDate, 1);
                  while (!isTradingDay(prevDate) && prevDate > subDays(new Date(), 365)) {
                    prevDate = subDays(prevDate, 1);
                  }
                  setSelectedDate(prevDate);
                }}
              >
                <ChevronLeft className="h-3 w-3" />
                Day
              </Button>

              {/* -3m */}
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => adjustTime(-skipInterval)}
              >
                -{skipInterval}m
              </Button>

              {/* Date & Time Display */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-center text-xs h-8">
                    {format(selectedDate, "dd/MM")} {selectedHour.toString().padStart(2, "0")}:
                    {selectedMinute.toString().padStart(2, "0")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => !isTradingDay(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                  <div className="flex gap-2 p-3 border-t">
                    <Select value={selectedHour.toString()} onValueChange={(v) => setSelectedHour(parseInt(v))}>
                      <SelectTrigger className="w-16 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[9, 10, 11, 12, 13, 14, 15].map((h) => (
                          <SelectItem key={h} value={h.toString()}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedMinute.toString()} onValueChange={(v) => setSelectedMinute(parseInt(v))}>
                      <SelectTrigger className="w-16 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 20 }, (_, i) => i * 3).map((m) => (
                          <SelectItem key={m} value={m.toString()}>
                            {m.toString().padStart(2, "0")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>

              {/* +3m */}
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => adjustTime(skipInterval)}
              >
                +{skipInterval}m
              </Button>

              {/* Day Navigation */}
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  let nextDate = addDays(selectedDate, 1);
                  while (!isTradingDay(nextDate) && nextDate < addDays(new Date(), 365)) {
                    nextDate = addDays(nextDate, 1);
                  }
                  setSelectedDate(nextDate);
                }}
              >
                Day
                <ChevronRight className="h-3 w-3" />
              </Button>

              {/* Auto Play */}
              <Button
                variant={autoPlay ? "destructive" : "default"}
                size="sm"
                className={autoPlay ? "" : "bg-emerald-500 hover:bg-emerald-600"}
                onClick={() => setAutoPlay(!autoPlay)}
              >
                {autoPlay ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
            </>
          ) : (
            <>
              {/* Desktop: Full controls */}
              {/* Day Navigation Buttons */}
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  let prevDate = subDays(selectedDate, 1);
                  while (!isTradingDay(prevDate) && prevDate > subDays(new Date(), 365)) {
                    prevDate = subDays(prevDate, 1);
                  }
                  setSelectedDate(prevDate);
                }}
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                Day
              </Button>

              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  setSelectedHour(9);
                  setSelectedMinute(15);
                }}
              >
                SOD
              </Button>

              {/* Time Adjustment Buttons */}
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => adjustTime(-120)}
              >
                -2h
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => adjustTime(-30)}
              >
                -30m
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => adjustTime(-15)}
              >
                -15m
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => adjustTime(-3)}
              >
                -3m
              </Button>

              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-32 justify-start text-left font-normal text-sm h-8">
                    {format(selectedDate, "dd/MM/yyyy")}
                    <CalendarIcon className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => !isTradingDay(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {/* Hour Selector */}
              <Select value={selectedHour.toString()} onValueChange={(v) => setSelectedHour(parseInt(v))}>
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[9, 10, 11, 12, 13, 14, 15].map((h) => (
                    <SelectItem key={h} value={h.toString()}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Minute Selector */}
              <Select value={selectedMinute.toString()} onValueChange={(v) => setSelectedMinute(parseInt(v))}>
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 20 }, (_, i) => i * 3).map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m.toString().padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Time Forward Buttons */}
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => adjustTime(3)}
              >
                3m+
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => adjustTime(15)}
              >
                15m+
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => adjustTime(30)}
              >
                30m+
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => adjustTime(120)}
              >
                2h+
              </Button>

              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  setSelectedHour(15);
                  setSelectedMinute(30);
                }}
              >
                EOD
              </Button>

              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  let nextDate = addDays(selectedDate, 1);
                  while (!isTradingDay(nextDate) && nextDate < addDays(new Date(), 365)) {
                    nextDate = addDays(nextDate, 1);
                  }
                  setSelectedDate(nextDate);
                }}
              >
                Day
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>

              <div className="h-6 w-px bg-border mx-1" />

              {/* Auto Play Controls */}
              <Button
                variant={autoPlay ? "destructive" : "default"}
                size="sm"
                className={autoPlay ? "" : "bg-emerald-500 hover:bg-emerald-600"}
                onClick={() => setAutoPlay(!autoPlay)}
              >
                {autoPlay ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                Auto
              </Button>

              {/* Playback Speed Selector */}
              <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(parseInt(v))}>
                <SelectTrigger className="w-16 h-8" title="Playback Speed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <SelectItem key={speed.value} value={speed.value.toString()}>
                      {speed.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Skip Interval Selector */}
              <Select value={skipInterval.toString()} onValueChange={(v) => setSkipInterval(parseInt(v))}>
                <SelectTrigger className="w-16 h-8" title="Skip Interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKIP_INTERVALS.map((interval) => (
                    <SelectItem key={interval.value} value={interval.value.toString()}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Second Row - Symbol, Expiry, Load Data */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Select value={symbol} onValueChange={setSymbol} disabled={loadingSymbols}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={loadingSymbols ? "Loading..." : "Select Symbol"} />
            </SelectTrigger>
            <SelectContent>
              {symbols.indexSymbols.length > 0 && (
                <>
                  <SelectItem value="__index_header" disabled className="font-semibold text-xs text-muted-foreground">
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
          <Button
            variant={adjustmentRules.filter((r) => r.isActive).length > 0 ? "default" : "outline"}
            size="icon"
            onClick={() => setAdjustmentDialogOpen(true)}
            disabled={positions.length === 0}
            title={`Position Adjustments${adjustmentRules.filter((r) => r.isActive).length > 0 ? ` (${adjustmentRules.filter((r) => r.isActive).length} active)` : ""}`}
            className={
              adjustmentRules.filter((r) => r.isActive).length > 0 ? "bg-amber-500 hover:bg-amber-600 relative" : ""
            }
          >
            <Settings className="h-4 w-4" />
            {adjustmentRules.filter((r) => r.isActive).length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                {adjustmentRules.filter((r) => r.isActive).length}
              </span>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setLoadDialogOpen(true)}>
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSaveDialogOpen(true)}
            disabled={positions.length === 0}
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleCopyStrategy} disabled={positions.length === 0}>
            <Copy className="h-4 w-4" />
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={positions.length === 0} title="Export Results">
                <FileDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToJSON}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              {plHistory.length > 0 && (
                <DropdownMenuItem onClick={clearPlHistory} className="text-destructive">
                  Clear P&L History
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="text-center text-emerald-500 text-xs">OI</TableHead>
                          <TableHead className="text-center text-emerald-500 text-xs">Vol</TableHead>
                          <TableHead className="text-center text-emerald-500 text-xs">IV</TableHead>
                          <TableHead className="text-center text-emerald-500 text-xs">LTP</TableHead>
                          <TableHead className="text-center font-bold text-xs">Strike</TableHead>
                          <TableHead className="text-center text-red-500 text-xs">LTP</TableHead>
                          <TableHead className="text-center text-red-500 text-xs">IV</TableHead>
                          <TableHead className="text-center text-red-500 text-xs">Vol</TableHead>
                          <TableHead className="text-center text-red-500 text-xs">OI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {simulatorData.strikes.map((strike) => {
                          const strikeDiff = symbol.includes("Bank") ? 100 : 50;
                          const atmStrike = Math.round(currentPrice / strikeDiff) * strikeDiff;
                          const isATM = Math.abs(strike.strike - atmStrike) < strikeDiff / 2;
                          const isITMCall = strike.strike < currentPrice;
                          const isITMPut = strike.strike > currentPrice;

                          return (
                            <TableRow
                              key={strike.strike}
                              className={`relative cursor-pointer transition-colors group ${isATM ? "bg-oc-atm font-medium" : ""}`}
                            >
                              {/* Call Side */}
                              <TableCell className={`text-center text-xs ${isITMCall ? "bg-oc-call-itm" : ""}`}>
                                {formatNumber(strike.ceOI)}
                              </TableCell>
                              <TableCell className={`text-center text-xs ${isITMCall ? "bg-oc-call-itm" : ""}`}>
                                {formatNumber(strike.ceVolume)}
                              </TableCell>
                              <TableCell className={`text-center text-xs ${isITMCall ? "bg-oc-call-itm" : ""}`}>
                                {strike.ceIV.toFixed(1)}
                              </TableCell>
                              <TableCell className={`text-center relative ${isITMCall ? "bg-oc-call-itm" : ""}`}>
                                <span className="text-xs font-medium">{strike.cePrice.toFixed(2)}</span>
                                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="sm"
                                    className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
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
                                    variant="destructive"
                                    className="h-6 px-2 text-xs"
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
                              </TableCell>

                              {/* Strike */}
                              <TableCell
                                className={`text-center font-bold text-xs ${isATM ? "text-oc-atm-text bg-oc-atm" : ""}`}
                              >
                                {strike.strike}
                              </TableCell>

                              {/* Put Side */}
                              <TableCell className={`text-center relative ${isITMPut ? "bg-oc-put-itm" : ""}`}>
                                <span className="text-xs font-medium">{strike.pePrice.toFixed(2)}</span>
                                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="sm"
                                    className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
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
                                    variant="destructive"
                                    className="h-6 px-2 text-xs"
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
                              </TableCell>
                              <TableCell className={`text-center text-xs ${isITMPut ? "bg-oc-put-itm" : ""}`}>
                                {strike.peIV.toFixed(1)}
                              </TableCell>
                              <TableCell className={`text-center text-xs ${isITMPut ? "bg-oc-put-itm" : ""}`}>
                                {formatNumber(strike.peVolume)}
                              </TableCell>
                              <TableCell className={`text-center text-xs ${isITMPut ? "bg-oc-put-itm" : ""}`}>
                                {formatNumber(strike.peOI)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
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

                {/* P&L History Chart */}
                <PLHistoryChart history={plHistory} />
              </>
            )}

            {/* Positions */}
            {positions.length > 0 && (
              <Card>
                <CardContent className="p-3">
                  <Tabs defaultValue="legs">
                    <div className="flex items-center justify-between mb-2">
                      <TabsList className="h-8">
                        <TabsTrigger value="legs" className="text-xs">
                          Legs
                        </TabsTrigger>
                        <TabsTrigger value="greeks" className="text-xs">
                          Greeks
                        </TabsTrigger>
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

      <AdjustmentModal
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
        positions={positions}
        adjustmentRules={adjustmentRules}
        onSaveRules={setAdjustmentRules}
      />
    </ProFeatureGate>
    </div>
  );
};

export default OptionSimulator;
