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
  const historicalData = data[2] || [];

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
                {historicalData
                  .slice()
                  .reverse()
                  .map((row: any[], idx: number) => {
                    // --- JACKPOT LOGIC (exact JS match) ---
                    const Jackpot =
                      parseFloat(row[10]) > parseFloat(row[16]) && parseFloat(row[12]) > parseFloat(row[14])
                        ? "JACKPOT"
                        : "";

                    const JackpotColor = Jackpot !== "" ? "bg-[#ffea99] text-black font-bold" : "";

                    // --- TREND LOGIC (exact JS match) ---
                    const col24 = parseFloat(row[24]);
                    const col31 = parseFloat(row[31]);

                    let trend = "-";
                    let trendClass = "text-white";

                    if (col24 > 0 && col31 > 0) {
                      trend = "Long Buildup";
                      trendClass = "bg-[#9de697] text-black font-bold";
                    } else if (col24 < 0 && col31 > 0) {
                      trend = "Short Covering";
                      trendClass = "text-lime-400";
                    } else if (col24 > 0 && col31 < 0) {
                      trend = "Short Buildup";
                      trendClass = "bg-[#e6a3a3] text-black font-bold";
                    } else if (col24 < 0 && col31 < 0) {
                      trend = "Long Unwinding";
                      trendClass = "text-red-600";
                    }

                    return (
                      <TableRow key={idx} className="border-border hover:bg-muted/30">
                        {/* historicalData[i][0] */}
                        <TableCell>{row[0]}</TableCell>

                        {/* historicalData[i][26] */}
                        <TableCell className="text-right">{parseFloat(row[26]).toFixed(2)}</TableCell>

                        {/* historicalData[i][31] */}
                        <TableCell className="text-right">{parseFloat(row[31]).toFixed(2)}</TableCell>

                        {/* historicalData[i][32] */}
                        <TableCell className="text-right">{parseFloat(row[32]).toFixed(2)}%</TableCell>

                        {/* historicalData[i][10] */}
                        <TableCell className="text-right">{parseFloat(row[10]).toFixed(2)}%</TableCell>

                        {/* historicalData[i][11] */}
                        <TableCell className="text-right">{parseFloat(row[11]).toFixed(2)}</TableCell>

                        {/* historicalData[i][12] */}
                        <TableCell className="text-right">{parseFloat(row[12]).toFixed(0)}</TableCell>

                        {/* historicalData[i][16] */}
                        <TableCell className="text-right">{parseFloat(row[16]).toFixed(2)}%</TableCell>

                        {/* JACKPOT */}
                        <TableCell className="text-center">
                          {Jackpot && <span className={`px-2 py-1 rounded ${JackpotColor}`}>{Jackpot}</span>}
                        </TableCell>

                        {/* historicalData[i][7] */}
                        <TableCell className="text-right">{parseFloat(row[7]).toFixed(0)}</TableCell>

                        {/* historicalData[i][24] */}
                        <TableCell className="text-right">{parseFloat(row[24]).toFixed(0)}</TableCell>

                        {/* historicalData[i][23] */}
                        <TableCell className="text-right">{parseFloat(row[23]).toFixed(2)}%</TableCell>

                        {/* TREND */}
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded ${trendClass}`}>{trend}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
