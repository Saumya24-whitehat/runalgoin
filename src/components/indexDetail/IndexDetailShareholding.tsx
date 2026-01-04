import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
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

export const IndexDetailShareholding = ({ indexSymbol }: IndexDetailShareholdingProps) => {
  const navigate = useNavigate();
  const [data, setData] = useState<ShareholdingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<"promoter" | "fii" | "mf" | "public">("promoter");
  const [showCurrentOnly, setShowCurrentOnly] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const result = await fetchShareholdingData(indexSymbol, activeType);
      if (result) {
        console.log(activeType);

        // var currentPercent=item
        // Transform the data into our format
        const transformed: ShareholdingItem[] = result.map((item: any) => ({
          symbol: item["NSE Symbol"] || item["NSE Symbol"] || "",
          name: item["Stock"] || item["Stock"] || "",
          ltp: item["Current Price"] || item["Current Price"] || 0,
          marketCap: item["Market Capitalization"] || item["Market Capitalization"] || 0,
          currentPercent:
            {
              promoter: item["Promoter holding latest %"],
              fii: item["FII holding current Qtr %"],
              mf: item["MF holding current Qtr %"],
              public: item["Public holding current Qtr %"],
            }[activeType as keyof typeof item] || 0,
          qoq:
            {
              promoter: item["Promoter holding change QoQ %"],
              fii: item["FII holding change QoQ %"],
              mf: item["MF holding change QoQ %"],
              public: item["Public holding change QoQ %"],
            }[activeType as keyof typeof item] || 0,
          yoy:
            {
              promoter: item["Promoter holding change 4Qtr %"],
              fii: item["FII holding change 4Qtr %"],
              mf: item["MF holding change 4Qtr %"],
              public: item["Public holding change 4Qtr %"],
            }[activeType as keyof typeof item] || 0,
        }));
        console.log(transformed);
        setData(transformed);
      }
      setLoading(false);
    };

    loadData();
  }, [indexSymbol, activeType]);

  const handleStockClick = (symbol: string) => {
    navigate(`/jackpot-detail?symbol=${symbol}`);
  };

  // Mock data for display (since real API may not be available)
  const mockData: ShareholdingItem[] = [
    {
      symbol: "ADANIENT",
      name: "Adani Enterprises",
      ltp: 2278.9,
      marketCap: 278807.83,
      currentPercent: 73.97,
      qoq: 0.0,
      yoy: -0.92,
    },
    {
      symbol: "WIPRO",
      name: "Wipro",
      ltp: 261.74,
      marketCap: 274469.02,
      currentPercent: 72.65,
      qoq: -0.01,
      yoy: -0.15,
    },
    { symbol: "TCS", name: "TCS", ltp: 3230.2, marketCap: 1168714.62, currentPercent: 71.77, qoq: 0.0, yoy: 0.0 },
    {
      symbol: "ADANIPORTS",
      name: "Adani Ports",
      ltp: 1512.6,
      marketCap: 326742.61,
      currentPercent: 65.89,
      qoq: 0.0,
      yoy: 0.0,
    },
    {
      symbol: "COALINDIA",
      name: "Coal India",
      ltp: 384.45,
      marketCap: 236926.09,
      currentPercent: 63.13,
      qoq: 0.0,
      yoy: 0.0,
    },
    {
      symbol: "NESTLEIND",
      name: "Nestle",
      ltp: 1243.5,
      marketCap: 239785.88,
      currentPercent: 62.76,
      qoq: 0.0,
      yoy: 0.0,
    },
    {
      symbol: "HINDUNILVR",
      name: "Hindustan Unilever",
      ltp: 2293.5,
      marketCap: 538878.76,
      currentPercent: 61.9,
      qoq: 0.0,
      yoy: 0.0,
    },
  ];

  const displayData = data.length > 0 ? data : mockData;

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
        <Button
          size="sm"
          variant={activeType === "promoter" ? "default" : "outline"}
          onClick={() => setActiveType("promoter")}
        >
          Promoter
        </Button>
        <Button size="sm" variant={activeType === "fii" ? "default" : "outline"} onClick={() => setActiveType("fii")}>
          FII
        </Button>
        <Button size="sm" variant={activeType === "mf" ? "default" : "outline"} onClick={() => setActiveType("mf")}>
          MF
        </Button>
        <Button
          size="sm"
          variant={activeType === "public" ? "default" : "outline"}
          onClick={() => setActiveType("public")}
        >
          Public
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="currentPeriod"
          checked={showCurrentOnly}
          onCheckedChange={(checked) => setShowCurrentOnly(checked === true)}
        />
        <label htmlFor="currentPeriod" className="text-sm text-muted-foreground cursor-pointer">
          Show current period only
        </label>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Stock Name</TableHead>
              <TableHead className="text-right">M.Cap</TableHead>
              <TableHead className="text-right">Current %</TableHead>
              <TableHead className="text-right">QOQ</TableHead>
              <TableHead className="text-right">YOY</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((item) => (
              <TableRow
                key={item.symbol}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => handleStockClick(item.symbol)}
              >
                <TableCell>
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

      {displayData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No shareholding data available</div>
      )}
    </div>
  );
};
