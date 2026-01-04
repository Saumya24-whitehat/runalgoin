import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { fetchTechnicalsData, StockTechnical } from "@/services/indexDetailApi";

interface IndexDetailTechnicalsProps {
  indexSymbol: string;
}

const timeframes = [
  { key: "D", label: "D" },
  { key: "PD", label: "PD" },
  { key: "W", label: "W" },
  { key: "M", label: "M" },
  { key: "52W", label: "52W" },
];

const indicators = [
  { key: "AT", label: "AT", fields: ["close", "change", "high", "low"] },
  { key: "SMA", label: "SMA", fields: ["SMA20", "SMA50", "SMA100", "SMA200"] },
  { key: "EMA", label: "EMA", fields: ["EMA20", "EMA50", "EMA100", "EMA200"] },
  {
    key: "PIVOT",
    label: "PIVOT",
    fields: ["Pivot.M.Classic.R1", "Pivot.M.Classic.R2", "Pivot.M.Classic.S1", "Pivot.M.Classic.S2"],
  },
  { key: "BB", label: "BB", fields: ["BB.upper", "BB.lower", "BB.basis"] },
  { key: "PSAR", label: "PSAR", fields: ["P.SAR"] },
  { key: "ICHK", label: "ICHK", fields: ["Ichimoku.BLine", "Ichimoku.CLine"] },
  { key: "RSI", label: "RSI", fields: ["RSI"] },
  { key: "CCI", label: "CCI", fields: ["CCI20"] },
  { key: "MFI", label: "MFI", fields: ["MoneyFlow"] },
  { key: "ROC", label: "ROC", fields: ["ROC"] },
  { key: "STOCH", label: "STOCH", fields: ["Stoch.K_14_1_3", "Stoch.D_14_1_3"] },
  { key: "WR", label: "W%R", fields: ["W.R"] },
];

// Helper to get display value for a field
const getFieldDisplayName = (field: string): string => {
  const nameMap: Record<string, string> = {
    close: "Close",
    change: "Chg %",
    high: "High",
    low: "Low",
    SMA20: "SMA 20",
    SMA50: "SMA 50",
    SMA100: "SMA 100",
    SMA200: "SMA 200",
    EMA20: "EMA 20",
    EMA50: "EMA 50",
    EMA100: "EMA 100",
    EMA200: "EMA 200",
    "Pivot.M.Classic.R1": "R1",
    "Pivot.M.Classic.R2": "R2",
    "Pivot.M.Classic.S1": "S1",
    "Pivot.M.Classic.S2": "S2",
    "BB.upper": "Upper",
    "BB.lower": "Lower",
    "BB.basis": "Basis",
    "P.SAR": "PSAR",
    "Ichimoku.BLine": "Base",
    "Ichimoku.CLine": "Conv",
    RSI: "RSI",
    CCI20: "CCI",
    MoneyFlow: "MFI",
    ROC: "ROC",
    "Stoch.K_14_1_3": "%K",
    "Stoch.D_14_1_3": "%D",
    "W.R": "W%R",
    "Perf.W": "Week",
    "Perf.1M": "1M",
    price_52_week_high: "52W High",
    price_52_week_low: "52W Low",
    "High.1M": "1M High",
    "Low.1M": "1M Low",
  };
  return nameMap[field] || field;
};

// Get fields based on timeframe
const getTimeframeFields = (timeframe: string): string[] => {
  switch (timeframe) {
    case "D":
      return ["high", "low"];
    case "PD":
      return ["high", "low"];
    case "W":
      return ["Perf.W"];
    case "M":
      return ["Perf.1M", "High.1M", "Low.1M"];
    case "52W":
      return ["Perf.Y", "price_52_week_high", "price_52_week_low"];
    default:
      return ["high", "low"];
  }
};

export const IndexDetailTechnicals = ({ indexSymbol }: IndexDetailTechnicalsProps) => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<StockTechnical[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState("D");
  const [activeIndicator, setActiveIndicator] = useState("AT");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchTechnicalsData(indexSymbol);
      if (data) {
        setStocks(data);
      }
      setLoading(false);
    };

    loadData();
  }, [indexSymbol]);

  const handleStockClick = (ticker: string, sector: string) => {
    navigate(`/stock-detail?symbol=${ticker}&sector=${sector}`);
  };

  // Get current indicator config
  const currentIndicator = useMemo(() => {
    return indicators.find((ind) => ind.key === activeIndicator) || indicators[0];
  }, [activeIndicator]);

  // Get columns based on indicator
  const columns = useMemo(() => {
    if (activeIndicator === "AT") {
      // For AT, show based on timeframe
      return getTimeframeFields(activeTimeframe);
    }
    return currentIndicator.fields;
  }, [activeIndicator, activeTimeframe, currentIndicator]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeframe Buttons */}
      <div className="flex flex-wrap gap-2">
        {timeframes.map((tf) => (
          <Button
            key={tf.key}
            size="sm"
            variant={activeTimeframe === tf.key ? "default" : "outline"}
            onClick={() => setActiveTimeframe(tf.key)}
            className="min-w-[40px]"
          >
            {tf.label}
          </Button>
        ))}
      </div>

      {/* Indicator Buttons */}
      <div className="flex flex-wrap gap-2">
        {indicators.map((ind) => (
          <Button
            key={ind.key}
            size="sm"
            variant={activeIndicator === ind.key ? "default" : "outline"}
            onClick={() => setActiveIndicator(ind.key)}
            className="min-w-[50px]"
          >
            {ind.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-primary">Symbol</TableHead>
              <TableHead className="text-right">LTP</TableHead>
              <TableHead className="text-right">Chg %</TableHead>
              {columns.map((col) => (
                <TableHead key={col} className="text-right">
                  {getFieldDisplayName(col)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocks.map((stock) => {
              const pctChange = stock.change || 0;

              return (
                <TableRow
                  key={stock.name}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => handleStockClick(stock.name, indexSymbol)}
                >
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {stock.name.substring(0, 2)}
                      </div>
                      <div className="font-medium text-primary truncate">{stock.description || stock.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{stock.close?.toFixed(2) || "-"}</TableCell>
                  <TableCell className={`text-right font-mono ${pctChange >= 0 ? "text-success" : "text-destructive"}`}>
                    {pctChange >= 0 ? "+" : ""}
                    {pctChange.toFixed(2)}%
                  </TableCell>
                  {columns.map((col) => {
                    const value = (stock as any)[col];
                    const isPercentage =
                      col.startsWith("Perf") ||
                      col === "change" ||
                      col === "RSI" ||
                      col === "ROC" ||
                      col === "W.R" ||
                      col === "MoneyFlow";
                    const formattedValue =
                      value !== undefined && value !== null
                        ? isPercentage
                          ? `${value >= 0 ? "+" : ""}${Number(value).toFixed(2)}%`
                          : Number(value).toFixed(2)
                        : "-";
                    const colorClass =
                      isPercentage && value !== undefined ? (value >= 0 ? "text-success" : "text-destructive") : "";

                    return (
                      <TableCell key={col} className={`text-right font-mono ${colorClass}`}>
                        {formattedValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {stocks.length === 0 && <div className="text-center py-8 text-muted-foreground">No technical data available</div>}
    </div>
  );
};
