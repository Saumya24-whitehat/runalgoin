import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { fetchBreadthData } from "@/services/indexDetailApi";

interface IndexDetailBreadthProps {
  indexSymbol: string;
}

interface BreadthDataItem {
  date: string;
  content: any[];
}

export const IndexDetailBreadth = ({ indexSymbol }: IndexDetailBreadthProps) => {
  const [data, setData] = useState<BreadthDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'breadth' | 'periodicHL' | 'advDec'>('breadth');
  const [displayMode, setDisplayMode] = useState<'percent' | 'count'>('percent');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const result = await fetchBreadthData(indexSymbol);
      if (result) {
        // Transform the data into array format
        const dataArray: BreadthDataItem[] = [];
        if (Array.isArray(result)) {
          result.forEach((item: any) => {
            if (item.date && item.content) {
              dataArray.push({
                date: item.date,
                content: item.content
              });
            }
          });
        }
        setData(dataArray);
      }
      setLoading(false);
    };

    loadData();
  }, [indexSymbol]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate percentages for SMA levels (mock data based on reference)
  const breadthData = [
    { date: '2026-01-03', close: 0, rs55: 0, sma20: 76, sma50: 64, sma100: 62, sma200: 74 },
    { date: '2026-01-02', close: 0, rs55: 0, sma20: 76, sma50: 64, sma100: 62, sma200: 74 },
    { date: '2026-01-01', close: 0, rs55: 0, sma20: 68, sma50: 54, sma100: 60, sma200: 68 },
    { date: '2025-12-31', close: 0, rs55: 0, sma20: 66, sma50: 58, sma100: 62, sma200: 66 },
    { date: '2025-12-30', close: 0, rs55: 0, sma20: 46, sma50: 50, sma100: 58, sma200: 66 },
    { date: '2025-12-29', close: 0, rs55: 0, sma20: 44, sma50: 46, sma100: 60, sma200: 70 },
    { date: '2025-12-28', close: 0, rs55: 0, sma20: 56, sma50: 50, sma100: 60, sma200: 70 },
  ];

  const getColorForValue = (value: number) => {
    if (value >= 70) return 'bg-emerald-600 text-white';
    if (value >= 50) return 'bg-amber-500 text-white';
    if (value >= 30) return 'bg-orange-500 text-white';
    return 'bg-red-600 text-white';
  };

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={activeSubTab === 'breadth' ? 'default' : 'outline'}
          onClick={() => setActiveSubTab('breadth')}
        >
          Breadth
        </Button>
        <Button
          size="sm"
          variant={activeSubTab === 'periodicHL' ? 'default' : 'outline'}
          onClick={() => setActiveSubTab('periodicHL')}
        >
          Periodic H/L
        </Button>
        <Button
          size="sm"
          variant={activeSubTab === 'advDec' ? 'default' : 'outline'}
          onClick={() => setActiveSubTab('advDec')}
        >
          Adv/Dec
        </Button>
      </div>

      {/* Display Mode */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Stocks Above</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={displayMode === 'percent' ? 'default' : 'outline'}
            onClick={() => setDisplayMode('percent')}
          >
            Per.(%)
          </Button>
          <Button
            size="sm"
            variant={displayMode === 'count' ? 'default' : 'outline'}
            onClick={() => setDisplayMode('count')}
          >
            Count
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Date Close</TableHead>
              <TableHead className="text-center">RS 55 &gt; 0</TableHead>
              <TableHead className="text-center">SMA 20</TableHead>
              <TableHead className="text-center">SMA 50</TableHead>
              <TableHead className="text-center">SMA 100</TableHead>
              <TableHead className="text-center">SMA 200</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breadthData.map((row) => (
              <TableRow key={row.date}>
                <TableCell>
                  <div className="text-primary font-medium">{row.date}</div>
                  <div className="text-xs text-muted-foreground">{row.close.toFixed(2)}</div>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getColorForValue(row.rs55)}`}>
                    {displayMode === 'percent' ? `${row.rs55}%` : Math.round(row.rs55 * 0.5)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getColorForValue(row.sma20)}`}>
                    {displayMode === 'percent' ? `${row.sma20}%` : Math.round(row.sma20 * 0.5)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getColorForValue(row.sma50)}`}>
                    {displayMode === 'percent' ? `${row.sma50}%` : Math.round(row.sma50 * 0.5)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getColorForValue(row.sma100)}`}>
                    {displayMode === 'percent' ? `${row.sma100}%` : Math.round(row.sma100 * 0.5)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getColorForValue(row.sma200)}`}>
                    {displayMode === 'percent' ? `${row.sma200}%` : Math.round(row.sma200 * 0.5)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
