import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SectorData {
  stock_column: {
    pk: number;
    get_full_name: string;
    absolute_url: string;
    NSEcode: string;
    BSEcode: string;
    ISIN: string;
  };
  week_changeP: number;
  currentPrice: number;
  companies_count: number;
  advance: { value: number; color: string };
  decline: { value: number; color: string };
  adv_dec_ratio: { value: number | null; color: string | null };
  abs_score: number;
  yearHighLow: {
    low: number;
    high: number;
    ltp: number;
    changeP: number;
  };
  day_changeP: number;
  month_changeP: number;
  qtr_changeP: number;
  halfyr_changeP: number;
  year_changeP: number;
  three_year_changeP: number;
  five_year_changeP: number;
  ten_year_changeP: number;
  live_pe: number | null;
  PB: number | null;
  DIV: number | null;
  eps: number | null;
}

type TimePeriod = "1D" | "1W" | "1M" | "3M" | "1Y";
type SortColumn = "name" | "price" | "change" | "advance" | "decline" | "ratio";
type SortDirection = "asc" | "desc";

const timePeriodMap: Record<TimePeriod, string> = {
  "1D": "day",
  "1W": "week",
  "1M": "month",
  "3M": "quarter",
  "1Y": "year",
};

const SectorAnalysis = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [sectorsData, setSectorsData] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("1W");
  const [exchange, setExchange] = useState<"NSE" | "BSE">("NSE");
  const [sortColumn, setSortColumn] = useState<SortColumn>("change");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const activeRange = timePeriodMap[timePeriod];
      const { data, error } = await supabase.functions.invoke("indices-data", {
        body: { activeRange },
      });

      if (!error && data?.body?.index?.tableData) {
        setSectorsData(data.body.index.tableData);
      }
    } catch (err) {
      console.error("Error fetching sectors data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timePeriod]);

  const getChangeForPeriod = (sector: SectorData): number => {
    switch (timePeriod) {
      case "1D":
        return sector.day_changeP;
      case "1W":
        return sector.week_changeP;
      case "1M":
        return sector.month_changeP;
      case "3M":
        return sector.qtr_changeP;
      case "1Y":
        return sector.year_changeP;
      default:
        return sector.week_changeP;
    }
  };

  const filteredAndSortedData = () => {
    let filtered = sectorsData.filter((sector) => {
      const name = sector.stock_column.get_full_name.toUpperCase();
      if (exchange === "NSE") {
        return name.includes("NIFTY");
      } else {
        return name.includes("BSE") || name.includes("SENSEX");
      }
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortColumn) {
        case "name":
          aVal = a.stock_column.get_full_name;
          bVal = b.stock_column.get_full_name;
          break;
        case "price":
          aVal = a.currentPrice || 0;
          bVal = b.currentPrice || 0;
          break;
        case "change":
          aVal = getChangeForPeriod(a);
          bVal = getChangeForPeriod(b);
          break;
        case "advance":
          aVal = a.advance?.value || 0;
          bVal = b.advance?.value || 0;
          break;
        case "decline":
          aVal = a.decline?.value || 0;
          bVal = b.decline?.value || 0;
          break;
        case "ratio":
          aVal = a.adv_dec_ratio?.value || 0;
          bVal = b.adv_dec_ratio?.value || 0;
          break;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return filtered;
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-success";
    if (change < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const formatNumber = (num: number | null | undefined, decimals = 2) => {
    if (num === null || num === undefined) return "-";
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const processedData = filteredAndSortedData();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50">
          <TickerRibbon />
          <Navbar />
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Sector Analysis</h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Time Period Tabs */}
          <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
            <TabsList>
              {(["1D", "1W", "1M", "3M", "1Y"] as TimePeriod[]).map((period) => (
                <TabsTrigger key={period} value={period}>
                  {period}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Exchange Toggle */}
          <div className="flex items-center gap-1">
            <Button
              variant={exchange === "NSE" ? "default" : "outline"}
              size="sm"
              onClick={() => setExchange("NSE")}
            >
              NSE
            </Button>
            <Button
              variant={exchange === "BSE" ? "default" : "outline"}
              size="sm"
              onClick={() => setExchange("BSE")}
            >
              BSE
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : processedData.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-muted-foreground">No data available</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#0a3d2e] text-white">
                      <th
                        onClick={() => handleSort("name")}
                        className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[#0d4a38] transition-colors"
                      >
                        Sector Name {getSortIcon("name")}
                      </th>
                      <th
                        onClick={() => handleSort("price")}
                        className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[#0d4a38] transition-colors"
                      >
                        LTP {getSortIcon("price")}
                      </th>
                      <th
                        onClick={() => handleSort("change")}
                        className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[#0d4a38] transition-colors"
                      >
                        Change % {getSortIcon("change")}
                      </th>
                      <th
                        onClick={() => handleSort("advance")}
                        className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[#0d4a38] transition-colors"
                      >
                        Advances {getSortIcon("advance")}
                      </th>
                      <th
                        onClick={() => handleSort("decline")}
                        className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[#0d4a38] transition-colors"
                      >
                        Declines {getSortIcon("decline")}
                      </th>
                      <th
                        onClick={() => handleSort("ratio")}
                        className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[#0d4a38] transition-colors"
                      >
                        A/D Ratio {getSortIcon("ratio")}
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider">
                        Breadth
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider">
                        52W High
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider">
                        52W Low
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.map((sector, idx) => {
                      const change = getChangeForPeriod(sector);
                      const advanceVal = sector.advance?.value || 0;
                      const declineVal = sector.decline?.value || 0;
                      const total = advanceVal + declineVal;
                      const advancePercent = total > 0 ? (advanceVal / total) * 100 : 50;

                      return (
                        <tr
                          key={idx}
                          className="border-b border-border hover:bg-secondary/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="font-medium text-foreground">
                              {sector.stock_column.get_full_name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-semibold text-foreground">
                              {formatNumber(sector.currentPrice)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`flex items-center justify-end gap-1 font-medium ${getChangeColor(change)}`}>
                              {change > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : change < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : null}
                              {change >= 0 ? "+" : ""}
                              {formatNumber(change)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-success font-medium">{advanceVal}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-destructive font-medium">{declineVal}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={
                                (sector.adv_dec_ratio?.value || 0) >= 1
                                  ? "text-success font-medium"
                                  : "text-destructive font-medium"
                              }
                            >
                              {sector.adv_dec_ratio?.value !== null
                                ? formatNumber(sector.adv_dec_ratio?.value)
                                : "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center">
                              <div className="w-24 h-3 bg-muted rounded-full overflow-hidden flex">
                                <div
                                  className="h-full bg-success transition-all"
                                  style={{ width: `${advancePercent}%` }}
                                />
                                <div
                                  className="h-full bg-destructive transition-all"
                                  style={{ width: `${100 - advancePercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-muted-foreground text-sm">
                              {formatNumber(sector.yearHighLow?.high)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-muted-foreground text-sm">
                              {formatNumber(sector.yearHighLow?.low)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default SectorAnalysis;
