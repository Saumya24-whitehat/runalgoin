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
              <TableHead className="text-primary">Symbol</TableHead>
              <TableHead className="text-right">LTP</TableHead>
              <TableHead className="text-right">Chg. %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocks.map((stock) => {
              const pctChange = stock.change || 0;
              
              return (
                <TableRow
                  key={stock.name}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => handleStockClick(stock.name)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold">
                        {stock.name.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-primary">{stock.description || stock.name}</div>
                        {/* Range bar */}
                        <div className="mt-1 relative h-2 w-48 bg-gradient-to-r from-muted via-primary to-muted rounded">
                          <div className="absolute text-[9px] -top-3 left-0 text-muted-foreground">
                            Low: {stock.low?.toFixed(1) || '-'}
                          </div>
                          <div className="absolute text-[9px] -top-3 right-0 text-muted-foreground">
                            High: {stock.high?.toFixed(1) || '-'}
                          </div>
                          {stock.low && stock.high && stock.close && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground"
                              style={{
                                left: `${Math.min(100, Math.max(0, ((stock.close - stock.low) / (stock.high - stock.low)) * 100))}%`
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {stock.close?.toFixed(2) || '-'}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${pctChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
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
