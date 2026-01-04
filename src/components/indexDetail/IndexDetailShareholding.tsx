import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { fetchShareholdingData } from "@/services/indexDetailApi";

interface IndexDetailShareholdingProps {
  indexSymbol: string;
}

interface ShareholdingItem {
  symbol: string;
  name: string;
  ltp: number;
  marketCap: number;
  currentPercent: number;
  qoq: number;
  yoy: number;
}

type SortKey = keyof ShareholdingItem;

export const IndexDetailShareholding = ({ indexSymbol }: IndexDetailShareholdingProps) => {
  const navigate = useNavigate();
  const [data, setData] = useState<ShareholdingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<"promoter" | "fii" | "mf" | "public">("promoter");
  const [showCurrentOnly, setShowCurrentOnly] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("currentPercent");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const result = await fetchShareholdingData(indexSymbol, activeType);
      if (result) {
        const transformed: ShareholdingItem[] = result.map((item: any) => ({
          symbol: item["NSE Symbol"] || "",
          name: item["Stock"] || "",
          ltp: item["Current Price"] || 0,
          marketCap: item["Market Capitalization"] || 0,
          currentPercent:
            {
              promoter: item["Promoter holding latest %"],
              fii: item["FII holding current Qtr %"],
              mf: item["MF holding current Qtr %"],
              public: item["Public holding current Qtr %"],
            }[activeType] || 0,
          qoq:
            {
              promoter: item["Promoter holding change QoQ %"],
              fii: item["FII holding change QoQ %"],
              mf: item["MF holding change QoQ %"],
              public: item["Public holding change QoQ %"],
            }[activeType] || 0,
          yoy:
            {
              promoter: item["Promoter holding change 4Qtr %"],
              fii: item["FII holding change 4Qtr %"],
              mf: item["MF holding change 4Qtr %"],
              public: item["Public holding change 4Qtr %"],
            }[activeType] || 0,
        }));
        setData(transformed);
      }
      setLoading(false);
    };
    loadData();
  }, [indexSymbol, activeType]);

  const handleStockClick = (symbol: string) => {
    navigate(`/jackpot-detail?symbol=${symbol}`);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    if (showCurrentOnly) {
      filtered = filtered.filter((item) => item.currentPercent > 0);
    }

    if (filterText) {
      const text = filterText.toLowerCase();
      filtered = filtered.filter(
        (item) => item.name.toLowerCase().includes(text) || item.symbol.toLowerCase().includes(text),
      );
    }

    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortKey, sortOrder, showCurrentOnly, filterText]);

  const formatMarketCap = (value: number) => {
    if (value >= 100000) {
      return (value / 100000).toFixed(2) + " L Cr";
    }
    return value.toFixed(2) + " Cr";
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
      {/* Type Buttons */}
      <div className="flex gap-2">
        {["promoter", "fii", "mf", "public"].map((type) => (
          <Button
            key={type}
            size="sm"
            variant={activeType === type ? "default" : "outline"}
            onClick={() => setActiveType(type as typeof activeType)}
          >
            {type.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Checkbox
          id="currentPeriod"
          checked={showCurrentOnly}
          onCheckedChange={(checked) => setShowCurrentOnly(checked === true)}
        />
        <label htmlFor="currentPeriod" className="text-sm text-muted-foreground cursor-pointer">
          Show current period only
        </label>
        <input
          type="text"
          placeholder="Search by name or symbol"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="px-2 py-1 border rounded text-sm flex-1"
          style={{
            width: "100%",
            padding: "6px 8px",
            fontSize: "0.875rem", // text-sm
            borderRadius: "6px",
            border: "1px solid #4B5563", // dark gray border
            backgroundColor: "#1F2937", // dark background
            color: "#E5E7EB", // light text
            outline: "none",
          }}
        />
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              {[
                { label: "Stock Name", key: "name" },
                { label: "M.Cap", key: "marketCap" },
                { label: "Current %", key: "currentPercent" },
                { label: "QOQ", key: "qoq" },
                { label: "YOY", key: "yoy" },
              ].map((col) => (
                <TableHead
                  key={col.key}
                  className="cursor-pointer text-right"
                  onClick={() => handleSort(col.key as SortKey)}
                >
                  <div className="flex items-center justify-end gap-1">
                    {col.label}
                    {sortKey === col.key && (sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedData.map((item) => (
              <TableRow
                key={item.symbol}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => handleStockClick(item.symbol)}
              >
                <TableCell className="text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold">
                      <img src={`https://runalgo.xyz/top/chart/data/svg/nse_${item.symbol}.svg`} />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{item.name}</div>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {item.ltp.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">{formatMarketCap(item.marketCap)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{item.currentPercent.toFixed(2)}%</TableCell>
                <TableCell className={`text-right font-mono ${item.qoq >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {item.qoq >= 0 ? "+" : ""}
                  {item.qoq.toFixed(2)}
                </TableCell>
                <TableCell className={`text-right font-mono ${item.yoy >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {item.yoy >= 0 ? "+" : ""}
                  {item.yoy.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredAndSortedData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No shareholding data available</div>
      )}
    </div>
  );
};
