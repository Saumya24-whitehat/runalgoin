import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { fetchStockConsolidated, ConsolidatedData, FinancialRow } from "@/services/stockDetailApi";

interface StockDetailFinancialsProps {
  symbol: string;
}

export const StockDetailFinancials = ({ symbol }: StockDetailFinancialsProps) => {
  const [data, setData] = useState<ConsolidatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultType, setResultType] = useState<"quarterly" | "yearly">("quarterly");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await fetchStockConsolidated(symbol);
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
    return (
      <div className="text-center text-muted-foreground py-8">
        No financial data available for {symbol}
      </div>
    );
  }

  const tableData = resultType === "quarterly" ? data.Table_1 : data.Table_2;
  
  // Get columns (excluding 'Unnamed: 0')
  const columns = tableData && tableData.length > 0 
    ? Object.keys(tableData[0]).filter(key => key !== 'Unnamed: 0')
    : [];

  const renderFinancialTable = (tableData: FinancialRow[], title: string) => (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium text-foreground">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">Consolidated Figures in Rs. Crores</p>
          </div>
          <TabsList className="h-8">
            <TabsTrigger 
              value="quarterly" 
              className="text-xs h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              onClick={() => setResultType("quarterly")}
            >
              Quarterly
            </TabsTrigger>
            <TabsTrigger 
              value="yearly" 
              className="text-xs h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              onClick={() => setResultType("yearly")}
            >
              Yearly
            </TabsTrigger>
          </TabsList>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs font-medium sticky left-0 bg-card min-w-[140px]">
                  PARTICULARS
                </TableHead>
                {columns.map((col) => (
                  <TableHead key={col} className="text-muted-foreground text-xs font-medium text-right min-w-[90px]">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData?.filter(row => row['Unnamed: 0'] !== 'Raw PDF').map((row, idx) => {
                const label = String(row['Unnamed: 0']).replace(' +', '');
                const isPercentRow = label.includes('%');
                
                return (
                  <TableRow key={idx} className="border-border hover:bg-muted/30">
                    <TableCell className="font-medium text-sm text-foreground sticky left-0 bg-card">
                      {label}
                    </TableCell>
                    {columns.map((col) => {
                      const value = row[col];
                      const isNegative = String(value).startsWith('-');
                      
                      return (
                        <TableCell 
                          key={col} 
                          className={`text-right text-sm ${
                            isNegative ? 'text-red-500' : 'text-foreground'
                          }`}
                        >
                          {value ?? '-'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Tabs value={resultType} onValueChange={(v) => setResultType(v as "quarterly" | "yearly")}>
        {renderFinancialTable(tableData, resultType === "quarterly" ? "Quarterly Results" : "Yearly Results")}
      </Tabs>

      {/* Balance Sheet */}
      {data.Table_7 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-foreground">Balance Sheet</CardTitle>
            <p className="text-xs text-muted-foreground">Figures in Rs. Crores</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs font-medium sticky left-0 bg-card min-w-[140px]">
                      PARTICULARS
                    </TableHead>
                    {Object.keys(data.Table_7[0] || {}).filter(k => k !== 'Unnamed: 0').map((col) => (
                      <TableHead key={col} className="text-muted-foreground text-xs font-medium text-right min-w-[90px]">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.Table_7.map((row, idx) => {
                    const label = String(row['Unnamed: 0']).replace(' +', '');
                    const cols = Object.keys(row).filter(k => k !== 'Unnamed: 0');
                    
                    return (
                      <TableRow key={idx} className="border-border hover:bg-muted/30">
                        <TableCell className="font-medium text-sm text-foreground sticky left-0 bg-card">
                          {label}
                        </TableCell>
                        {cols.map((col) => (
                          <TableCell key={col} className="text-right text-sm text-foreground">
                            {row[col]?.toLocaleString() ?? '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Cash Flow */}
      {data.Table_8 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-foreground">Cash Flow</CardTitle>
            <p className="text-xs text-muted-foreground">Figures in Rs. Crores</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs font-medium sticky left-0 bg-card min-w-[180px]">
                      PARTICULARS
                    </TableHead>
                    {Object.keys(data.Table_8[0] || {}).filter(k => k !== 'Unnamed: 0').map((col) => (
                      <TableHead key={col} className="text-muted-foreground text-xs font-medium text-right min-w-[90px]">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.Table_8.map((row, idx) => {
                    const label = String(row['Unnamed: 0']).replace(' +', '');
                    const cols = Object.keys(row).filter(k => k !== 'Unnamed: 0');
                    
                    return (
                      <TableRow key={idx} className="border-border hover:bg-muted/30">
                        <TableCell className="font-medium text-sm text-foreground sticky left-0 bg-card">
                          {label}
                        </TableCell>
                        {cols.map((col) => {
                          const value = row[col];
                          const isNegative = Number(value) < 0;
                          
                          return (
                            <TableCell 
                              key={col} 
                              className={`text-right text-sm ${isNegative ? 'text-red-500' : 'text-foreground'}`}
                            >
                              {value?.toLocaleString() ?? '-'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
