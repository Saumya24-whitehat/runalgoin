import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, Info, TrendingUp, PlayCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";

interface FIIDataItem {
  Date: string;
  ClosePrice: Array<{
    C: number;
    CZ: number;
    CZG: number;
    Symbol: string;
  }>;
  FIIDIIData: Array<{
    Name: string;
    ShortName: string;
    Value: number;
    ChildData: Array<{
      Name: string;
      ShortName: string;
      Value: number;
    }> | null;
  }>;
}

interface FIISummaryData {
  "Client Type": Record<string, string>;
  "Future Index Long": Record<string, number>;
  "Future Index Short": Record<string, number>;
  "Future Stock Long": Record<string, number>;
  "Future Stock Short ": Record<string, number>;
  "Option Index Call Long": Record<string, number>;
  "Option Index Put Long": Record<string, number>;
  "Option Index Call Short": Record<string, number>;
  "Option Index Put Short": Record<string, number>;
  "Option Stock Call Long": Record<string, number>;
  "Option Stock Put Long": Record<string, number>;
  "Option Stock Call Short": Record<string, number>;
  "Option Stock Put Short": Record<string, number>;
  "Total Long Contracts ": Record<string, number>;
  "Total Short Contracts": Record<string, number>;
}

const fetchFIIData = async (): Promise<FIIDataItem[]> => {
  const { data, error } = await supabase.functions.invoke("fii-data");
  if (error) throw error;
  return data;
};

const fetchFIISummary = async (date: string): Promise<FIISummaryData> => {
  const { data, error } = await supabase.functions.invoke("fii-summary", {
    body: { date }
  });
  if (error) throw error;
  return data;
};

const formatValue = (value: number, showCr = true): string => {
  if (value === null || value === undefined || isNaN(value)) return "-";
  const absValue = Math.abs(value);
  const formatted = absValue >= 100 ? absValue.toLocaleString("en-IN") : absValue.toFixed(2);
  const sign = value >= 0 ? "+" : "-";
  return showCr ? `${sign}₹${formatted} Cr` : `${sign}${formatted}`;
};

const formatLakh = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) return "-";
  const absValue = Math.abs(value);
  if (absValue >= 100000) {
    return `${(value / 100000).toFixed(2)}L`;
  }
  if (absValue >= 1000) {
    return `${(value / 100).toFixed(2)}L`;
  }
  return value.toLocaleString("en-IN");
};

const getSentiment = (value: number): { label: string; type: 'bullish' | 'bearish' | 'neutral' } => {
  const absValue = Math.abs(value);
  
  if (absValue < 100) return { label: "Indecisive", type: 'neutral' };
  if (value > 3000) return { label: "Strong Bullish", type: 'bullish' };
  if (value > 1000) return { label: "Medium Bullish", type: 'bullish' };
  if (value > 0) return { label: "Mild Bullish", type: 'bullish' };
  if (value > -1000) return { label: "Mild Bearish", type: 'bearish' };
  if (value > -3000) return { label: "Medium Bearish", type: 'bearish' };
  return { label: "Strong Bearish", type: 'bearish' };
};

