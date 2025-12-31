import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Download,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  RefreshCw,
  Pause,
  Info,
} from "lucide-react";
import { TickerRibbon } from "@/components/TickerRibbon";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AdminPaletteButton } from "@/components/admin/AdminPaletteButton";
import { fetchFutureBuildup, fetchFutureExpiryDates, BuildupItem } from "@/services/futureBuilupApi";
import { supabase } from "@/integrations/supabase/client";

const INDEX_SYMBOLS = ["Nifty 50", "Nifty Bank", "Nifty Fin Service", "Nifty Mid Select"];

const REFRESH_INTERVALS = [
  { label: "30s", value: 30000 },
  { label: "1m", value: 60000 },
  { label: "5m", value: 300000 },
];

type SortKey = "symbol" | "price" | "priceChange" | "oi" | "oiChange";
type SortDirection = "asc" | "desc" | null;

interface BuildupTableProps {
  title: string;
  items: BuildupItem[];
  isLoading: boolean;
  variant: "long" | "short" | "covering" | "unwinding";
  searchFilter: string;
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

const CHART_COLORS = {
  long: "#16a34a",
  short: "#dc2626",
  covering: "#2563eb",
  unwinding: "#f97316",
};

function BuildupDistributionChart({ counts }: { counts: { lb: number; sb: number; sc: number; lu: number } }) {
  const pieData = [
    { name: "Long Buildup", value: counts.lb, color: CHART_COLORS.long },
    { name: "Short Buildup", value: counts.sb, color: CHART_COLORS.short },
    { name: "Short Covering", value: counts.sc, color: CHART_COLORS.covering },
    { name: "Long Unwinding", value: counts.lu, color: CHART_COLORS.unwinding },
  ];

  const barData = [
    { name: "LB", count: counts.lb, fill: CHART_COLORS.long },
    { name: "SB", count: counts.sb, fill: CHART_COLORS.short },
    { name: "SC", count: counts.sc, fill: CHART_COLORS.covering },
    { name: "LU", count: counts.lu, fill: CHART_COLORS.unwinding },
  ];

  const total = counts.lb + counts.sb + counts.sc + counts.lu;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Distribution (Pie)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} (${((value / total) * 100).toFixed(1)}%)`, name]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Distribution (Bar)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [value, "Count"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function BuildupTable({ title, items, isLoading, variant, searchFilter }: BuildupTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const headerColors = {
    long: "bg-emerald-600",
    short: "bg-red-600",
    covering: "bg-blue-600",
    unwinding: "bg-orange-500",
  };

  const icons = {
    long: <ArrowUp className="h-4 w-4" />,
    short: <ArrowDown className="h-4 w-4" />,
    covering: <TrendingUp className="h-4 w-4" />,
    unwinding: <TrendingDown className="h-4 w-4" />,
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="h-3 w-3" />;
    }
    return <ChevronDown className="h-3 w-3" />;
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    if (searchFilter) {
      const lowerFilter = searchFilter.toLowerCase();
      result = result.filter((item) => item.symbol.toLowerCase().includes(lowerFilter));
    }

    if (sortKey && sortDirection) {
      result.sort((a, b) => {
        let aVal: string | number = a[sortKey];
        let bVal: string | number = b[sortKey];

        if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
          return sortDirection === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
        }

        return sortDirection === "asc" ? aVal - (bVal as number) : (bVal as number) - aVal;
      });
    }

    return result;
  }, [items, searchFilter, sortKey, sortDirection]);

  const SortableHeader = ({
    label,
    sortKeyName,
    align = "right",
  }: {
    label: string;
    sortKeyName: SortKey;
    align?: "left" | "right" | "center";
  }) => (
    <TableHead
      className={`text-${align} cursor-pointer hover:bg-muted/70 select-none`}
      onClick={() => handleSort(sortKeyName)}
    >
      <div
        className={`flex items-center gap-1 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""}`}
      >
        <span>{label}</span>
        {getSortIcon(sortKeyName)}
      </div>
    </TableHead>
  );

  return (
    <div className="rounded-lg border border-border overflow-auto max-h-[400px]">
      <div className={`${headerColors[variant]} px-4 py-3 flex items-center gap-2 sticky top-0`}>
        {icons[variant]}
        <h3 className="font-semibold text-white">{title}</h3>
        {searchFilter && (
          <span className="ml-auto text-xs text-white/80">
            {filteredAndSortedItems.length} / {items.length}
          </span>
        )}
      </div>
      <Table>
        <TableHeader className="sticky" style={{ top: "44px" }}>
          <TableRow className="bg-muted/50">
            <SortableHeader label="Symbol" sortKeyName="symbol" align="center" />
            <SortableHeader label="Price" sortKeyName="price" />
            <SortableHeader label="Price Chg (%)" sortKeyName="priceChange" />
            <SortableHeader label="OI" sortKeyName="oi" />
            <SortableHeader label="OI Chg" sortKeyName="oiChange" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
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
                  <Skeleton className="h-4 w-14 ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : filteredAndSortedItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                {searchFilter ? "No matching symbols" : "No data available"}
              </TableCell>
            </TableRow>
          ) : (
            filteredAndSortedItems.map((item, idx) => (
              <TableRow key={idx} className="hover:bg-muted/30">
                <TableCell className="text-center font-medium">{item.symbol}</TableCell>
                <TableCell className="text-right">
                  {item.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className={`text-right ${item.priceChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {item.priceChange >= 0 ? "+" : ""}
                  {item.priceChange.toFixed(2)}%
                </TableCell>
                <TableCell className="text-right">{formatIndianNumber(item.oi)}</TableCell>
                <TableCell className={`text-right ${item.oiChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {item.oiChange >= 0 ? "+" : ""}
                  {formatIndianNumber(item.oiChange)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function FutureBuildup() {
  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60000);

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
  });

  // Set default expiry when dates load
  useEffect(() => {
    if (expiryDates.length > 0 && !selectedExpiry) {
      setSelectedExpiry(expiryDates[0]);
    }
  }, [expiryDates, selectedExpiry]);

  // Fetch buildup data with configurable auto-refresh
  const {
    data: buildupData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["future-buildup", selectedSymbol, selectedExpiry],
    queryFn: () => fetchFutureBuildup(selectedSymbol, selectedExpiry),
    enabled: !!selectedExpiry,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const handleExportCSV = () => {
    if (!buildupData) return;

    const allItems = [
      ...buildupData.longBuildup.map((i) => ({ ...i, type: "Long Buildup" })),
      ...buildupData.shortBuildup.map((i) => ({ ...i, type: "Short Buildup" })),
      ...buildupData.shortCovering.map((i) => ({ ...i, type: "Short Covering" })),
      ...buildupData.longUnwinding.map((i) => ({ ...i, type: "Long Unwinding" })),
    ];

    const csv = [
      ["Type", "Symbol", "Price", "Price Chg (%)", "OI", "OI Chg"].join(","),
      ...allItems.map((i) => [i.type, i.symbol, i.price, i.priceChange, i.oi, i.oiChange].join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `future-buildup-${selectedSymbol}-${selectedExpiry}.csv`;
    a.click();
  };

  const counts = {
    lb: buildupData?.longBuildup.length || 0,
    sb: buildupData?.shortBuildup.length || 0,
    sc: buildupData?.shortCovering.length || 0,
    lu: buildupData?.longUnwinding.length || 0,
  };

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

          {/* Count Badges */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex flex-col items-center px-3 py-1 rounded bg-emerald-600 text-white text-xs">
              <span className="font-bold">LB</span>
              <span>{counts.lb}</span>
            </div>
            <div className="flex flex-col items-center px-3 py-1 rounded bg-red-600 text-white text-xs">
              <span className="font-bold">SB</span>
              <span>{counts.sb}</span>
            </div>
            <div className="flex flex-col items-center px-3 py-1 rounded bg-blue-600 text-white text-xs">
              <span className="font-bold">SC</span>
              <span>{counts.sc}</span>
            </div>
            <div className="flex flex-col items-center px-3 py-1 rounded bg-orange-500 text-white text-xs">
              <span className="font-bold">LU</span>
              <span>{counts.lu}</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Last Updated: {buildupData?.lastUpdated ? new Date(buildupData.lastUpdated).toLocaleString() : "-"}
          </div>

          {/* Info Button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Future Buildup Analysis</h4>
                <p className="text-xs text-muted-foreground">
                  This page analyzes futures data to identify market sentiment based on price and open interest changes.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">Long Buildup:</span>
                      <span className="text-muted-foreground"> Price ↑ + OI ↑ (Bullish - New long positions)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded bg-red-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">Short Buildup:</span>
                      <span className="text-muted-foreground"> Price ↓ + OI ↑ (Bearish - New short positions)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded bg-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">Short Covering:</span>
                      <span className="text-muted-foreground"> Price ↑ + OI ↓ (Shorts closing positions)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded bg-orange-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">Long Unwinding:</span>
                      <span className="text-muted-foreground"> Price ↓ + OI ↓ (Longs closing positions)</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground border-t pt-2">
                  <strong>Tip:</strong> Click column headers to sort. Use the filter to search symbols across all
                  tables.
                </p>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>

        {/* Distribution Charts */}
        <BuildupDistributionChart counts={counts} />

        {/* Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BuildupTable
            title="Long Buildup"
            items={buildupData?.longBuildup || []}
            isLoading={isLoading}
            variant="long"
            searchFilter={searchFilter}
          />
          <BuildupTable
            title="Short Buildup"
            items={buildupData?.shortBuildup || []}
            isLoading={isLoading}
            variant="short"
            searchFilter={searchFilter}
          />
          <BuildupTable
            title="Short Covering"
            items={buildupData?.shortCovering || []}
            isLoading={isLoading}
            variant="covering"
            searchFilter={searchFilter}
          />
          <BuildupTable
            title="Long Unwinding"
            items={buildupData?.longUnwinding || []}
            isLoading={isLoading}
            variant="unwinding"
            searchFilter={searchFilter}
          />
        </div>
      </div>
    </div>
  );
}
