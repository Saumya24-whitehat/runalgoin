import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw, Download, ArrowUp, ArrowDown, TrendingUp, TrendingDown } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPaletteButton } from "@/components/admin/AdminPaletteButton";
import { fetchFutureBuildup, fetchFutureExpiryDates, BuildupItem } from "@/services/futureBuilupApi";
import { supabase } from "@/integrations/supabase/client";

const INDEX_SYMBOLS = ["Nifty 50", "Nifty Bank", "Nifty Fin Service", "Nifty Mid Select"];

interface BuildupTableProps {
  title: string;
  items: BuildupItem[];
  isLoading: boolean;
  variant: "long" | "short" | "covering" | "unwinding";
}

// Format number with L (Lakh), CR (Crore), K (Thousand) notation
function formatIndianNumber(num: number): string {
  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  
  if (absNum >= 10000000) {
    // Crore (1 CR = 10,000,000)
    return sign + (absNum / 10000000).toFixed(2) + " CR";
  } else if (absNum >= 100000) {
    // Lakh (1 L = 100,000)
    return sign + (absNum / 100000).toFixed(2) + " L";
  } else if (absNum >= 1000) {
    // Thousand (1 K = 1,000)
    return sign + (absNum / 1000).toFixed(2) + " K";
  }
  return sign + absNum.toLocaleString("en-IN");
}

function BuildupTable({ title, items, isLoading, variant }: BuildupTableProps) {
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

  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <div className={`${headerColors[variant]} px-4 py-3 flex items-center gap-2`}>
        {icons[variant]}
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-center">Symbol</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Price Chg (%)</TableHead>
            <TableHead className="text-right">OI</TableHead>
            <TableHead className="text-right">OI Chg</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, idx) => (
              <TableRow key={idx} className="hover:bg-muted/30">
                <TableCell className="text-center font-medium">{item.symbol}</TableCell>
                <TableCell className="text-right">{item.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell className={`text-right ${item.priceChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {item.priceChange >= 0 ? "+" : ""}{item.priceChange.toFixed(2)}%
                </TableCell>
                <TableCell className="text-right">{formatIndianNumber(item.oi)}</TableCell>
                <TableCell className={`text-right ${item.oiChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {item.oiChange >= 0 ? "+" : ""}{formatIndianNumber(item.oiChange)}
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

  // Fetch buildup data
  const { data: buildupData, isLoading, refetch } = useQuery({
    queryKey: ["future-buildup", selectedSymbol, selectedExpiry],
    queryFn: () => fetchFutureBuildup(selectedSymbol, selectedExpiry),
    enabled: !!selectedExpiry,
    refetchInterval: 60000,
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
      ["Type", "Symbol", "Price", "Price Chg (%)", "OI", "OI Chg (%)"].join(","),
      ...allItems.map((i) =>
        [i.type, i.symbol, i.price, i.priceChange, i.oi, i.oiChange].join(",")
      ),
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
      <Navbar />
      <AdminPaletteButton />

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

          <Button onClick={() => refetch()} variant="default" className="gap-2">
            <Search className="h-4 w-4" />
            Search
          </Button>

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

          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BuildupTable
            title="Long Buildup"
            items={buildupData?.longBuildup || []}
            isLoading={isLoading}
            variant="long"
          />
          <BuildupTable
            title="Short Buildup"
            items={buildupData?.shortBuildup || []}
            isLoading={isLoading}
            variant="short"
          />
          <BuildupTable
            title="Short Covering"
            items={buildupData?.shortCovering || []}
            isLoading={isLoading}
            variant="covering"
          />
          <BuildupTable
            title="Long Unwinding"
            items={buildupData?.longUnwinding || []}
            isLoading={isLoading}
            variant="unwinding"
          />
        </div>
      </div>
    </div>
  );
}
