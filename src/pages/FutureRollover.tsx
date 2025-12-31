import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, ChevronUp, ChevronDown, ChevronsUpDown, RefreshCw, Pause, Info } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AdminPaletteButton } from "@/components/admin/AdminPaletteButton";
import { fetchFutureRollover, fetchFutureExpiryDates, RolloverItem } from "@/services/futureRolloverApi";
import { supabase } from "@/integrations/supabase/client";

const INDEX_SYMBOLS = ["Nifty 50", "Nifty Bank", "Nifty Fin Service", "Nifty Mid Select"];

const REFRESH_INTERVALS = [
  { label: "30s", value: 30000 },
  { label: "1m", value: 60000 },
  { label: "5m", value: 300000 },
];

type SortKey = "symbol" | "lastPrice" | "priceChange" | "oi" | "nextOi" | "rollover";
type SortDirection = "asc" | "desc" | null;

interface SortState {
  column: SortKey | null;
  direction: SortDirection;
}

// Format number with L (Lakh), CR (Crore), K (Thousand) notation
function formatIndianNumber(num: number): string {
  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (absNum >= 10000000) {
    return sign + (absNum / 10000000).toFixed(2) + " CR";
  } else if (absNum >= 100000) {
    return sign + (absNum / 100000).toFixed(2) + " L";
  } else if (absNum >= 1000) {
    return sign + (absNum / 1000).toFixed(2) + " K";
  }
  return sign + absNum.toLocaleString("en-IN");
}

