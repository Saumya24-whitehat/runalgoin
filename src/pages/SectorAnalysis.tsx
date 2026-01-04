import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  groupedIndices,
  fetchMarketBreadthData,
  fetchAdvanceDeclineData,
  calculateAdvanceDecline,
  StockData,
  AdvanceDeclineData,
} from "@/services/marketBreadthApi";

type SortColumn = "name" | "price" | "change" | "high" | "low";
type SortDirection = "asc" | "desc";

// Helper to find index symbol from sector name (e.g. "NIFTY ENERGY" -> "SYML:NSE;CNXENERGY")
const findIndexByName = (sectorName: string): string | null => {
  const normalizedSearch = sectorName.toUpperCase().trim();
  for (const group of groupedIndices) {
    for (const idx of group.indices) {
      const normalizedDisplay = idx.displayName.toUpperCase().trim();
      if (
        normalizedDisplay === normalizedSearch ||
        normalizedSearch.includes(normalizedDisplay) ||
        normalizedDisplay.includes(normalizedSearch)
      ) {
        return idx.symbol;
      }
    }
  }
  return null;
};

const SectorAnalysis = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // Get initial index from URL param if provided
  const getInitialIndex = (): string => {
    const sectorParam = searchParams.get("sector");
    if (sectorParam) {
      const foundIndex = findIndexByName(sectorParam);
      if (foundIndex) return foundIndex;
    }
    return "SYML:NSE;CNXENERGY";
  };

  const [selectedIndex, setSelectedIndex] = useState<string>(getInitialIndex);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("change");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [advanceDeclineData, setAdvanceDeclineData] = useState<Record<string, AdvanceDeclineData> | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Auto-expand the group containing the selected index
    const sectorParam = searchParams.get("sector");
    if (sectorParam) {
      const foundIndex = findIndexByName(sectorParam);
      if (foundIndex) {
        for (const group of groupedIndices) {
          if (group.indices.some((idx) => idx.symbol === foundIndex)) {
            return new Set([group.name]);
          }
        }
      }
    }
    return new Set(["Sectoral Indices"]);
  });
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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
  const { advances, declines } = useMemo(() => {
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

  // Filter and sort stocks
  const sortedStocks = useMemo(() => {
    // First filter by search query
    let filtered = stocks;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = stocks.filter(
        (s) => s.name.toLowerCase().includes(query) || s.description?.toLowerCase().includes(query),
      );
    }

    // Then sort
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortColumn) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "price":
          aVal = a.close;
          bVal = b.close;
          break;
        case "change":
          aVal = a.changePct;
          bVal = b.changePct;
          break;
        case "high":
          aVal = a.high;
          bVal = b.high;
          break;
        case "low":
          aVal = a.low;
          bVal = b.low;
          break;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [stocks, sortColumn, sortDirection, searchQuery]);

  const handleStockClick = (ticker: string, sector: string) => {
    navigate(`/stock-detail?symbol=${ticker}&sector=${sector}`);
  };
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-success";
    if (change < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const formatNumber = (num: number | null | undefined, decimals = 2) => {
    if (num === null || num === undefined) return "-";
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50">
          <TickerRibbon />
          <Navbar />
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-72 border-r border-border bg-card min-h-[calc(100vh-8rem)]">
          <div className="p-3 border-b border-border">
            <h2 className="font-semibold text-foreground">Select Sector</h2>
          </div>

          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="p-2 space-y-1">
              {groupedIndices.map((group) => (
                <div key={group.name} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/50 rounded transition-colors"
                  >
                    <span>{group.name}</span>
                    {expandedGroups.has(group.name) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {expandedGroups.has(group.name) && (
                    <div className="space-y-0.5 ml-2">
                      {group.indices.map((index) => {
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

                            {advDecStats && advDecStats.total > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex">
                                  <div
                                    className="h-full bg-success transition-all"
                                    style={{ width: `${(advDecStats.advance / advDecStats.total) * 100}%` }}
                                  />
                                  <div
                                    className="h-full bg-destructive transition-all"
                                    style={{ width: `${(advDecStats.decline / advDecStats.total) * 100}%` }}
                                  />
                                </div>
                                <div className="flex items-center gap-0.5 text-[10px] min-w-[40px] justify-end">
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
                {selectedIndexInfo?.displayName || "Sector Analysis"}
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
            </div>
          </div>

          {/* Search Filter */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search stocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>

          {/* Stocks Table */}
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : stocks.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-muted-foreground">No data available for this sector</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#0a3d2e] text-white">
                        <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider w-12">#</th>
                        <th
                          onClick={() => handleSort("name")}
                          className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[#0d4a38] transition-colors"
                        >
                          Stock {getSortIcon("name")}
                        </th>
                        <th
                          onClick={() => handleSort("price")}
                          className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[#0d4a38] transition-colors"
                        >
                          LTP {getSortIcon("price")}
                        </th>
                        <th
                          onClick={() => handleSort("change")}
                          className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[#0d4a38] transition-colors"
                        >
                          Change % {getSortIcon("change")}
                        </th>
                        <th
                          onClick={() => handleSort("high")}
                          className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[#0d4a38] transition-colors"
                        >
                          High {getSortIcon("high")}
                        </th>
                        <th
                          onClick={() => handleSort("low")}
                          className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[#0d4a38] transition-colors"
                        >
                          Low {getSortIcon("low")}
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStocks.map((stock, idx) => {
                        const isPositive = stock.changePct >= 0;

                        return (
                          <tr
                            key={`${stock.name}-${idx}`}
                            onClick={() => handleStockClick(stock.name, selectedIndex)}
                            className="border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-4 text-center">
                              <span className="text-muted-foreground text-sm">{idx + 1}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <span className="font-medium text-foreground">{stock.name}</span>
                                {stock.description && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {stock.description}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-semibold text-foreground">₹{formatNumber(stock.close)}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`flex items-center justify-end gap-1 font-medium ${getChangeColor(stock.changePct)}`}
                              >
                                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {stock.changePct >= 0 ? "+" : ""}
                                {formatNumber(stock.changePct)}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-muted-foreground">₹{formatNumber(stock.high)}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-muted-foreground">₹{formatNumber(stock.low)}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex justify-center">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${isPositive ? "bg-success" : "bg-destructive"}`}
                                    style={{ width: `${Math.min(Math.abs(stock.changePct) * 10, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          {!isLoading && stocks.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Stocks</p>
                <p className="text-2xl font-bold text-foreground">{stocks.length}</p>
              </Card>
              <Card className="bg-card border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Advances</p>
                <p className="text-2xl font-bold text-success">{advances}</p>
              </Card>
              <Card className="bg-card border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Declines</p>
                <p className="text-2xl font-bold text-destructive">{declines}</p>
              </Card>
              <Card className="bg-card border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">A/D Ratio</p>
                <p className={`text-2xl font-bold ${advances >= declines ? "text-success" : "text-destructive"}`}>
                  {declines > 0 ? (advances / declines).toFixed(2) : advances > 0 ? "∞" : "-"}
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SectorAnalysis;
