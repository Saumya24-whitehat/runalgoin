import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { AdminPaletteButton } from "@/components/admin/AdminPaletteButton";
import {
  groupedIndices,
  fetchMarketBreadthData,
  fetchAdvanceDeclineData,
  calculateAdvanceDecline,
  StockData,
  AdvanceDeclineData,
} from "@/services/marketBreadthApi";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SortOption = "name";
type SortDirection = "asc" | "desc";
type ChangeFilter = "+5" | "+3" | "+1" | "0" | "-1" | "-3" | "-5" | null;

// Map index symbols to advance-decline API keys
const indexToAdvDeclineKey: Record<string, string> = {
  "SYML:NSE;NIFTY": "SYML:NSE;NIFTY",
  "SYML:NSE;BANKNIFTY": "SYML:NSE;BANKNIFTY",
  "SYML:NSE;CNX100": "SYML:NSE;CNX100",
  "SYML:NSE;CNX200": "SYML:NSE;CNX200",
  "SYML:NSE;CNX500": "SYML:NSE;CNX500",
  "SYML:NSE;NIFTYJR": "SYML:NSE;NIFTYJR",
  "SYML:NSE;CNXSMALLCAP": "SYML:NSE;CNXSMALLCAP",
  "SYML:NSE;CNXMIDCAP": "SYML:NSE;CNXMIDCAP",
  "SYML:NSE;NIFTYMIDCAP50": "SYML:NSE;NIFTYMIDCAP50",
};

