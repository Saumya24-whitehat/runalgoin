import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { AdminPaletteButton } from "@/components/admin/AdminPaletteButton";
import { 
  groupedIndices, 
  fetchMarketBreadthData, 
  calculateAdvanceDecline,
  StockData,
  IndexGroup
} from "@/services/marketBreadthApi";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SortOption = 'change' | 'name';
type SortDirection = 'asc' | 'desc';

interface IndexAdvanceDecline {
  symbol: string;
  displayName: string;
  advances: number;
  declines: number;
  unchanged: number;
  total: number;
}

export default function MarketBreadth() {
  const [selectedIndex, setSelectedIndex] = useState<string>('SYML:NSE;NIFTY');
  const [selectedExchange, setSelectedExchange] = useState<'NSE' | 'BSE'>('NSE');
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('change');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [indexStats, setIndexStats] = useState<Map<string, IndexAdvanceDecline>>(new Map());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Major Market Indices']));

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMarketBreadthData(selectedIndex);
      if (data) {
        setStocks(data.content);
        setLastUpdated(data.date);
        
        // Calculate advance/decline for current index
        const stats = calculateAdvanceDecline(data.content);
        const currentIndexInfo = groupedIndices
          .flatMap(g => g.indices)
          .find(i => i.symbol === selectedIndex);
        
        if (currentIndexInfo) {
          setIndexStats(prev => new Map(prev).set(selectedIndex, {
            symbol: selectedIndex,
            displayName: currentIndexInfo.displayName,
            advances: stats.advances,
            declines: stats.declines,
            unchanged: stats.unchanged,
            total: data.content.length
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedIndex]);

  // Sort stocks
  const sortedStocks = useMemo(() => {
    const sorted = [...stocks].sort((a, b) => {
      if (sortBy === 'change') {
        return sortDirection === 'desc' ? b.change - a.change : a.change - b.change;
      }
      return sortDirection === 'desc' 
        ? b.name.localeCompare(a.name) 
        : a.name.localeCompare(b.name);
    });
    return sorted;
  }, [stocks, sortBy, sortDirection]);

  // Get color based on change percentage
  const getChangeColor = (change: number): string => {
    if (change >= 3) return 'bg-emerald-600';
    if (change >= 1) return 'bg-emerald-500';
    if (change > 0) return 'bg-emerald-400';
    if (change === 0) return 'bg-muted';
    if (change > -1) return 'bg-red-400';
    if (change > -3) return 'bg-red-500';
    return 'bg-red-600';
  };

  const getTextColor = (change: number): string => {
    if (change >= 0) return 'text-white';
    return 'text-white';
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  // Calculate advance/decline stats
  const { advances, declines, unchanged } = useMemo(() => {
    return calculateAdvanceDecline(stocks);
  }, [stocks]);

  const selectedIndexInfo = useMemo(() => {
    return groupedIndices.flatMap(g => g.indices).find(i => i.symbol === selectedIndex);
  }, [selectedIndex]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <TickerRibbon />
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 border-r border-border bg-card min-h-[calc(100vh-8rem)]">
          {/* Exchange Tabs */}
          <div className="border-b border-border p-2">
            <Tabs value={selectedExchange} onValueChange={(v) => setSelectedExchange(v as 'NSE' | 'BSE')}>
              <TabsList className="w-full">
                <TabsTrigger value="NSE" className="flex-1">NSE</TabsTrigger>
                <TabsTrigger value="BSE" className="flex-1">BSE</TabsTrigger>
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
                        .filter(idx => selectedExchange === 'NSE' ? idx.symbol.includes('NSE') : idx.symbol.includes('BSE'))
                        .map((index) => {
                          const stats = indexStats.get(index.symbol);
                          const isSelected = selectedIndex === index.symbol;
                          
                          return (
                            <button
                              key={index.symbol}
                              onClick={() => setSelectedIndex(index.symbol)}
                              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                                isSelected 
                                  ? 'bg-primary/10 border border-primary/30' 
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                  {index.displayName}
                                </span>
                              </div>
                              
                              {/* Advance/Decline Bar */}
                              {stats && (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
                                    <div 
                                      className="h-full bg-success transition-all"
                                      style={{ width: `${(stats.advances / stats.total) * 100}%` }}
                                    />
                                    <div 
                                      className="h-full bg-destructive transition-all"
                                      style={{ width: `${(stats.declines / stats.total) * 100}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 text-xs">
                                    <span className="text-success font-medium">{stats.advances}</span>
                                    <span className="text-muted-foreground">/</span>
                                    <span className="text-destructive font-medium">{stats.declines}</span>
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
                {selectedIndexInfo?.displayName || 'Market Breadth'}
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
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Last updated: {lastUpdated}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <AdminPaletteButton />
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            {[5, 3, 1, 0, -1, -3, -5].map((val) => (
              <Button
                key={val}
                variant={sortBy === 'change' && ((val > 0 && sortDirection === 'desc') || (val < 0 && sortDirection === 'asc')) ? 'default' : 'outline'}
                size="sm"
                className={`min-w-8 h-8 ${
                  val > 0 ? 'bg-success/20 hover:bg-success/30 text-success border-success/30' :
                  val < 0 ? 'bg-destructive/20 hover:bg-destructive/30 text-destructive border-destructive/30' :
                  ''
                }`}
                onClick={() => {
                  setSortBy('change');
                  setSortDirection(val >= 0 ? 'desc' : 'asc');
                }}
              >
                {val > 0 ? `+${val}` : val}
              </Button>
            ))}
            <Button
              variant={sortDirection === 'asc' && sortBy === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSortBy('name');
                setSortDirection('asc');
              }}
            >
              A-Z
            </Button>
            <Button
              variant={sortDirection === 'desc' && sortBy === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSortBy('name');
                setSortDirection('desc');
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1">
              {sortedStocks.map((stock, idx) => (
                <Tooltip key={`${stock.name}-${idx}`}>
                  <TooltipTrigger asChild>
                    <div
                      className={`${getChangeColor(stock.change)} ${getTextColor(stock.change)} p-2 rounded cursor-pointer hover:opacity-90 transition-opacity min-h-[80px] flex flex-col justify-center items-center text-center`}
                    >
                      <span className="font-bold text-sm truncate w-full">{stock.name}</span>
                      <span className="text-xs opacity-90">{stock.close.toLocaleString('en-IN')}</span>
                      <span className={`text-xs font-semibold ${stock.change >= 0 ? '' : ''}`}>
                        {stock.change >= 0 ? '+' : ''}{(stock.change * 100).toFixed(2)}%
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
                          <span className="ml-1 font-medium">₹{stock.close.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Change:</span>
                          <span className={`ml-1 font-medium ${stock.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {stock.change >= 0 ? '+' : ''}{(stock.change * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">High:</span>
                          <span className="ml-1 font-medium">₹{stock.high.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Low:</span>
                          <span className="ml-1 font-medium">₹{stock.low.toLocaleString('en-IN')}</span>
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
