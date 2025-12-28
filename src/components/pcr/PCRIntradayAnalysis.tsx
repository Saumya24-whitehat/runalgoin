import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PCRTimeData } from "@/services/pcrApi";

interface PCRIntradayAnalysisProps {
  data: PCRTimeData[];
}

function formatNumber(value: number): string {
  if (value >= 10000000) return (value / 10000000).toFixed(2) + " Cr";
  if (value >= 100000) return (value / 100000).toFixed(2) + " L";
  if (value >= 1000) return (value / 1000).toFixed(2) + " K";
  return value.toLocaleString();
}

function getSentiment(pcrOI: number): { text: string; color: string } {
  if (pcrOI < 0.7) return { text: "Bearish", color: "text-red-400" };
  if (pcrOI < 0.9) return { text: "Bearish", color: "text-red-400" };
  if (pcrOI < 1.1) return { text: "Neutral", color: "text-yellow-400" };
  return { text: "Bullish", color: "text-emerald-400" };
}

function getVWAPStatus(price: number, vwap: number): { text: string; color: string } {
  const diff = price - vwap;
  if (diff > 0) return { text: "Above VWAP", color: "text-emerald-400" };
  return { text: "Below VWAP", color: "text-red-400" };
}

export function PCRIntradayAnalysis({ data }: PCRIntradayAnalysisProps) {
  // Reverse to show latest first
  const sortedData = [...data].reverse();

  // Process data to fill missing Future values with previous time's Future
  const processedData = sortedData.map((row, index) => {
    let futureValue = row.Future;
    let isFutureBorrowed = false;
    
    // If Future is 0 or missing, look for previous valid value
    if (futureValue === 0 || !futureValue) {
      // Look in next items (which are earlier in time since array is reversed)
      for (let i = index + 1; i < sortedData.length; i++) {
        if (sortedData[i].Future && sortedData[i].Future !== 0) {
          futureValue = sortedData[i].Future;
          isFutureBorrowed = true;
          break;
        }
      }
    }
    
    return { ...row, displayFuture: futureValue, isFutureBorrowed };
  });

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-lg font-heading">Intraday Analysis</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="bg-secondary/80">
                <TableHead className="text-xs font-semibold whitespace-nowrap bg-secondary">Time</TableHead>
                <TableHead className="text-xs font-semibold text-right whitespace-nowrap bg-secondary">Spot</TableHead>
                <TableHead className="text-xs font-semibold text-right whitespace-nowrap bg-secondary">Future</TableHead>
                <TableHead className="text-xs font-semibold text-right whitespace-nowrap bg-secondary">VWAP</TableHead>
                <TableHead className="text-xs font-semibold text-right whitespace-nowrap bg-secondary">CE OI</TableHead>
                <TableHead className="text-xs font-semibold text-right whitespace-nowrap bg-secondary">PE OI</TableHead>
                <TableHead className="text-xs font-semibold text-right whitespace-nowrap bg-secondary">PCR OI</TableHead>
                <TableHead className="text-xs font-semibold text-right whitespace-nowrap bg-secondary">CE COI</TableHead>
                <TableHead className="text-xs font-semibold text-right whitespace-nowrap bg-secondary">PE COI</TableHead>
                <TableHead className="text-xs font-semibold text-right whitespace-nowrap bg-secondary">PCR COI</TableHead>
                <TableHead className="text-xs font-semibold text-center whitespace-nowrap bg-secondary">Sentiment</TableHead>
                <TableHead className="text-xs font-semibold text-center whitespace-nowrap bg-secondary">VWAP Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.map((row, index) => {
                const sentiment = getSentiment(row.PCR_OI);
                const vwapStatus = getVWAPStatus(row.underlyning, row.VWAP);
                return (
                  <TableRow key={row.time} className={`text-xs ${index === 0 ? 'bg-primary/5' : ''}`}>
                    <TableCell className="font-medium">{row.time}</TableCell>
                    <TableCell className="text-right">{row.underlyning.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {row.displayFuture.toFixed(2)}
                      {row.isFutureBorrowed && <span className="text-yellow-400">*</span>}
                    </TableCell>
                    <TableCell className="text-right">{row.VWAP.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-call">{formatNumber(row.CE_OI)}</TableCell>
                    <TableCell className="text-right text-put">{formatNumber(row.PE_OI)}</TableCell>
                    <TableCell className={`text-right font-medium ${row.PCR_OI < 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {row.PCR_OI.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right ${row.CE_COI >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatNumber(row.CE_COI)}
                    </TableCell>
                    <TableCell className={`text-right ${row.PE_COI >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatNumber(row.PE_COI)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${row.PCR_COI < 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {row.PCR_COI.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-center ${sentiment.color}`}>{sentiment.text}</TableCell>
                    <TableCell className={`text-center ${vwapStatus.color}`}>{vwapStatus.text}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
