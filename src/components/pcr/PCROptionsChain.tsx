import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PCRStrikeData } from "@/services/pcrApi";

interface PCROptionsChainProps {
  data: PCRStrikeData[];
  atm: number;
  spotPrice: number;
  pcrOI: number;
  pcrCOI: number;
}

function formatNumber(value: number): string {
  const x = Math.round(value).toString().split(".");
  let intPart = x[0];
  const decPart = x.length > 1 ? "." + x[1] : "";
  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== "") lastThree = "," + lastThree;
  return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + decPart;
}

export function PCROptionsChain({ data, atm, spotPrice, pcrOI, pcrCOI }: PCROptionsChainProps) {
  const isCallITM = (strike: number) => strike < spotPrice;
  const isPutITM = (strike: number) => strike > spotPrice;

  const totalCEOI = data.reduce((sum, item) => sum + item["CE OI"], 0);
  const totalPEOI = data.reduce((sum, item) => sum + item["PE OI"], 0);
  const totalCECOI = data.reduce((sum, item) => sum + item["CE COI"], 0);
  const totalPECOI = data.reduce((sum, item) => sum + item["PE COI"], 0);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                <TableHead colSpan={3} className="text-center bg-red-800 text-white font-bold text-sm py-2">
                  CALL
                </TableHead>
                <TableHead className="text-center bg-indigo-900 text-white font-bold text-sm py-2">
                  STRIKE
                </TableHead>
                <TableHead colSpan={3} className="text-center bg-green-800 text-white font-bold text-sm py-2">
                  PUT
                </TableHead>
              </TableRow>
              <TableRow className="bg-muted">
                <TableHead className="text-center text-xs p-1">COI</TableHead>
                <TableHead className="text-center text-xs p-1">OI</TableHead>
                <TableHead className="text-center text-xs p-1">LTP</TableHead>
                <TableHead className="text-center text-xs p-1 bg-indigo-900/50">PCR</TableHead>
                <TableHead className="text-center text-xs p-1">LTP</TableHead>
                <TableHead className="text-center text-xs p-1">OI</TableHead>
                <TableHead className="text-center text-xs p-1">COI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => {
                const isAtm = row.Strike === atm;
                const callItm = isCallITM(row.Strike);
                const putItm = isPutITM(row.Strike);
                const isSpotRow = idx > 0 && data[idx - 1]?.Strike < spotPrice && row.Strike > spotPrice;
                const pcr = row["CE OI"] > 0 ? (row["PE OI"] / row["CE OI"]).toFixed(2) : "-";

                return (
                  <>
                    {isSpotRow && (
                      <TableRow key={`spot-${idx}`} className="border-y-2 border-red-500">
                        <TableCell colSpan={7} className="p-0">
                          <div className="flex justify-between items-center bg-card/80 px-4 py-2">
                            <span className="text-xs text-muted-foreground">PCR OI: {pcrOI.toFixed(2)}</span>
                            <span className="bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold">
                              SPOT: {spotPrice.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">PCR COI: {pcrCOI.toFixed(2)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow
                      key={row.Strike}
                      className={`text-xs hover:bg-muted/20 ${isAtm ? "bg-oc-atm" : ""}`}
                    >
                      <TableCell className={`text-center p-1 ${callItm ? "bg-red-950/30" : ""} ${row["CE COI"] >= 0 ? "text-oc-positive" : "text-oc-negative"}`}>
                        {formatNumber(row["CE COI"])}
                      </TableCell>
                      <TableCell className={`text-center p-1 ${callItm ? "bg-red-950/30" : ""}`}>
                        {formatNumber(row["CE OI"])}
                      </TableCell>
                      <TableCell className={`text-center p-1 ${callItm ? "bg-red-950/30" : ""}`}>
                        {row["CE LTP"].toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-center p-1 bg-indigo-900/30 font-bold ${isAtm ? "text-oc-atm-text" : ""}`}>
                        <div>{row.Strike}</div>
                        <div className="text-[9px] text-muted-foreground">{pcr}</div>
                      </TableCell>
                      <TableCell className={`text-center p-1 ${putItm ? "bg-emerald-950/30" : ""}`}>
                        {row["PE LTP"].toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-center p-1 ${putItm ? "bg-emerald-950/30" : ""}`}>
                        {formatNumber(row["PE OI"])}
                      </TableCell>
                      <TableCell className={`text-center p-1 ${putItm ? "bg-emerald-950/30" : ""} ${row["PE COI"] >= 0 ? "text-oc-positive" : "text-oc-negative"}`}>
                        {formatNumber(row["PE COI"])}
                      </TableCell>
                    </TableRow>
                  </>
                );
              })}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell className="text-center p-1 bg-red-900/50">{formatNumber(totalCECOI)}</TableCell>
                <TableCell className="text-center p-1 bg-red-900/50">{formatNumber(totalCEOI)}</TableCell>
                <TableCell className="text-center p-1"></TableCell>
                <TableCell className="text-center p-1 bg-indigo-900/50">Total</TableCell>
                <TableCell className="text-center p-1"></TableCell>
                <TableCell className="text-center p-1 bg-green-900/50">{formatNumber(totalPEOI)}</TableCell>
                <TableCell className="text-center p-1 bg-green-900/50">{formatNumber(totalPECOI)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