export default function FutureRollover() {
  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60000);
  const [sortState, setSortState] = useState<SortState>({ column: "rollover", direction: "desc" });

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

  // Fetch expiry dates
  const { data: expiryDates = [] } = useQuery({
    queryKey: ["future-expiry-dates", selectedSymbol],
    queryFn: () => fetchFutureExpiryDates(selectedSymbol),
    staleTime: 1000 * 60 * 60,
  });

  // Set default expiry when dates load
  useEffect(() => {
    if (expiryDates.length > 0 && !selectedExpiry) {
      setSelectedExpiry(expiryDates[0]);
    }
  }, [expiryDates, selectedExpiry]);

  // Fetch rollover data
  const {
    data: rolloverData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["future-rollover", selectedSymbol, selectedExpiry],
    queryFn: () => fetchFutureRollover(selectedSymbol, selectedExpiry),
    enabled: !!selectedExpiry,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const handleSort = (key: SortKey) => {
    setSortState((prev) => {
      if (prev.column === key) {
        if (prev.direction === "desc") return { column: key, direction: "asc" };
        if (prev.direction === "asc") return { column: null, direction: null };
        return { column: key, direction: "desc" };
      }
      return { column: key, direction: "desc" };
    });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortState.column !== key) return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
    if (sortState.direction === "asc") return <ChevronUp className="h-3 w-3" />;
    return <ChevronDown className="h-3 w-3" />;
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...(rolloverData?.data || [])];

    if (searchFilter) {
      const lowerFilter = searchFilter.toLowerCase();
      result = result.filter((item) => item.symbol.toLowerCase().includes(lowerFilter));
    }

    if (sortState.column && sortState.direction) {
      result.sort((a, b) => {
        const aVal = a[sortState.column!];
        const bVal = b[sortState.column!];

        if (typeof aVal === "string") {
          return sortState.direction === "asc"
            ? aVal.localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal);
        }

        return sortState.direction === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });
    }

    return result;
  }, [rolloverData?.data, searchFilter, sortState]);

  const handleExportCSV = () => {
    if (!filteredAndSortedData.length) return;

    const csv = [
      ["Symbol", "LTP", "Change %", "OI", "Next OI", "Rollover %"].join(","),
      ...filteredAndSortedData.map((i) =>
        [i.symbol, i.lastPrice, i.priceChange.toFixed(2), i.oi, i.nextOi, i.rollover.toFixed(2)].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `future-rollover-${selectedSymbol}-${selectedExpiry}.csv`;
    a.click();
  };

  const SortableHeader = ({
    label,
    sortKey,
    align = "right",
  }: {
    label: string;
    sortKey: SortKey;
    align?: "left" | "right" | "center";
  }) => (
    <TableHead
      className={`text-${align} cursor-pointer hover:bg-muted/70 select-none`}
      onClick={() => handleSort(sortKey)}
    >
      <div
        className={`flex items-center gap-1 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""}`}
      >
        <span>{label}</span>
        {getSortIcon(sortKey)}
      </div>
    </TableHead>
  );

  // Calculate average rollover
  const avgRollover = useMemo(() => {
    const items = rolloverData?.data || [];
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, i) => acc + i.rollover, 0);
    return sum / items.length;
  }, [rolloverData?.data]);

  return (
    <div className="min-h-screen bg-background">
      <TickerRibbon />
      <Navbar />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Symbol" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {allSymbols.map((symbol) => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select Expiry" />
            </SelectTrigger>
            <SelectContent>
              {expiryDates.map((date) => (
                <SelectItem key={date} value={date}>
                  {date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => refetch()} variant="default" className="gap-2" disabled={isFetching}>
            <Search className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Search
          </Button>

          {/* Symbol Search Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter symbols..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 w-[180px]"
            />
          </div>

          {/* Auto-refresh controls */}
          <div className="flex items-center gap-3 border rounded-lg px-3 py-2 bg-muted/30">
            <div className="flex items-center gap-2">
              {autoRefresh ? (
                <RefreshCw className={`h-4 w-4 text-emerald-500 ${isFetching ? "animate-spin" : ""}`} />
              ) : (
                <Pause className="h-4 w-4 text-muted-foreground" />
              )}
              <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
                Auto
              </Label>
              <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>
            {autoRefresh && (
              <Select value={String(refreshInterval)} onValueChange={(v) => setRefreshInterval(Number(v))}>
                <SelectTrigger className="w-[70px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFRESH_INTERVALS.map((interval) => (
                    <SelectItem key={interval.value} value={String(interval.value)}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Info Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-semibold">Future Rollover Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Rollover indicates the percentage of positions being carried forward to the next expiry.
                </p>
                <div className="text-sm">
                  <strong>Formula:</strong>
                  <code className="block mt-1 p-2 bg-muted rounded text-xs">
                    Rollover = NextOI / (NextOI + OI) × 100%
                  </code>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • <strong>High Rollover (&gt;50%):</strong> Bullish sentiment, positions carried forward
                  </li>
                  <li>
                    • <strong>Low Rollover (&lt;30%):</strong> Bearish sentiment, positions being squared off
                  </li>
                </ul>
              </div>
            </PopoverContent>
          </Popover>

          {/* Avg Rollover Badge */}
          <div className="ml-auto flex items-center gap-3">
            <div className="flex flex-col items-center px-4 py-1 rounded bg-primary text-primary-foreground text-sm">
              <span className="text-xs opacity-80">Avg Rollover</span>
              <span className="font-bold">{avgRollover.toFixed(2)}%</span>
            </div>
            <span className="text-xs text-muted-foreground">{filteredAndSortedData.length} symbols</span>
          </div>

          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>

        {/* Data Table */}
        <div className="rounded-lg overflow-hidden border border-border">
          <div className="bg-primary px-4 py-3">
            <h3 className="font-semibold text-primary-foreground">Future Rollover Data</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <SortableHeader label="Symbol" sortKey="symbol" align="center" />
                <SortableHeader label="LTP" sortKey="lastPrice" />
                <SortableHeader label="Change %" sortKey="priceChange" />
                <SortableHeader label="OI" sortKey="oi" />
                <SortableHeader label="Next OI" sortKey="nextOi" />
                <SortableHeader label="Rollover %" sortKey="rollover" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-20 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-14 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredAndSortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {searchFilter ? "No matching symbols" : "No data available"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedData.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/30">
                    <TableCell className="text-center font-medium">{item.symbol}</TableCell>
                    <TableCell className="text-right">
                      {item.lastPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={`text-right ${item.priceChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {item.priceChange >= 0 ? "+" : ""}
                      {item.priceChange.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">{formatIndianNumber(item.oi)}</TableCell>
                    <TableCell className="text-right">{formatIndianNumber(item.nextOi)}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-medium ${item.rollover >= 50 ? "text-emerald-500" : item.rollover < 30 ? "text-red-500" : "text-amber-500"}`}
                      >
                        {item.rollover.toFixed(2)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Last Updated */}
        {rolloverData?.lastUpdated && (
          <p className="text-xs text-muted-foreground text-right">
            Last updated: {new Date(rolloverData.lastUpdated).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
