import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { fetchStockOptions } from "@/services/stockDetailApi";

interface StockDetailOptionsProps {
  symbol: string;
}

interface AverageData {
  "One Day"?: { avgPriceChng: string; avgDelivery: string; avgAction: string };
  "Three Days"?: { avgPriceChng: string; avgDelivery: string; avgAction: string };
  "Five Days"?: { avgPriceChng: string; avgDelivery: string; avgAction: string };
}

interface OIData {
  expiry: string;
  oi: string;
  chngInOi: string;
}

interface HistoryRow {
  date: string;
  close: string;
  chng: string;
  priceChng: string;
  delivery: string;
  vwap: string;
  action: string;
  avgDelivery: string;
  jackpot?: string;
  oi: string;
  chngInOi: string;
  coiPercent: string;
  logic: string;
}

export const StockDetailOptions = ({ symbol }: StockDetailOptionsProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await fetchStockOptions(symbol);
      setData(result);
      setLoading(false);
    };
    fetchData();
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-muted-foreground py-8">No options data available for {symbol}</div>;
  }

  const averageData = data[0] || {};
  const oiData = data[1] || [];
  const historyData = data[2] || [];

  const getLogicStyle = (logic: string) => {
    const lowerLogic = logic?.toLowerCase() || "";
    if (lowerLogic.includes("long buildup")) return "bg-emerald-500/20 text-emerald-500";
    if (lowerLogic.includes("short buildup")) return "bg-red-500/20 text-red-500";
    if (lowerLogic.includes("long unwinding")) return "bg-amber-500/20 text-amber-500";
    if (lowerLogic.includes("short covering")) return "bg-blue-500/20 text-blue-500";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AVERAGE TABLE */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-foreground">Average Summary (1D / 3D / 5D)</CardTitle>
          </CardHeader>

          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs font-medium">PERIOD</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">% PRICE CHNG</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">% DELIVERY</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">ACTION</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {[
                  { label: "One Day", chng: "ChangePCT", del: "DelPCT", act: "Action" },
                  { label: "Three Days", chng: "ChangePCT3Day", del: "DelPCT3Day", act: "Action3Day" },
                  { label: "Five Days", chng: "ChangePCT5Day", del: "DelPCT5Day", act: "Action5Day" },
                ].map((row) => (
                  <TableRow key={row.label} className="border-border hover:bg-muted/30">
                    <TableCell className="font-medium text-sm text-foreground">{row.label}</TableCell>

                    <TableCell
                      className={`text-right text-sm ${
                        parseFloat(averageData[row.chng]) < 0 ? "text-red-500" : "text-emerald-500"
                      }`}
                    >
                      {averageData[row.chng] || "-"}
                    </TableCell>

                    <TableCell className="text-right text-sm text-foreground">{averageData[row.del] || "-"}</TableCell>

                    <TableCell className="text-right text-sm text-foreground">{averageData[row.act] || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* OI TABLE */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-foreground">OI Summary (Near / Next / Far)</CardTitle>
          </CardHeader>

          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs font-medium">PERIOD</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">EXPIRY</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">OI</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">CHNG IN OI</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">% COI</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {[
                  { label: "Near Expiry", exp: "Near Expiry", oi: "Near OI", coi: "Near COI", pct: "Near COI %" },
                  { label: "Next Expiry", exp: "Next Expiry", oi: "Next OI", coi: "Next COI", pct: "Next COI %" },
                  { label: "Far Expiry", exp: "Far Expiry", oi: "Far OI", coi: "Far COI", pct: "Far COI %" },
                ].map((row) => (
                  <TableRow key={row.label} className="border-border hover:bg-muted/30">
                    <TableCell className="font-medium text-sm text-foreground">{row.label}</TableCell>

                    <TableCell className="text-right text-sm text-foreground">{oiData[row.exp] || "-"}</TableCell>

                    <TableCell className="text-right text-sm text-foreground">{oiData[row.oi] || "-"}</TableCell>

                    <TableCell
                      className={`text-right text-sm ${
                        parseFloat(oiData[row.coi]) < 0 ? "text-red-500" : "text-emerald-500"
                      }`}
                    >
                      {oiData[row.coi] || "-"}
                    </TableCell>

                    <TableCell
                      className={`text-right text-sm ${
                        parseFloat(oiData[row.pct]) < 0 ? "text-red-500" : "text-emerald-500"
                      }`}
                    >
                      {oiData[row.pct] || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Daily Options Chain Data */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-foreground">Daily Options Chain Data</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="w-full max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs font-medium">DATE</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">CLOSE PRICE</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">PRICE CHANGE</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">% PRICE CHANGE</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">% DELIVERY</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">VWAP</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">ACTION</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">AVG DELIVERY %</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-center">JACKPOT</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">OI</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">COI</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-right">COI %</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium text-center">LOGIC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData.slice(0, 20).map((row: HistoryRow, idx: number) => (
                  <TableRow key={idx} className="border-border hover:bg-muted/30">
                    <TableCell className="font-medium text-sm text-foreground">{row.date}</TableCell>
                    <TableCell className="text-right text-sm text-foreground">{row.close}</TableCell>
                    <TableCell
                      className={`text-right text-sm ${
                        parseFloat(String(row.chng)) < 0 ? "text-red-500" : "text-foreground"
                      }`}
                    >
                      {row.chng}
                    </TableCell>
                    <TableCell
                      className={`text-right text-sm ${
                        parseFloat(String(row.priceChng)) < 0 ? "text-red-500" : "text-emerald-500"
                      }`}
                    >
                      {row.priceChng}
                    </TableCell>
                    <TableCell className="text-right text-sm text-foreground">{row.delivery}</TableCell>
                    <TableCell className="text-right text-sm text-foreground">{row.vwap}</TableCell>
                    <TableCell className="text-right text-sm text-foreground">{row.action}</TableCell>
                    <TableCell className="text-right text-sm text-foreground">{row.avgDelivery}</TableCell>
                    <TableCell className="text-center">
                      {row.jackpot && <Badge className="bg-amber-500 text-black text-xs">{row.jackpot}</Badge>}
                    </TableCell>
                    <TableCell className="text-right text-sm text-foreground">{row.oi}</TableCell>
                    <TableCell
                      className={`text-right text-sm ${
                        parseFloat(String(row.chngInOi)?.replace(/,/g, "")) < 0 ? "text-red-500" : "text-emerald-500"
                      }`}
                    >
                      {row.chngInOi}
                    </TableCell>
                    <TableCell
                      className={`text-right text-sm ${
                        parseFloat(String(row.coiPercent)) < 0 ? "text-red-500" : "text-emerald-500"
                      }`}
                    >
                      {row.coiPercent}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-xs ${getLogicStyle(row.logic)}`}>{row.logic || "-"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
