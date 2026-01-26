import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ScanResult, ScanColumn, formatCellValue, formatColumnTitle } from "@/services/stockScreenerApi";
import { cn } from "@/lib/utils";

interface ScreenerResultsTableProps {
  result: ScanResult;
}

export function ScreenerResultsTable({ result }: ScreenerResultsTableProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sectorFilter, setSectorFilter] = useState("all");
  const [exchangeFilter, setExchangeFilter] = useState("all");

  // Get column indices
  const sectorIndex = result.columns.findIndex((c) => c.name === "sector");
  const exchangeIndex = result.columns.findIndex((c) => c.name === "exchange");
  const symbolIndex = result.columns.findIndex((c) => c.name === "name");

  // Get unique sectors and exchanges
  const sectors = useMemo(() => {
    if (sectorIndex < 0) return [];
    const set = new Set<string>();
    result.data.forEach((item) => {
      const val = item.d[sectorIndex];
      if (typeof val === "string" && val) set.add(val);
    });
    return Array.from(set).sort();
  }, [result.data, sectorIndex]);

  const exchanges = useMemo(() => {
    if (exchangeIndex < 0) return [];
    const set = new Set<string>();
    result.data.forEach((item) => {
      const val = item.d[exchangeIndex];
      if (typeof val === "string" && val) set.add(val);
    });
    return Array.from(set).sort();
  }, [result.data, exchangeIndex]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let data = [...result.data];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter((item) =>
        item.d.some((cell) => {
          if (cell === null || cell === undefined) return false;
          if (Array.isArray(cell)) {
            return cell.some((idx) => idx.name?.toLowerCase().includes(query));
          }
          return String(cell).toLowerCase().includes(query);
        }),
      );
    }

    // Apply sector filter
    if (sectorFilter && sectorFilter !== "all" && sectorIndex >= 0) {
      data = data.filter((item) => item.d[sectorIndex] === sectorFilter);
    }

    // Apply exchange filter
    if (exchangeFilter && exchangeFilter !== "all" && exchangeIndex >= 0) {
      data = data.filter((item) => item.d[exchangeIndex] === exchangeFilter);
    }

    // Apply sorting
    if (sortColumn !== null) {
      data.sort((a, b) => {
        const aVal = a.d[sortColumn];
        const bVal = b.d[sortColumn];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        let comparison = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return data;
  }, [result.data, searchQuery, sectorFilter, exchangeFilter, sortColumn, sortDirection, sectorIndex, exchangeIndex]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(columnIndex);
      setSortDirection("asc");
    }
  };

  const handleStockClick = (symbol: string) => {
    navigate(`/stock-detail?symbol=${encodeURIComponent(symbol)}`);
  };

  const exportToCSV = () => {
    const headers = result.columns.map((col) => formatColumnTitle(col));
    const rows = filteredData.map((item) =>
      result.columns.map((col, i) => {
        const val = item.d[i];
        if (Array.isArray(val)) {
          return val.map((idx) => idx.name).join("; ");
        }
        return val ?? "";
      }),
    );

    const csvContent = [
      `"Condition: ${result.condition}"`,
      `"Scanned on: ${new Date().toLocaleString()}"`,
      "",
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stock_scan_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSectorFilter("all");
    setExchangeFilter("all");
    setSortColumn(null);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters Bar */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stocks..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {sectors.length > 0 && (
            <Select
              value={sectorFilter}
              onValueChange={(v) => {
                setSectorFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue placeholder="All Sectors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {exchanges.length > 0 && (
            <Select
              value={exchangeFilter}
              onValueChange={(v) => {
                setExchangeFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue placeholder="All Exchanges" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exchanges</SelectItem>
                {exchanges.map((exchange) => (
                  <SelectItem key={exchange} value={exchange}>
                    {exchange}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" size="sm" onClick={clearFilters} className="h-9 text-xs">
            Clear
          </Button>

          <Button variant="outline" size="sm" onClick={exportToCSV} className="h-9 text-xs ml-auto">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {paginatedData.length} of {filteredData.length} stocks
            {filteredData.length !== result.data.length && ` (filtered from ${result.data.length})`}
          </span>
          <code className="text-primary/80 font-mono">{result.condition}</code>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              {result.columns.map((col, index) => (
                <TableHead
                  key={index}
                  className="cursor-pointer hover:bg-accent/50 whitespace-nowrap"
                  onClick={() => handleSort(index)}
                >
                  <div className="flex items-center gap-1">
                    {formatColumnTitle(col)}
                    {sortColumn === index && (
                      <ArrowUpDown className={cn("h-3 w-3", sortDirection === "desc" && "rotate-180")} />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item, rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-accent/30">
                {result.columns.map((col, colIndex) => {
                  const value = item.d[colIndex];
                  const isSymbol = col.name === "name";
                  const displayValue = formatCellValue(value, col.name);

                  return (
                    <TableCell
                      key={colIndex}
                      className={cn(
                        "whitespace-nowrap",
                        isSymbol && "cursor-pointer font-medium text-primary hover:underline",
                      )}
                      onClick={() => isSymbol && typeof value === "string" && handleStockClick(value)}
                    >
                      {isSymbol ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={`https://runalgo.xyz/top/chart/data/svg/nse_${value}.svg`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://runalgo.xyz/livescreener/static/svg2/bse.svg";
                            }}
                            className="w-5 h-5 rounded"
                            alt=""
                          />
                          {displayValue}
                        </div>
                      ) : (
                        displayValue
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}

            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={result.columns.length} className="text-center py-8 text-muted-foreground">
                  No stocks found matching your criteria
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Pagination */}
      <div className="p-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[70px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages || 1}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