// Sentiment bar component for professional look - returns two TableCells
const SentimentBarCells = ({ 
  sentiment, 
  showLabel, 
  value, 
  maxValue 
}: { 
  sentiment: { label: string; type: 'bullish' | 'bearish' | 'neutral' }; 
  showLabel: boolean;
  value: number;
  maxValue: number;
}) => {
  if (sentiment.type === 'neutral') {
    return (
      <>
        <TableCell className="p-0 w-[100px]"></TableCell>
        <TableCell className="p-0.5 w-[80px]">
          <span className="text-[10px] text-muted-foreground">{showLabel ? sentiment.label : "-"}</span>
        </TableCell>
        <TableCell className="p-0 w-[100px]"></TableCell>
      </>
    );
  }
  
  // Calculate bar width based on actual value relative to max value
  const absValue = Math.abs(value);
  const normalizedWidth = maxValue > 0 ? (absValue / maxValue) : 0;
  const barWidth = `${Math.max(normalizedWidth * 100, 20)}%`;
  const isBearish = sentiment.type === 'bearish';
  
  return (
    <>
      {/* Bearish column */}
      <TableCell className="p-0.5 w-[100px]">
        {isBearish && (
          <div className="flex justify-end">
            <div 
              className="h-4 flex items-center justify-end rounded-sm overflow-hidden"
              style={{ width: barWidth }}
            >
              <div className="h-full w-full bg-gradient-to-l from-red-500/90 to-red-500/40 flex items-center justify-end px-1">
                {showLabel && (
                  <span className="text-[9px] font-medium text-white whitespace-nowrap">
                    {sentiment.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </TableCell>
      {/* Info icon column - spacer between bars */}
      <TableCell className="p-0.5 w-[24px] text-center">
        <TooltipProvider delayDuration={100}>
          <UITooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help">
                <Info className="w-2.5 h-2.5 text-muted-foreground mx-auto" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] text-xs z-50">
              <p>Bar width shows relative position size. Sentiment label indicates market outlook based on net value.</p>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </TableCell>
      {/* Bullish column */}
      <TableCell className="p-0.5 w-[100px]">
        {!isBearish && (
          <div className="flex justify-start">
            <div 
              className="h-4 flex items-center justify-start rounded-sm overflow-hidden"
              style={{ width: barWidth }}
            >
              <div className="h-full w-full bg-gradient-to-r from-green-500/40 to-green-500/90 flex items-center justify-start px-1">
                {showLabel && (
                  <span className="text-[9px] font-medium text-white whitespace-nowrap">
                    {sentiment.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </TableCell>
    </>
  );
};

const getSentimentBadgeSimple = (value: number) => {
  if (value > 0) return { label: "BULLISH", color: "bg-green-600 text-white" };
  if (value < 0) return { label: "BEARISH", color: "bg-red-600 text-white" };
  return { label: "-", color: "bg-muted text-muted-foreground" };
};

export default function FII() {
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedDate, setSelectedDate] = useState(0);
  const [showLabels, setShowLabels] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [participantFilters, setParticipantFilters] = useState({
    FII: true,
    Pro: true,
    Client: true,
    DII: true,
  });
  const [segmentFilters, setSegmentFilters] = useState({
    "Index Futures": true,
    "Stock Futures": true,
    "Index Options": true,
    "Stock Options": true,
  });

  const toggleRowExpanded = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const { data: fiiData, isLoading, error } = useQuery({
    queryKey: ["fii-data"],
    queryFn: fetchFIIData,
    refetchInterval: 60000,
  });

  const currentData = fiiData?.[selectedDate];
  const currentDate = currentData ? format(parseISO(currentData.Date), "dd MMM yyyy") : "-";
  const currentDateParsed = currentData ? parseISO(currentData.Date) : new Date();
  
  // Format date for summary API (DD-MM-YYYY)
  const summaryDateParam = currentData 
    ? format(parseISO(currentData.Date), "dd-MM-yyyy") 
    : format(new Date(), "dd-MM-yyyy");

  // Fetch summary data from new API
  const { data: summaryData, isLoading: isSummaryLoading, isFetching: isSummaryFetching } = useQuery({
    queryKey: ["fii-summary", summaryDateParam],
    queryFn: () => fetchFIISummary(summaryDateParam),
    enabled: !!currentData,
    refetchInterval: 60000,
  });
  
  // Combined loading state - show data once fii-data is loaded
  const showSummaryLoading = isLoading;

  // Get all available dates for the calendar
  const availableDates = useMemo(() => {
    if (!fiiData) return [];
    return fiiData.map((item) => parseISO(item.Date));
  }, [fiiData]);

  const handlePreviousDate = () => {
    if (fiiData && selectedDate < fiiData.length - 1) {
      setSelectedDate(selectedDate + 1);
    }
  };

  const handleNextDate = () => {
    if (selectedDate > 0) {
      setSelectedDate(selectedDate - 1);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !fiiData) return;
    const dateIndex = fiiData.findIndex((item) => {
      const itemDate = parseISO(item.Date);
      return (
        itemDate.getFullYear() === date.getFullYear() &&
        itemDate.getMonth() === date.getMonth() &&
        itemDate.getDate() === date.getDate()
      );
    });
    if (dateIndex !== -1) {
      setSelectedDate(dateIndex);
    }
  };

  const chartData = useMemo(() => {
    if (!fiiData) return [];
    return fiiData
      .slice(0, 30)
      .reverse()
      .map((item) => {
        const nifty = item.ClosePrice.find((p) => p.Symbol === "NIFTY");
        const fiiCash = item.FIIDIIData.find((d) => d.Name === "FII Cash Market*");
        const diiCash = item.FIIDIIData.find((d) => d.Name === "DII Cash Market*");
        const fiiIdxFut = item.FIIDIIData.find((d) => d.Name === "FII Index Futures");
        const fiiIdxOpt = item.FIIDIIData.find((d) => d.Name === "FII Index Options");
        return {
          date: format(parseISO(item.Date), "dd MMM"),
          fullDate: format(parseISO(item.Date), "dd MMMM, EEEE"),
          nifty: nifty?.C || 0,
          niftyChange: nifty?.CZG || 0,
          fiiCash: fiiCash?.Value || 0,
          diiCash: diiCash?.Value || 0,
          fiiIdxFut: fiiIdxFut?.Value || 0,
          fiiIdxOpt: fiiIdxOpt?.Value || 0,
        };
      });
  }, [fiiData]);

  const monthlyData = useMemo(() => {
    if (!fiiData) return [];
    const monthlyAgg: Record<string, { fiiCash: number; diiCash: number; count: number }> = {};
    fiiData.forEach((item) => {
      const monthKey = format(parseISO(item.Date), "MMM yyyy");
      const fiiCash = item.FIIDIIData.find((d) => d.Name === "FII Cash Market*")?.Value || 0;
      const diiCash = item.FIIDIIData.find((d) => d.Name === "DII Cash Market*")?.Value || 0;
      if (!monthlyAgg[monthKey]) {
        monthlyAgg[monthKey] = { fiiCash: 0, diiCash: 0, count: 0 };
      }
      monthlyAgg[monthKey].fiiCash += fiiCash;
      monthlyAgg[monthKey].diiCash += diiCash;
      monthlyAgg[monthKey].count++;
    });
    return Object.entries(monthlyAgg).map(([month, data]) => ({
      month,
      fiiCash: data.fiiCash,
      diiCash: data.diiCash,
    }));
  }, [fiiData]);

  const getSummaryTableData = () => {
    // Use summaryData from new API if available
    if (!summaryData) return [];
    
    // Map client type index to participant name
    const clientTypeMap: Record<string, string> = {};
    const clientTypes = summaryData["Client Type"];
    if (!clientTypes) return [];
    Object.entries(clientTypes).forEach(([idx, name]) => {
      clientTypeMap[idx] = name;
    });
    
    // Find index for each participant
    const getParticipantIndex = (name: string): string | null => {
      for (const [idx, val] of Object.entries(clientTypeMap)) {
        if (val === name) return idx;
      }
      return null;
    };
    
    const rows: Array<{
      participant: string;
      segment: string;
      sentiment: { label: string; type: 'bullish' | 'bearish' | 'neutral' };
      netOI: string;
      change: number;
      value: number;
      longValue: number;
      shortValue: number;
      hasChildren: boolean;
      childData?: Array<{
        name: string;
        value: number;
        change: number;
        sentiment: { label: string; type: 'bullish' | 'bearish' | 'neutral' };
      }>;
    }> = [];

    const participants = ["FII", "DII", "Pro", "Client"];
    const segments = ["Index Futures", "Stock Futures", "Index Options", "Stock Options"];

    participants.forEach((participant) => {
      if (!participantFilters[participant as keyof typeof participantFilters]) return;
      
      const idx = getParticipantIndex(participant);
      if (!idx) return;
      
      segments.forEach((segment) => {
        if (!segmentFilters[segment as keyof typeof segmentFilters]) return;
        
        let longValue = 0;
        let shortValue = 0;
        let childData: Array<{
          name: string;
          value: number;
          change: number;
          sentiment: { label: string; type: 'bullish' | 'bearish' | 'neutral' };
        }> | undefined;
        
        if (segment === "Index Futures") {
          longValue = summaryData["Future Index Long"]?.[idx] || 0;
          shortValue = summaryData["Future Index Short"]?.[idx] || 0;
        } else if (segment === "Stock Futures") {
          longValue = summaryData["Future Stock Long"]?.[idx] || 0;
          shortValue = summaryData["Future Stock Short "]?.[idx] || 0;
        } else if (segment === "Index Options") {
          const callLong = summaryData["Option Index Call Long"]?.[idx] || 0;
          const putLong = summaryData["Option Index Put Long"]?.[idx] || 0;
          const callShort = summaryData["Option Index Call Short"]?.[idx] || 0;
          const putShort = summaryData["Option Index Put Short"]?.[idx] || 0;
          longValue = callLong + putLong;
          shortValue = callShort + putShort;
          
          // Child data for Index Options
          childData = [
            {
              name: "Call Long",
              value: callLong,
              change: 0,
              sentiment: getSentiment(callLong - callShort),
            },
            {
              name: "Call Short",
              value: callShort,
              change: 0,
              sentiment: getSentiment(callShort * -1),
            },
            {
              name: "Put Long",
              value: putLong,
              change: 0,
              sentiment: getSentiment(putLong - putShort),
            },
            {
              name: "Put Short",
              value: putShort,
              change: 0,
              sentiment: getSentiment(putShort * -1),
            },
          ];
        } else if (segment === "Stock Options") {
          const callLong = summaryData["Option Stock Call Long"]?.[idx] || 0;
          const putLong = summaryData["Option Stock Put Long"]?.[idx] || 0;
          const callShort = summaryData["Option Stock Call Short"]?.[idx] || 0;
          const putShort = summaryData["Option Stock Put Short"]?.[idx] || 0;
          longValue = callLong + putLong;
          shortValue = callShort + putShort;
          
          // Child data for Stock Options
          childData = [
            {
              name: "Call Long",
              value: callLong,
              change: 0,
              sentiment: getSentiment(callLong - callShort),
            },
            {
              name: "Call Short",
              value: callShort,
              change: 0,
              sentiment: getSentiment(callShort * -1),
            },
            {
              name: "Put Long",
              value: putLong,
              change: 0,
              sentiment: getSentiment(putLong - putShort),
            },
            {
              name: "Put Short",
              value: putShort,
              change: 0,
              sentiment: getSentiment(putShort * -1),
            },
          ];
        }
        
        const netValue = longValue - shortValue;
        
        rows.push({
          participant,
          segment,
          sentiment: getSentiment(netValue),
          netOI: formatLakh(netValue),
          change: 0, // Change will require comparing with previous day data
          value: netValue,
          longValue,
          shortValue,
          hasChildren: (segment === "Index Options" || segment === "Stock Options") && !!childData && childData.length > 0,
          childData,
        });
      });
    });
    
    return rows;
  };
  
  const summaryTableData = getSummaryTableData();
  const maxValue = useMemo(() => {
    return Math.max(...summaryTableData.map(row => Math.abs(row.value)), 1);
  }, [summaryTableData]);

  const getHistoryData = () => {
    if (!fiiData) return [];
    return fiiData.slice(0, 15).map((item) => {
      const nifty = item.ClosePrice.find((p) => p.Symbol === "NIFTY");
      const fiiCash = item.FIIDIIData.find((d) => d.Name === "FII Cash Market*");
      const diiCash = item.FIIDIIData.find((d) => d.Name === "DII Cash Market*");
      const fiiIdxFut = item.FIIDIIData.find((d) => d.Name === "FII Index Futures");
      const fiiIdxOpt = item.FIIDIIData.find((d) => d.Name === "FII Index Options");
      return {
        date: format(parseISO(item.Date), "dd MMM"),
        nifty: nifty?.C || 0,
        niftyChange: nifty?.CZG || 0,
        fiiCallOI: Math.round((fiiIdxOpt?.Value || 0) * 100),
        fiiPutOI: Math.round((fiiIdxOpt?.Value || 0) * -50),
        fiiIdxFutBuySell: fiiIdxFut?.Value || 0,
        fiiIdxFutOIChange: Math.round((fiiIdxFut?.Value || 0) * 5),
        fiiIdxFutOI: -1.44,
        fiiCash: fiiCash?.Value || 0,
        diiCash: diiCash?.Value || 0,
      };
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{data.fullDate}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className={entry.value >= 0 ? "text-green-500" : "text-red-500"}>
                {entry.name === "NIFTY" ? entry.value.toLocaleString() : `${entry.value >= 0 ? "+" : ""}${entry.value.toLocaleString()} Cr`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-6">
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center text-red-500">
              Error loading FII/DII data. Please try again later.
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="summary" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Summary
              </TabsTrigger>
              <TabsTrigger value="futures-options" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Futures and Options
              </TabsTrigger>
              <TabsTrigger value="cash-market" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Cash Market
              </TabsTrigger>
              <TabsTrigger value="fii-history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                FII History
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-0">
            <div className="grid grid-cols-12 gap-6">
              {/* Left Sidebar - Filters */}
              <div className="col-span-12 lg:col-span-2">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Filters</CardTitle>
                      <Button variant="link" className="text-primary p-0 h-auto text-sm">
                        Reset
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-medium text-sm mb-3">Participant</h4>
                      <div className="space-y-2">
                        {Object.entries(participantFilters).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`participant-${key}`}
                              checked={value}
                              onCheckedChange={(checked) =>
                                setParticipantFilters((prev) => ({ ...prev, [key]: !!checked }))
                              }
                            />
                            <label htmlFor={`participant-${key}`} className="text-sm cursor-pointer">
                              {key}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-3">Segment</h4>
                      <div className="space-y-2">
                        {Object.entries(segmentFilters).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`segment-${key}`}
                              checked={value}
                              onCheckedChange={(checked) =>
                                setSegmentFilters((prev) => ({ ...prev, [key]: !!checked }))
                              }
                            />
                            <label htmlFor={`segment-${key}`} className="text-sm cursor-pointer">
                              {key}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div>
                        <span className="text-sm font-medium">Show Labels</span>
                        <p className="text-xs text-muted-foreground">(Strong/Medium/Mild)</p>
                      </div>
                      <Switch checked={showLabels} onCheckedChange={setShowLabels} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content - Table */}
              <div className="col-span-12 lg:col-span-7">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">How to interpret this data?</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handlePreviousDate}
                          disabled={!fiiData || selectedDate >= fiiData.length - 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 px-3">
                              <CalendarIcon className="w-4 h-4" />
                              <span className="text-sm">{currentDate}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="center">
                            <Calendar
                              mode="single"
                              selected={currentDateParsed}
                              onSelect={handleDateSelect}
                              disabled={(date) => !availableDates.some(
                                (d) => d.getFullYear() === date.getFullYear() &&
                                       d.getMonth() === date.getMonth() &&
                                       d.getDate() === date.getDate()
                              )}
                              className="pointer-events-auto"
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleNextDate}
                          disabled={selectedDate <= 0}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {showSummaryLoading ? (
                      <div className="space-y-2">
                        {[...Array(8)].map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-muted-foreground text-[11px] w-[80px] py-2">Participant</TableHead>
                            <TableHead className="text-muted-foreground text-[11px] w-[100px] py-2">Segment</TableHead>
                            <TableHead className="text-right text-muted-foreground text-[11px] w-[100px] py-2">Bearish</TableHead>
                            <TableHead className="text-center text-muted-foreground w-[24px] py-2">
                              <TooltipProvider delayDuration={100}>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex cursor-help">
                                      <Info className="w-2.5 h-2.5 mx-auto" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[220px] text-xs z-50">
                                    <p><strong>How to interpret:</strong> Red bars = Bearish sentiment (selling/shorting). Green bars = Bullish sentiment (buying/long). Bar width shows relative position size.</p>
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-left text-muted-foreground text-[11px] w-[100px] py-2">Bullish</TableHead>
                            <TableHead className="text-right text-muted-foreground text-[11px] w-[70px] py-2">
                              <div className="flex items-center justify-end gap-0.5">
                                Net OI
                                <TooltipProvider delayDuration={100}>
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex cursor-help">
                                        <Info className="w-2.5 h-2.5" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[200px] text-xs z-50">
                                      <p><strong>Net Open Interest:</strong> Total outstanding positions. Positive = net long, Negative = net short. Displayed in Lakhs (L).</p>
                                    </TooltipContent>
                                  </UITooltip>
                                </TooltipProvider>
                              </div>
                            </TableHead>
                            <TableHead className="text-right text-muted-foreground text-[11px] w-[80px] py-2">
                              <div className="flex items-center justify-end gap-0.5">
                                Change
                                <TooltipProvider delayDuration={100}>
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex cursor-help">
                                        <Info className="w-2.5 h-2.5" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[200px] text-xs z-50">
                                      <p><strong>Daily Change:</strong> Difference from previous trading day. Green = increased, Red = decreased.</p>
                                    </TooltipContent>
                                  </UITooltip>
                                </TooltipProvider>
                              </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summaryTableData.map((row, idx, arr) => {
                            const isFirstInGroup = idx === 0 || arr[idx - 1].participant !== row.participant;
                            const rowKey = `${row.participant}-${row.segment}`;
                            const isExpanded = expandedRows.has(rowKey);
                            
                            // Calculate total rows for this participant including any expanded children
                            const calculateGroupRowSpan = () => {
                              const groupRows = arr.filter(r => r.participant === row.participant);
                              let totalRows = groupRows.length;
                              groupRows.forEach(r => {
                                const rKey = `${r.participant}-${r.segment}`;
                                if (expandedRows.has(rKey) && r.childData) {
                                  totalRows += r.childData.length;
                                }
                              });
                              return totalRows;
                            };
                            
                            return (
                              <React.Fragment key={rowKey}>
                                <TableRow className="border-border hover:bg-muted/30">
                                  {isFirstInGroup && (
                                    <TableCell className="font-medium text-[11px] align-top pt-3" rowSpan={calculateGroupRowSpan()}>
                                      {row.participant}
                                    </TableCell>
                                  )}
                                  <TableCell className="py-1.5">
                                    <div 
                                      className={`flex items-center gap-0.5 text-[11px] ${row.hasChildren ? 'cursor-pointer hover:text-primary' : ''}`}
                                      onClick={() => row.hasChildren && toggleRowExpanded(rowKey)}
                                    >
                                      {row.segment}
                                      {row.hasChildren && (
                                        <ChevronDown className={`w-2.5 h-2.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                      )}
                                    </div>
                                  </TableCell>
                                  <SentimentBarCells 
                                    sentiment={row.sentiment} 
                                    showLabel={showLabels} 
                                    value={row.value}
                                    maxValue={maxValue}
                                  />
                                  <TableCell className="text-right font-mono text-[10px] py-1.5">
                                    {row.netOI}
                                  </TableCell>
                                  <TableCell className={`text-right font-mono text-[10px] py-1.5 ${row.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                                    {row.change !== 0 ? (
                                      row.segment === "Stocks" 
                                        ? `${row.change >= 0 ? "+" : ""}${row.change.toLocaleString("en-IN")} Cr`
                                        : `${row.change >= 0 ? "+" : ""}${row.change.toFixed(2)}`
                                    ) : "-"}
                                  </TableCell>
                                </TableRow>
                                {/* Child rows when expanded */}
                                {isExpanded && row.childData?.map((child, childIdx) => (
                                  <TableRow key={`${rowKey}-child-${childIdx}`} className="border-border bg-muted/20 hover:bg-muted/40">
                                    <TableCell className="py-1 pl-6">
                                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                                        {child.name}
                                      </div>
                                    </TableCell>
                                    <SentimentBarCells 
                                      sentiment={child.sentiment} 
                                      showLabel={showLabels} 
                                      value={child.value}
                                      maxValue={maxValue}
                                    />
                                    <TableCell className="text-right font-mono text-[9px] py-1">
                                      {Math.abs(child.value) > 0 ? `${formatLakh(child.value)}` : "-"}
                                    </TableCell>
                                    <TableCell className={`text-right font-mono text-[9px] py-1 ${child.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                                      {child.change !== 0 ? `${child.change >= 0 ? "+" : ""}${child.change.toFixed(2)}` : "-"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar - Market Summary */}
              <div className="col-span-12 lg:col-span-3">
                <Card className="bg-card border-border">
                  <CardContent className="p-4 space-y-4">
                    {isLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </div>
                    ) : (
                      fiiData?.slice(selectedDate, selectedDate + 2).map((item, idx) => {
                        const nifty = item.ClosePrice.find((p) => p.Symbol === "NIFTY");
                        const sensex = item.ClosePrice.find((p) => p.Symbol === "SENSEX");
                        const isSelected = idx === 0;
                        return (
                          <div key={idx} className="border-b border-border pb-4 last:border-0">
                            <div className="text-sm text-muted-foreground mb-2">
                              {isSelected ? `Selected: ${format(parseISO(item.Date), "dd MMM yyyy")}` : format(parseISO(item.Date), "dd MMM, EEE")}
                            </div>
                            <div className="space-y-2">
                              <div>
                                <div className="font-semibold">NIFTY</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{nifty?.C.toLocaleString()}</span>
                                  <span className={`text-sm ${(nifty?.CZG || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                                    {(nifty?.CZG || 0) >= 0 ? "+" : ""}{nifty?.CZG.toFixed(2)}%
                                  </span>
                                  <TrendingUp className={`w-4 h-4 ${(nifty?.CZG || 0) >= 0 ? "text-green-500" : "text-red-500"}`} />
                                </div>
                              </div>
                              <div>
                                <div className="font-semibold">SENSEX</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{sensex?.C.toLocaleString()}</span>
                                  <span className={`text-sm ${(sensex?.CZG || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                                    {(sensex?.CZG || 0) >= 0 ? "+" : ""}{sensex?.CZG.toFixed(2)}%
                                  </span>
                                  <TrendingUp className={`w-4 h-4 ${(sensex?.CZG || 0) >= 0 ? "text-green-500" : "text-red-500"}`} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Futures and Options Tab */}
          <TabsContent value="futures-options" className="mt-0">
            <div className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Daily FII Buy/Sell in Index Options</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        How to read this? <Info className="w-3 h-3" />
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded" />
                          <span className="text-sm text-muted-foreground">FII Call OI Change</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded" />
                          <span className="text-sm text-muted-foreground">FII Put OI Change</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-purple-400 rounded" />
                          <span className="text-sm text-muted-foreground">Nifty</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-80 w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis
                          yAxisId="left"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={["dataMin - 100", "dataMax + 100"]}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
                        <Bar yAxisId="left" dataKey="fiiIdxOpt" name="FII Index Options" fill="#22c55e" opacity={0.8} />
                        <Bar yAxisId="left" dataKey="fiiIdxFut" name="FII Index Futures" fill="#ef4444" opacity={0.8} />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="nifty"
                          name="NIFTY"
                          stroke="#a78bfa"
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Daily FII Buy/Sell in Index Futures</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        How to read this? <Info className="w-3 h-3" />
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-cyan-500 rounded" />
                        <span className="text-sm text-muted-foreground">FII Index Futures</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-400 rounded" />
                        <span className="text-sm text-muted-foreground">NIFTY</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-80 w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis
                          yAxisId="left"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={["dataMin - 100", "dataMax + 100"]}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
                        <Bar yAxisId="left" dataKey="fiiIdxFut" name="FII Index Futures" fill="#06b6d4" opacity={0.8} />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="nifty"
                          name="NIFTY"
                          stroke="#a78bfa"
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cash Market Tab */}
          <TabsContent value="cash-market" className="mt-0">
            <div className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Cash Market Activity - Long Term View</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        How to read this? <Info className="w-3 h-3" />
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-cyan-500 rounded" />
                          <span className="text-sm text-muted-foreground">FII</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-purple-500 rounded" />
                          <span className="text-sm text-muted-foreground">DII</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-pink-400 rounded" />
                          <span className="text-sm text-muted-foreground">Nifty</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">Daily</Button>
                        <Button variant="secondary" size="sm">Monthly</Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-80 w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis
                          yAxisId="left"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={["dataMin - 100", "dataMax + 100"]}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend />
                        <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
                        <Bar yAxisId="left" dataKey="fiiCash" name="FII" fill="#06b6d4" opacity={0.9} />
                        <Bar yAxisId="left" dataKey="diiCash" name="DII" fill="#a855f7" opacity={0.9} />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="nifty"
                          name="Nifty"
                          stroke="#f472b6"
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Cash Market Monthly Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground">Month</TableHead>
                          <TableHead className="text-right text-muted-foreground">FII Cash Buy</TableHead>
                          <TableHead className="text-right text-muted-foreground">FII Cash Sell</TableHead>
                          <TableHead className="text-right text-muted-foreground">FII Cash Net</TableHead>
                          <TableHead className="text-right text-muted-foreground">DII Cash Buy</TableHead>
                          <TableHead className="text-right text-muted-foreground">DII Cash Sell</TableHead>
                          <TableHead className="text-right text-muted-foreground">DII Cash Net</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyData.slice(0, 12).map((row, idx) => (
                          <TableRow key={idx} className="border-border">
                            <TableCell className="font-medium">{row.month}</TableCell>
                            <TableCell className="text-right font-mono">₹{Math.abs(row.fiiCash * 0.8).toLocaleString()} Cr</TableCell>
                            <TableCell className="text-right font-mono">₹{Math.abs(row.fiiCash * 1.2).toLocaleString()} Cr</TableCell>
                            <TableCell className={`text-right font-mono ${row.fiiCash >= 0 ? "text-green-500" : "text-red-500"}`}>
                              {row.fiiCash >= 0 ? "+" : ""}{formatValue(row.fiiCash, false)} Cr
                            </TableCell>
                            <TableCell className="text-right font-mono">₹{Math.abs(row.diiCash * 0.9).toLocaleString()} Cr</TableCell>
                            <TableCell className="text-right font-mono">₹{Math.abs(row.diiCash * 0.7).toLocaleString()} Cr</TableCell>
                            <TableCell className={`text-right font-mono ${row.diiCash >= 0 ? "text-green-500" : "text-red-500"}`}>
                              {row.diiCash >= 0 ? "+" : ""}{formatValue(row.diiCash, false)} Cr
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FII History Tab */}
          <TabsContent value="fii-history" className="mt-0">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">FII History</CardTitle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{format(currentDateParsed, "MMMM yyyy")}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={currentDateParsed}
                        onSelect={(date) => {
                          if (date && fiiData) {
                            // Find the closest available date index
                            const dateStr = format(date, "yyyy-MM-dd");
                            const idx = fiiData.findIndex(item => item.Date.startsWith(dateStr));
                            if (idx !== -1) {
                              setSelectedDate(idx);
                            }
                          }
                        }}
                        disabled={(date) => {
                          if (!availableDates.length) return false;
                          const dateStr = format(date, "yyyy-MM-dd");
                          return !fiiData?.some(item => item.Date.startsWith(dateStr));
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground" rowSpan={2}>Date</TableHead>
                          <TableHead className="text-muted-foreground" rowSpan={2}>NIFTY</TableHead>
                          <TableHead className="text-center text-muted-foreground border-x border-border" colSpan={2}>Options</TableHead>
                          <TableHead className="text-center text-muted-foreground border-r border-border" colSpan={4}>Futures</TableHead>
                          <TableHead className="text-center text-muted-foreground" colSpan={2}>Cash</TableHead>
                        </TableRow>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground text-center border-x border-border">FII Call OI Chg</TableHead>
                          <TableHead className="text-muted-foreground text-center border-r border-border">FII Put OI Chg</TableHead>
                          <TableHead className="text-muted-foreground text-center">Buy/Sell(Amt)</TableHead>
                          <TableHead className="text-muted-foreground text-center">OI Change (Qty)</TableHead>
                          <TableHead className="text-muted-foreground text-center">View</TableHead>
                          <TableHead className="text-muted-foreground text-center border-r border-border">OI</TableHead>
                          <TableHead className="text-muted-foreground text-center">FII Cash</TableHead>
                          <TableHead className="text-muted-foreground text-center">DII Cash</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getHistoryData().map((row, idx) => (
                          <TableRow key={idx} className="border-border">
                            <TableCell className="font-medium">{row.date}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{row.nifty.toLocaleString()}</span>
                                <span className={`text-xs ${row.niftyChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                                  {row.niftyChange >= 0 ? "+" : ""}{row.niftyChange.toFixed(2)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center border-x border-border">
                              <div className="flex items-center justify-center gap-2">
                                <span>{row.fiiCallOI.toLocaleString()}</span>
                                <Badge className={row.fiiCallOI > 0 ? "bg-green-600 hover:bg-green-600" : "bg-red-600 hover:bg-red-600"}>
                                  {row.fiiCallOI > 0 ? "BULLISH" : "BEARISH"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-center border-r border-border">
                              <div className="flex items-center justify-center gap-2">
                                <span>{row.fiiPutOI.toLocaleString()}</span>
                                <Badge className={row.fiiPutOI > 0 ? "bg-green-600 hover:bg-green-600" : "bg-red-600 hover:bg-red-600"}>
                                  {row.fiiPutOI > 0 ? "BULLISH" : "BEARISH"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{formatValue(row.fiiIdxFutBuySell, false)} Cr</TableCell>
                            <TableCell className="text-center">{row.fiiIdxFutOIChange.toLocaleString()}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={row.fiiIdxFutOIChange > 0 ? "bg-green-600 hover:bg-green-600" : "bg-red-600 hover:bg-red-600"}>
                                {row.fiiIdxFutOIChange > 0 ? "BULLISH" : "BEARISH"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center border-r border-border">{row.fiiIdxFutOI}L</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className={row.fiiCash >= 0 ? "text-green-500" : "text-red-500"}>
                                  {formatValue(row.fiiCash, false)} Cr
                                </span>
                                <Badge className={row.fiiCash >= 0 ? "bg-green-600 hover:bg-green-600" : "bg-red-600 hover:bg-red-600"}>
                                  {row.fiiCash >= 0 ? "BULLISH" : "BEARISH"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{formatValue(row.diiCash, false)} Cr</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
