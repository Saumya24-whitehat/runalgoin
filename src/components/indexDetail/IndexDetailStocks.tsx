import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, ArrowUpDown } from "lucide-react";
import { fetchIndexStocks, IndexStock, formatMarketCap } from "@/services/indexDetailApi";

interface IndexDetailStocksProps {
  indexSymbol: string;
}

export const IndexDetailStocks = ({ indexSymbol }: IndexDetailStocksProps) => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<IndexStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "gainers" | "losers">("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof IndexStock; direction: "asc" | "desc" }>({
    key: "market_cap",
    direction: "desc",
  });

  useEffect(() => {
    const loadStocks = async () => {
      setLoading(true);
      const data = await fetchIndexStocks(indexSymbol);
      if (data) {
        setStocks(data);
      }
      setLoading(false);
    };

    loadStocks();
  }, [indexSymbol]);

  const handleSort = (key: keyof IndexStock) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredStocks = stocks
    .filter((stock) => {
      const matchesSearch =
        stock.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.ticker.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        filter === "all" ? true : filter === "gainers" ? stock.change_percent > 0 : stock.change_percent < 0;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

  const handleStockClick = (ticker: string, sector: string) => {
    navigate(`/stock-detail?symbol=${ticker}&sector=${sector}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            All Stocks
          </Button>
          <Button size="sm" variant={filter === "gainers" ? "default" : "outline"} onClick={() => setFilter("gainers")}>
            Gainers
          </Button>
          <Button size="sm" variant={filter === "losers" ? "default" : "outline"} onClick={() => setFilter("losers")}>
            Losers
          </Button>
        </div>

        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stocks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[300px]">Stock</TableHead>
              <TableHead
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort("market_cap")}
              >
                <div className="flex items-center justify-end gap-1">
                  Market Cap <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort("price")}>
                <div className="flex items-center justify-end gap-1">
                  Price <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort("change_percent")}
              >
                <div className="flex items-center justify-end gap-1">
                  Change <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort("change_percent")}
              >
                <div className="flex items-center justify-end gap-1">
                  Change % <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStocks.map((stock) => (
              <TableRow
                key={stock.ticker}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => handleStockClick(stock.ticker, indexSymbol)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold">
                      {stock.ticker.substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium text-primary">{stock.company_name}</div>
                      <div className="text-xs text-muted-foreground">{stock.sector}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">{formatMarketCap(stock.market_cap)}</TableCell>
                <TableCell className="text-right font-mono text-primary">₹{stock.price.toFixed(2)}</TableCell>
                <TableCell
                  className={`text-right font-mono ${stock.change_percent >= 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {stock.change_percent >= 0 ? "+" : ""}
                  {((stock.price * stock.change_percent) / 100).toFixed(2)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono ${stock.change_percent >= 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {stock.change_percent >= 0 ? "+" : ""}
                  {stock.change_percent.toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredStocks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No stocks found matching your criteria</div>
      )}
    </div>
  );
};
