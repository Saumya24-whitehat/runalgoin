import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { fetchTechnicalsData, StockTechnical } from "@/services/indexDetailApi";

interface IndexDetailTechnicalsProps {
  indexSymbol: string;
}

const timeframes = [
  { key: 'D', label: 'D' },
  { key: 'PD', label: 'PD' },
  { key: 'W', label: 'W' },
  { key: 'M', label: 'M' },
  { key: '52W', label: '52W' },
];

const indicators = [
  { key: 'AT', label: 'AT' },
  { key: 'SMA', label: 'SMA' },
  { key: 'EMA', label: 'EMA' },
  { key: 'PIVOT', label: 'PIVOT' },
  { key: 'BB', label: 'BB' },
  { key: 'PSAR', label: 'PSAR' },
  { key: 'ICHK', label: 'ICHK' },
  { key: 'RSI', label: 'RSI' },
  { key: 'CCI', label: 'CCI' },
  { key: 'MFI', label: 'MFI' },
  { key: 'ROC', label: 'ROC' },
  { key: 'STOCH', label: 'STOCH' },
  { key: 'WR', label: 'W%R' },
];

export const IndexDetailTechnicals = ({ indexSymbol }: IndexDetailTechnicalsProps) => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<StockTechnical[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState('D');
  const [activeIndicator, setActiveIndicator] = useState('AT');

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

  const handleStockClick = (ticker: string) => {
    navigate(`/jackpot-detail?symbol=${ticker}`);
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
      {/* Timeframe Buttons */}
      <div className="flex flex-wrap gap-2">
        {timeframes.map((tf) => (
          <Button
            key={tf.key}
            size="sm"
            variant={activeTimeframe === tf.key ? 'default' : 'outline'}
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
            variant={activeIndicator === ind.key ? 'default' : 'outline'}
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
              <TableHead className="text-primary w-[60%]">Symbol</TableHead>
              <TableHead className="text-right w-[20%]">LTP</TableHead>
              <TableHead className="text-right w-[20%]">Chg. %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocks.map((stock) => {
              const pctChange = stock.change || 0;
              const rangePosition = stock.low && stock.high && stock.close
                ? Math.min(100, Math.max(0, ((stock.close - stock.low) / (stock.high - stock.low)) * 100))
                : 50;
              
              return (
                <TableRow
                  key={stock.name}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => handleStockClick(stock.name)}
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {stock.name.substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-primary truncate mb-2">
                          {stock.description || stock.name}
                        </div>
                        {/* Range bar with labels */}
                        <div className="relative">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Low: {stock.low?.toFixed(1) || '-'}</span>
                            <span>High: {stock.high?.toFixed(1) || '-'}</span>
                          </div>
                          <div className="relative h-1.5 w-full max-w-[300px] bg-gradient-to-r from-destructive/40 via-primary to-success/40 rounded-full">
                            {/* Position marker */}
                            <div
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                              style={{ left: `${rangePosition}%` }}
                            >
                              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-primary" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-base">
                    {stock.close?.toFixed(2) || '-'}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-base ${pctChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {stocks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No technical data available
        </div>
      )}
    </div>
  );
};