export default function MarketBreadth() {
  const [selectedIndex, setSelectedIndex] = useState<string>("SYML:NSE;NIFTY");
  const [selectedExchange, setSelectedExchange] = useState<"NSE" | "BSE">("NSE");
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>(null);
  const [advanceDeclineData, setAdvanceDeclineData] = useState<Record<string, AdvanceDeclineData> | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Major Market Indices"]));

  // Fetch advance/decline data on mount
  useEffect(() => {
    const fetchAdvDec = async () => {
      const data = await fetchAdvanceDeclineData();
      if (data) {
        setAdvanceDeclineData(data);
      }
    };
    fetchAdvDec();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMarketBreadthData(selectedIndex);
      if (data) {
        setStocks(data.content);
        setLastUpdated(data.date);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedIndex]);

  // Filter and sort stocks
  const filteredAndSortedStocks = useMemo(() => {
    // First apply change filter
    let filtered = [...stocks];

    if (changeFilter !== null) {
      switch (changeFilter) {
        case "+5":
          filtered = stocks.filter((s) => s.changePct >= 5);
          break;
        case "+3":
          filtered = stocks.filter((s) => s.changePct >= 3 && s.changePct < 5);
          break;
        case "+1":
          filtered = stocks.filter((s) => s.changePct >= 1 && s.changePct < 3);
          break;
        case "0":
          filtered = stocks.filter((s) => s.changePct > -1 && s.changePct < 1);
          break;
        case "-1":
          filtered = stocks.filter((s) => s.changePct <= -1 && s.changePct > -3);
          break;
        case "-3":
          filtered = stocks.filter((s) => s.changePct <= -3 && s.changePct > -5);
          break;
        case "-5":
          filtered = stocks.filter((s) => s.changePct <= -5);
          break;
      }
    }

    // Then apply name sorting if selected
    if (sortBy === "name") {
      filtered.sort((a, b) => (sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    } else {
      // Default: sort by change descending
      filtered.sort((a, b) => b.changePct - a.changePct);
    }

    return filtered;
  }, [stocks, changeFilter, sortBy, sortDirection]);

  // Get color based on change percentage
  const getChangeColor = (changePct: number): string => {
    if (changePct >= 3) return "bg-emerald-600";
    if (changePct >= 1) return "bg-emerald-500";
    if (changePct > 0) return "bg-emerald-400";
    if (changePct === 0) return "bg-muted";
    if (changePct > -1) return "bg-red-400";
    if (changePct > -3) return "bg-red-500";
    return "bg-red-600";
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  // Calculate advance/decline stats from current stocks
  const { advances, declines, unchanged } = useMemo(() => {
    return calculateAdvanceDecline(stocks);
  }, [stocks]);

  const selectedIndexInfo = useMemo(() => {
    return groupedIndices.flatMap((g) => g.indices).find((i) => i.symbol === selectedIndex);
  }, [selectedIndex]);

  // Get advance/decline for a specific index from API
  const getAdvDecForIndex = (symbol: string): { advance: number; decline: number; total: number } | null => {
    if (!advanceDeclineData) return null;
    const data = advanceDeclineData[symbol];
    if (!data) return null;
    return {
      advance: data.advance,
      decline: data.decline,
      total: data.advance + data.decline,
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <TickerRibbon />
      <Navbar />

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 border-r border-border bg-card min-h-[calc(100vh-8rem)]">
          {/* Exchange Tabs */}
          <div className="border-b border-border p-2">
            <Tabs value={selectedExchange} onValueChange={(v) => setSelectedExchange(v as "NSE" | "BSE")}>
              <TabsList className="w-full">
                <TabsTrigger value="NSE" className="flex-1">
                  NSE
                </TabsTrigger>
                <TabsTrigger value="BSE" className="flex-1">
                  BSE
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Index List with Advance/Decline Bars */}
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="p-2 space-y-2">
              {groupedIndices.map((group) => (
                <div key={group.name} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className="w-full text-left px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/50 rounded transition-colors"
                  >
                    {group.name}
                  </button>

                  {expandedGroups.has(group.name) && (
                    <div className="space-y-1">
                      {group.indices
                        .filter((idx) =>
                          selectedExchange === "NSE" ? idx.symbol.includes("NSE") : idx.symbol.includes("BSE"),
                        )
                        .map((index) => {
                          const isSelected = selectedIndex === index.symbol;
                          const advDecStats = getAdvDecForIndex(index.symbol);

                          return (
                            <button
                              key={index.symbol}
                              onClick={() => setSelectedIndex(index.symbol)}
                              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                                isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span
                                  className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}
                                >
                                  {index.displayName}
                                </span>
                              </div>

                              {/* Advance/Decline Bar from API */}
                              {advDecStats && advDecStats.total > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
                                    <div
                                      className="h-full bg-success transition-all"
                                      style={{ width: `${(advDecStats.advance / advDecStats.total) * 100}%` }}
                                    />
                                    <div
                                      className="h-full bg-destructive transition-all"
                                      style={{ width: `${(advDecStats.decline / advDecStats.total) * 100}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 text-xs min-w-[60px] justify-end">
                                    <span className="text-success font-medium">{advDecStats.advance}</span>
                                    <span className="text-muted-foreground">/</span>
                                    <span className="text-destructive font-medium">{advDecStats.decline}</span>
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">
                {selectedIndexInfo?.displayName || "Market Breadth"}
              </h1>
              {!isLoading && stocks.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
                    <TrendingUp className="h-4 w-4" />
                    {advances} Advances
                  </span>
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
                    <TrendingDown className="h-4 w-4" />
                    {declines} Declines
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {lastUpdated && <span className="text-xs text-muted-foreground">Last updated: {lastUpdated}</span>}
              <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <AdminPaletteButton />
            </div>
          </div>

          {/* Filter Options */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Filter:</span>
            {(["+5", "+3", "+1", "0", "-1", "-3", "-5"] as ChangeFilter[]).map((val) => {
              const isActive = changeFilter === val;
              const isPositive = val && val.startsWith("+");
              const isNegative = val && val.startsWith("-");

              return (
                <Button
                  key={val}
                  variant="outline"
                  size="sm"
                  className={`min-w-10 h-8 ${
                    isActive
                      ? isPositive
                        ? "bg-success text-success-foreground border-success"
                        : isNegative
                          ? "bg-destructive text-destructive-foreground border-destructive"
                          : "bg-primary text-primary-foreground"
                      : isPositive
                        ? "bg-success/20 hover:bg-success/30 text-success border-success/30"
                        : isNegative
                          ? "bg-destructive/20 hover:bg-destructive/30 text-destructive border-destructive/30"
                          : ""
                  }`}
                  onClick={() => setChangeFilter(changeFilter === val ? null : val)}
                >
                  {val}
                </Button>
              );
            })}
            <Button
              variant={sortBy === "name" && sortDirection === "asc" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSortBy(sortBy === "name" && sortDirection === "asc" ? null : "name");
                setSortDirection("asc");
              }}
            >
              A-Z
            </Button>
            <Button
              variant={sortBy === "name" && sortDirection === "desc" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSortBy(sortBy === "name" && sortDirection === "desc" ? null : "name");
                setSortDirection("desc");
              }}
            >
              Z-A
            </Button>
          </div>

          {/* Stock Grid / Treemap */}
          {isLoading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : stocks.length === 0 ? (
            <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
              No data available for this index
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-0.5">
              {filteredAndSortedStocks.map((stock, idx) => (
                <Tooltip key={`${stock.name}-${idx}`}>
                  <TooltipTrigger asChild>
                    <div
                      className={`${getChangeColor(stock.changePct)} text-black px-1 py-0.5 rounded cursor-pointer hover:opacity-90 transition-opacity min-h-[48px] flex flex-col justify-center items-center text-center`}
                    >
                      <span className="font-bold text-[10px] truncate w-full">{stock.name}</span>
                      <span className="text-[9px]">₹{stock.close.toLocaleString("en-IN")}</span>
                      <span className="text-[9px] font-semibold">
                        {stock.changePct >= 0 ? "+" : ""}
                        {stock.changePct.toFixed(2)}%
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-bold">{stock.name}</p>
                      <p className="text-xs text-muted-foreground">{stock.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Close:</span>
                          <span className="ml-1 font-medium">₹{stock.close.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Change:</span>
                          <span
                            className={`ml-1 font-medium ${stock.changePct >= 0 ? "text-success" : "text-destructive"}`}
                          >
                            {stock.changePct >= 0 ? "+" : ""}
                            {stock.changePct.toFixed(2)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">High:</span>
                          <span className="ml-1 font-medium">₹{stock.high.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Low:</span>
                          <span className="ml-1 font-medium">₹{stock.low.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
