import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { 
  fetchStockConsolidated, 
  fetchAdditionalFinancialInfo,
  ConsolidatedData, 
  FinancialRow,
  AdditionalFinancialData 
} from "@/services/stockDetailApi";
import { cn } from "@/lib/utils";

interface StockDetailFinancialsProps {
  symbol: string;
}

interface ExpandedRows {
  [key: string]: {
    loading: boolean;
    data: AdditionalFinancialData | null;
  };
}

const FinancialTable = ({ 
  tableData, 
  title, 
  subtitle,
  resultType,
  onResultTypeChange,
  showResultTypeToggle = false,
  companyId,
  section
}: { 
  tableData: FinancialRow[];
  title: string;
  subtitle?: string;
  resultType?: "quarterly" | "yearly";
  onResultTypeChange?: (type: "quarterly" | "yearly") => void;
  showResultTypeToggle?: boolean;
  companyId?: string;
  section?: 'quarters' | 'years';
}) => {
  const [expandedRows, setExpandedRows] = useState<ExpandedRows>({});

  const columns = tableData && tableData.length > 0 
    ? Object.keys(tableData[0]).filter(key => key !== 'Unnamed: 0')
    : [];

  const handleRowClick = async (rowLabel: string, hasPlus: boolean) => {
    if (!hasPlus || !companyId || !section) return;

    const rowKey = rowLabel;
    
    // If already expanded, collapse it
    if (expandedRows[rowKey]?.data) {
      setExpandedRows(prev => {
        const newState = { ...prev };
        delete newState[rowKey];
        return newState;
      });
      return;
    }

    // Start loading
    setExpandedRows(prev => ({
      ...prev,
      [rowKey]: { loading: true, data: null }
    }));

    // Fetch data - use the original label with the space before +
    const parentParam = rowLabel + " +";
    const data = await fetchAdditionalFinancialInfo(companyId, parentParam, section);

    setExpandedRows(prev => ({
      ...prev,
      [rowKey]: { loading: false, data }
    }));
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium text-foreground">{title}</CardTitle>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {showResultTypeToggle && onResultTypeChange && (
            <TabsList className="h-8">
              <TabsTrigger 
                value="quarterly" 
                className="text-xs h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                onClick={() => onResultTypeChange("quarterly")}
                data-state={resultType === "quarterly" ? "active" : "inactive"}
              >
                Quarterly
              </TabsTrigger>
              <TabsTrigger 
                value="yearly" 
                className="text-xs h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                onClick={() => onResultTypeChange("yearly")}
                data-state={resultType === "yearly" ? "active" : "inactive"}
              >
                Yearly
              </TabsTrigger>
            </TabsList>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto relative">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs font-medium sticky left-0 bg-card z-10 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  PARTICULARS
                </TableHead>
                {columns.map((col) => (
                  <TableHead key={col} className="text-muted-foreground text-xs font-medium text-right min-w-[90px] whitespace-nowrap">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData?.filter(row => row['Unnamed: 0'] !== 'Raw PDF').map((row, idx) => {
                const rawLabel = String(row['Unnamed: 0']);
                const hasPlus = rawLabel.includes('+');
                const label = rawLabel.replace(' +', '').trim();
                const isExpanded = !!expandedRows[label]?.data;
                const isLoading = expandedRows[label]?.loading;
                const childData = expandedRows[label]?.data;
                
                return (
                  <>
                    <TableRow key={idx} className="border-border hover:bg-muted/30">
                      <TableCell 
                        className={cn(
                          "font-medium text-sm text-foreground sticky left-0 bg-card z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                          hasPlus && "cursor-pointer hover:text-primary"
                        )}
                        onClick={() => handleRowClick(label, hasPlus)}
                      >
                        <div className="flex items-center gap-2">
                          {hasPlus && (
                            <span className="flex-shrink-0">
                              {isLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </span>
                          )}
                          <span>{label}</span>
                        </div>
                      </TableCell>
                      {columns.map((col) => {
                        const value = row[col];
                        const isNegative = String(value).startsWith('-');
                        
                        return (
                          <TableCell 
                            key={col} 
                            className={cn(
                              "text-right text-sm whitespace-nowrap",
                              isNegative ? 'text-destructive' : 'text-foreground'
                            )}
                          >
                            {value ?? '-'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    
                    {/* Child rows when expanded */}
                    {isExpanded && childData && Object.entries(childData).map(([childLabel, childValues], childIdx) => (
                      <TableRow 
                        key={`${idx}-child-${childIdx}`} 
                        className="border-border bg-muted/20 hover:bg-muted/40"
                      >
                        <TableCell className="font-normal text-sm text-muted-foreground sticky left-0 bg-muted/20 z-10 pl-8 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          {childLabel}
                        </TableCell>
                        {columns.map((col) => {
                          const value = childValues[col] ?? '-';
                          const isNegative = String(value).startsWith('-');
                          
                          return (
                            <TableCell 
                              key={col} 
                              className={cn(
                                "text-right text-sm whitespace-nowrap",
                                isNegative ? 'text-destructive' : 'text-muted-foreground'
                              )}
                            >
                              {value}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export const StockDetailFinancials = ({ symbol }: StockDetailFinancialsProps) => {
  const [data, setData] = useState<ConsolidatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultType, setResultType] = useState<"quarterly" | "yearly">("quarterly");
  const [companyId, setCompanyId] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await fetchStockConsolidated(symbol);
      setData(result);
      
      // Extract company_id from the data if available (you may need to adjust based on actual API response)
      // For now, we'll use a mapping or fetch it from the overview endpoint
      // The company_id is typically available in the overview data
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: overviewData } = await supabase.functions.invoke('stock-detail-data', {
        body: { symbol, endpoint: 'overview' }
      });
      if (overviewData?.company_id) {
        setCompanyId(String(overviewData.company_id));
      }
      
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
  const section = resultType === "quarterly" ? "quarters" : "years";

  return (
    <div className="space-y-4">
      <Tabs value={resultType} onValueChange={(v) => setResultType(v as "quarterly" | "yearly")}>
        <FinancialTable 
          tableData={tableData} 
          title={resultType === "quarterly" ? "Quarterly Results" : "Yearly Results"}
          subtitle="Consolidated Figures in Rs. Crores"
          resultType={resultType}
          onResultTypeChange={setResultType}
          showResultTypeToggle={true}
          companyId={companyId}
          section={section}
        />
      </Tabs>

      {/* Balance Sheet */}
      {data.Table_7 && (
        <FinancialTable 
          tableData={data.Table_7}
          title="Balance Sheet"
          subtitle="Figures in Rs. Crores"
          companyId={companyId}
          section="years"
        />
      )}

      {/* Cash Flow */}
      {data.Table_8 && (
        <FinancialTable 
          tableData={data.Table_8}
          title="Cash Flow"
          subtitle="Figures in Rs. Crores"
          companyId={companyId}
          section="years"
        />
      )}
    </div>
  );
};