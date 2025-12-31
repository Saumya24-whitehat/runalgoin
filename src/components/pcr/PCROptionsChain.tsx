import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PCRStrikeData } from "@/services/pcrApi";
import { TrendingUp } from "lucide-react";

interface PCROptionsChainProps {
  data: PCRStrikeData[];
  atm: number;
  spotPrice: number;
  pcrOI: number;
  pcrCOI: number;
}

function formatNumber(value: number): string {
  if (value >= 10000000) return (value / 10000000).toFixed(2) + " Cr";
  if (value >= 100000) return (value / 100000).toFixed(2) + " L";
  if (value >= 1000) return (value / 1000).toFixed(2) + " K";
  return value.toLocaleString();
}

export function PCROptionsChain({ data, atm, spotPrice, pcrOI, pcrCOI }: PCROptionsChainProps) {
  const isCallITM = (strike: number) => strike < spotPrice;
  const isPutITM = (strike: number) => strike > spotPrice;

  // Calculate totals
  const totalCEOI = data.reduce((sum, item) => sum + item["CE OI"], 0);
  const totalPEOI = data.reduce((sum, item) => sum + item["PE OI"], 0);
  const totalCECOI = data.reduce((sum, item) => sum + item["CE COI"], 0);
  const totalPECOI = data.reduce((sum, item) => sum + item["PE COI"], 0);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Call Options Table */}
          <div>
            <h3 className="text-base font-semibold mb-3 text-call text-center flex items-center justify-center gap-2">
              <TrendingUp className="h-5 w-5" />
              CE (Call Options)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader>
                <TableRow className="bg-oc-header">
                  <TableHead className="text-xs font-semibold">Strike</TableHead>
                    <TableHead className="text-xs font-semibold text-right">CE LTP</TableHead>
                    <TableHead className="text-xs font-semibold text-right">CE OI</TableHead>
                    <TableHead className="text-xs font-semibold text-right">CE COI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => {
                    const isAtm = row.Strike === atm;
                    const itm = isCallITM(row.Strike);
                    return (
                      <TableRow
                        key={row.Strike}
                        className={`text-xs ${isAtm ? 'bg-oc-atm' : itm ? 'bg-oc-call-itm' : ''}`}
                      >
                        <TableCell className="font-medium text-primary">{row.Strike}</TableCell>
                        <TableCell className="text-right text-call">{row["CE LTP"].toFixed(2)}</TableCell>
                        <TableCell className="text-right">{formatNumber(row["CE OI"])}</TableCell>
                        <TableCell className={`text-right ${row["CE COI"] >= 0 ? 'text-oc-positive' : 'text-oc-negative'}`}>
                          {formatNumber(row["CE COI"])}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-oc-totals-row font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">{formatNumber(totalCEOI)}</TableCell>
                    <TableCell className="text-right">{formatNumber(totalCECOI)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Put Options Table */}
          <div>
            <h3 className="text-base font-semibold mb-3 text-put text-center flex items-center justify-center gap-2">
              <TrendingUp className="h-5 w-5" />
              PE (Put Options)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <Table>
                <TableHeader>
                <TableRow className="bg-oc-header">
                  <TableHead className="text-xs font-semibold">Strike</TableHead>
                    <TableHead className="text-xs font-semibold text-right">PE LTP</TableHead>
                    <TableHead className="text-xs font-semibold text-right">PE OI</TableHead>
                    <TableHead className="text-xs font-semibold text-right">PE COI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => {
                    const isAtm = row.Strike === atm;
                    const itm = isPutITM(row.Strike);
                    return (
                      <TableRow
                        key={row.Strike}
                        className={`text-xs ${isAtm ? 'bg-oc-atm' : itm ? 'bg-oc-put-itm' : ''}`}
                      >
                        <TableCell className="font-medium text-primary">{row.Strike}</TableCell>
                        <TableCell className="text-right text-put">{row["PE LTP"].toFixed(2)}</TableCell>
                        <TableCell className="text-right">{formatNumber(row["PE OI"])}</TableCell>
                        <TableCell className={`text-right ${row["PE COI"] >= 0 ? 'text-oc-positive' : 'text-oc-negative'}`}>
                          {formatNumber(row["PE COI"])}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-oc-totals-row font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">{formatNumber(totalPEOI)}</TableCell>
                    <TableCell className="text-right">{formatNumber(totalPECOI)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
