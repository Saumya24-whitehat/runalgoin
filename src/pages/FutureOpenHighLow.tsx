import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Download,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  RefreshCw,
  Info,
} from "lucide-react";
import { TickerRibbon } from "@/components/TickerRibbon";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AdminPaletteButton } from "@/components/admin/AdminPaletteButton";
import { PageInfoModal } from "@/components/PageInfoModal";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { MobileSymbolExpiryBar } from "@/components/mobile/MobileSymbolExpiryBar";
import { fetchFutureOpenHighLow, fetchFutureExpiryDates, OpenHighLowItem } from "@/services/futureOpenHighLowApi";
import { supabase } from "@/integrations/supabase/client";

const INDEX_SYMBOLS = ["Nifty 50", "Nifty Bank", "Nifty Fin Service", "Nifty Mid Select"];

type SortDirection = "asc" | "desc" | null;
type SortColumn = "symbol" | "open" | "high" | "low" | "lastPrice" | "priceChange" | "openHighDiff" | "openLowDiff";

interface SortState {
  column: SortColumn | null;
  direction: SortDirection;
}

const formatNumber = (num: number, decimals = 2) => {
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatPercent = (num: number) => {
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
};

// Sortable header component
function SortableHeader({
  label,
  column,
  sortState,
  onSort,
}: {
  label: string;
  column: SortColumn;
  sortState: SortState;
  onSort: (column: SortColumn) => void;
}) {
  const isActive = sortState.column === column;

  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          sortState.direction === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}

export default function FutureOpenHighLow() {
  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(60000);

  // Separate sort states for each table
  const [openHighSort, setOpenHighSort] = useState<SortState>({ column: null, direction: null });
  const [openLowSort, setOpenLowSort] = useState<SortState>({ column: null, direction: null });

  // Fetch available symbols
  useEffect(() => {
    async function loadSymbols() {
      try {
        const { data } = await supabase.functions.invoke("option-chain", {
          body: { action: "getSymbols" },
        });
        if (data?.symbols) {
          setAllSymbols([...INDEX_SYMBOLS, ...data.symbols.filter((s: string) => !INDEX_SYMBOLS.includes(s))]);
        }
      } catch (error) {
        console.error("Failed to load symbols:", error);
        setAllSymbols(INDEX_SYMBOLS);
      }
    }
    loadSymbols();
  }, []);

  // Fetch expiry dates for selected symbol
  const { data: expiryDates = [] } = useQuery({
    queryKey: ["future-expiry-dates", selectedSymbol],
    queryFn: () => fetchFutureExpiryDates(selectedSymbol),
    staleTime: 1000 * 60 * 60,
  });

  // Set default expiry when data loads
  useEffect(() => {
    if (expiryDates.length > 0 && !selectedExpiry) {
      setSelectedExpiry(expiryDates[0]);
    }
  }, [expiryDates, selectedExpiry]);

  // Fetch open-high-low data
  const {
    data: openHighLowData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["futureOpenHighLow", selectedSymbol, selectedExpiry],
    queryFn: () => fetchFutureOpenHighLow(selectedSymbol, selectedExpiry),
    enabled: !!selectedExpiry,
    staleTime: 1000 * 30,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Sort function
  const sortData = (data: OpenHighLowItem[], sortState: SortState): OpenHighLowItem[] => {
    if (!sortState.column || !sortState.direction) return data;

    return [...data].sort((a, b) => {
      let aVal: number | string = a[sortState.column!];
      let bVal: number | string = b[sortState.column!];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortState.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      aVal = Number(aVal);
      bVal = Number(bVal);

      return sortState.direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  };

  const handleSort = (
    column: SortColumn,
    currentSort: SortState,
    setSort: React.Dispatch<React.SetStateAction<SortState>>,
  ) => {
    if (currentSort.column === column) {
      if (currentSort.direction === "asc") {
        setSort({ column, direction: "desc" });
      } else if (currentSort.direction === "desc") {
        setSort({ column: null, direction: null });
      } else {
        setSort({ column, direction: "asc" });
      }
    } else {
      setSort({ column, direction: "asc" });
    }
  };

  // Filter by search
  const filterBySearch = (items: OpenHighLowItem[]) => {
    if (!searchFilter.trim()) return items;
    const query = searchFilter.toLowerCase();
    return items.filter((item) => item.symbol.toLowerCase().includes(query));
  };

  // Process data
  const openHighData = useMemo(() => {
    if (!openHighLowData?.open_equal_high) return [];
    const filtered = filterBySearch(openHighLowData.open_equal_high);
    return sortData(filtered, openHighSort);
  }, [openHighLowData?.open_equal_high, searchFilter, openHighSort]);

  const openLowData = useMemo(() => {
    if (!openHighLowData?.open_equal_low) return [];
    const filtered = filterBySearch(openHighLowData.open_equal_low);
    return sortData(filtered, openLowSort);
  }, [openHighLowData?.open_equal_low, searchFilter, openLowSort]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Symbol", "Open", "High", "Low", "LTP", "Change %", "Category"];
    const rows: string[][] = [];

    openHighData.forEach((item) => {
      rows.push([
        item.symbol,
        formatNumber(item.open),
        formatNumber(item.high),
        formatNumber(item.low),
        formatNumber(item.lastPrice),
        formatPercent(item.priceChange),
        "Open = High",
      ]);
    });

    openLowData.forEach((item) => {
      rows.push([
        item.symbol,
        formatNumber(item.open),
        formatNumber(item.high),
        formatNumber(item.low),
        formatNumber(item.lastPrice),
        formatPercent(item.priceChange),
        "Open = Low",
      ]);
    });

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `future-open-high-low-${selectedExpiry}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Render table
  const renderTable = (
    title: string,
    data: OpenHighLowItem[],
    sortState: SortState,
    setSortState: React.Dispatch<React.SetStateAction<SortState>>,
    colorClass: string,
    bgClass: string,
  ) => (
    <Card className={`${bgClass} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-lg font-semibold flex items-center gap-2 ${colorClass}`}>
          {title === "Open = High" ? <ArrowDown className="h-5 w-5" /> : <ArrowUp className="h-5 w-5" />}
          {title}
          <span className="text-sm font-normal text-muted-foreground">({data.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-md border overflow-hidden">
          <div className="max-h-[400px] overflow-auto">
            <Table className="min-w-[560px]">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <SortableHeader
                    label="Symbol"
                    column="symbol"
                    sortState={sortState}
                    onSort={(col) => handleSort(col, sortState, setSortState)}
                  />
                  <SortableHeader
                    label="Open"
                    column="open"
                    sortState={sortState}
                    onSort={(col) => handleSort(col, sortState, setSortState)}
                  />
                  <SortableHeader
                    label="High"
                    column="high"
                    sortState={sortState}
                    onSort={(col) => handleSort(col, sortState, setSortState)}
                  />
                  <SortableHeader
                    label="Low"
                    column="low"
                    sortState={sortState}
                    onSort={(col) => handleSort(col, sortState, setSortState)}
                  />
                  <SortableHeader
                    label="LTP"
                    column="lastPrice"
                    sortState={sortState}
                    onSort={(col) => handleSort(col, sortState, setSortState)}
                  />
                  <SortableHeader
                    label="Change %"
                    column="priceChange"
                    sortState={sortState}
                    onSort={(col) => handleSort(col, sortState, setSortState)}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.symbol} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{item.symbol}</TableCell>
                      <TableCell>{formatNumber(item.open)}</TableCell>
                      <TableCell>{formatNumber(item.high)}</TableCell>
                      <TableCell>{formatNumber(item.low)}</TableCell>
                      <TableCell>{formatNumber(item.lastPrice)}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${item.priceChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {formatPercent(item.priceChange)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <ProFeatureGate featureName="Future Open High/Low Analysis">
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Future Open-High / Open-Low</h1>
            <p className="text-muted-foreground text-sm">
              Identify stocks with Open = High (bearish) or Open = Low (bullish) patterns
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Auto Refresh Toggle */}
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-muted/30">
              <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
                Auto
              </Label>
              <Select
                value={refreshInterval.toString()}
                onValueChange={(v) => setRefreshInterval(Number(v))}
                disabled={!autoRefresh}
              >
                <SelectTrigger className="w-20 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30000">30s</SelectItem>
                  <SelectItem value="60000">1min</SelectItem>
                  <SelectItem value="300000">5min</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Manual Refresh */}
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} className="h-9 w-9">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>

            {/* Last Updated */}
            <LastRefreshBadge lastRefresh={openHighLowData?.lastUpdated ? new Date(openHighLowData.lastUpdated) : null} isFetching={isFetching} />
            <PageInfoModal
              title="Future Open-High / Open-Low"
              subtitle="Identify futures with the strongest single-day directional signals"
              overview={
                <>
                  When a futures contract opens at its <strong>low</strong> and never trades
                  below (Open = Low), buyers were in control from bell to close — one of the
                  most reliable single-day bullish signals in derivatives trading. The
                  mirror pattern (Open = High) is equally powerful bearish evidence. This
                  page scans the entire F&O universe for both patterns in real time.
                </>
              }
              formula={{
                label: "Detection Criteria",
                expression:
                  "Open = Low   →  Bullish   (Day Low  ≥ Open − ε)\nOpen = High  →  Bearish   (Day High ≤ Open + ε)\nε = small tolerance for tick noise",
                note: "Best signals appear when the pattern is intact through the first 60 minutes and confirmed by rising OI + above-average volume.",
              }}
              legend={[
                {
                  label: "Open = Low (Bullish)",
                  text: "Buyers dominated from open. Every dip was bought. High-probability continuation candidates.",
                  color: "#059669",
                },
                {
                  label: "Open = High (Bearish)",
                  text: "Sellers dominated from open. Every bounce was sold. High-probability continuation shorts.",
                  color: "#dc2626",
                },
                {
                  label: "With rising OI",
                  text: "Confirmation — fresh positions are being built, not just intraday scalping. Signal strength doubles.",
                  color: "#3b82f6",
                },
                {
                  label: "With falling OI",
                  text: "Warning — the move is driven by short-covering (bullish case) or long-unwinding (bearish case). Fade risk higher.",
                  color: "#f59e0b",
                },
              ]}
              sections={[
                {
                  heading: "Why It Works",
                  body: (
                    <>
                      A stock that never trades below its open has an extraordinarily
                      one-sided order flow — every attempt to sell was met with a stronger
                      bid. That imbalance rarely evaporates overnight; it typically extends
                      into the next 1–3 sessions. Institutional accumulation often shows
                      this footprint first.
                    </>
                  ),
                },
                {
                  heading: "Best Time to Read",
                  body: (
                    <>
                      Signals are most actionable in the <strong>first 30–60 minutes</strong>{" "}
                      of the session while the pattern is still intact. If a stock still
                      shows Open = Low at 10:30, the probability of a strong close-to-close
                      move is significantly higher.
                    </>
                  ),
                },
              ]}
              howToUse={
                <>
                  Filter by Bullish or Bearish to focus on one side of the market. Cross-check
                  each name against the Futures Buildup page — Open = Low + Long Buildup is
                  a near-textbook momentum long setup. Enter on a minor pullback with a stop
                  just below the day's open.
                </>
              }
              tips={[
                "Best odds when the market itself (Nifty) is trending in the same direction.",
                "Avoid the pattern on illiquid contracts — thin volume produces false positives.",
                "If a stock breaks below its open after being Open = Low all morning, the failure itself is a short signal.",
                "Track how many names show each pattern — >20 bullish patterns = broad market strength.",
              ]}
            />

            {/* Info Button */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Open-High / Open-Low Analysis</h4>
                  <p className="text-xs text-muted-foreground">
                    This page identifies futures where the opening price matches the day's high or low.
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded bg-red-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">Open = High (Bearish):</span>
                        <span className="text-muted-foreground">
                          {" "}
                          Stock opened at its highest point. Suggests selling pressure from open.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded bg-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">Open = Low (Bullish):</span>
                        <span className="text-muted-foreground">
                          {" "}
                          Stock opened at its lowest point. Suggests buying interest from open.
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground border-t pt-2">
                    <strong>Note:</strong> A threshold of 0.15% is used to identify near-equal values.
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <MobileSymbolExpiryBar
          indexSymbols={INDEX_SYMBOLS}
          stockSymbols={allSymbols.filter((s) => !INDEX_SYMBOLS.includes(s))}
          selectedSymbol={selectedSymbol}
          onSymbolChange={setSelectedSymbol}
          expiryDates={expiryDates}
          selectedExpiry={selectedExpiry}
          onExpiryChange={setSelectedExpiry}
          filtersContent={
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search symbol..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          }
        />
        <div className="hidden md:flex flex-wrap items-center gap-3">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Symbol" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {allSymbols.map((sym) => (
                <SelectItem key={sym} value={sym}>
                  {sym}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select Expiry" />
            </SelectTrigger>
            <SelectContent>
              {expiryDates.map((exp) => (
                <SelectItem key={exp} value={exp}>
                  {exp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search symbol..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Loading / Error States */}
        {isLoading && <div className="text-center py-12 text-muted-foreground">Loading data...</div>}
        {error && <div className="text-center py-12 text-destructive">Error loading data. Please try again.</div>}

        {/* Tables Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderTable(
              "Open = High",
              openHighData,
              openHighSort,
              setOpenHighSort,
              "text-red-500",
              "border-red-500/30 bg-red-500/5",
            )}
            {renderTable(
              "Open = Low",
              openLowData,
              openLowSort,
              setOpenLowSort,
              "text-emerald-500",
              "border-emerald-500/30 bg-emerald-500/5",
            )}
          </div>
          )}
        </div>
      </ProFeatureGate>
    </div>
  );
}
