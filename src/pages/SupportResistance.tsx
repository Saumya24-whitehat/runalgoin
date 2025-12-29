import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { TickerRibbon } from '@/components/TickerRibbon';
import LTPCalculatorModal from '@/components/LTPCalculatorModal';
import { RefreshCw, Settings, ChevronLeft, ChevronRight, Clock, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OptionData {
  strike_price: number;
  underlying_spot_price: number;
  pcr: number;
  expiry: string;
  call_options: {
    market_data: {
      ltp: number;
      close_price: number;
      volume: number;
      oi: number;
      prev_oi: number;
    };
    option_greeks: {
      iv: number;
      delta: number;
    };
  };
  put_options: {
    market_data: {
      ltp: number;
      close_price: number;
      volume: number;
      oi: number;
      prev_oi: number;
    };
    option_greeks: {
      iv: number;
      delta: number;
    };
  };
}

interface ShiftingEntry {
  time: string;
  callShift: string;
  putShift: string;
}

// Format number in Indian notation (Lakhs)
const formatIndianNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return '';
  return Number(num).toLocaleString('en-IN');
};

// Time slots from 9:15 AM to 3:30 PM in 3-minute intervals
const generateTimeSlots = () => {
  const slots: string[] = [];
  const startTotalMinutes = 9 * 60 + 15;
  const endTotalMinutes = 15 * 60 + 30;
  const stepMinutes = 3;

  for (let total = startTotalMinutes; total <= endTotalMinutes; total += stepMinutes) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    const hour = h.toString().padStart(2, '0');
    const min = m.toString().padStart(2, '0');
    slots.push(`${hour}${min}`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const formatTimeDisplay = (time: string) => {
  if (!time || time.length < 4) return '';
  const hour = parseInt(time.slice(0, 2));
  const min = time.slice(2, 4);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour.toString().padStart(2, '0')}:${min} ${period}`;
};

const SupportResistance = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [indexSymbols, setIndexSymbols] = useState<string[]>([]);
  const [stockSymbols, setStockSymbols] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('Nifty 50');
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>('');
  const [optionData, setOptionData] = useState<OptionData[]>([]);
  const [spotPrice, setSpotPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [historicalTime, setHistoricalTime] = useState<string>('');
  
  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [strikeCount, setStrikeCount] = useState(10);
  const [displayAsLots, setDisplayAsLots] = useState(false);
  const [lotSize, setLotSize] = useState(75);
  const [highlightCount, setHighlightCount] = useState(2);
  const [highlightPercentage, setHighlightPercentage] = useState(74.99);
  
  // Shifting modal
  const [shiftingOpen, setShiftingOpen] = useState(false);
  const [shiftingData] = useState<ShiftingEntry[]>([
    { time: '09:32:11 AM', callShift: 'SFT : 26200 -> 26100', putShift: '-' },
    { time: '09:28:38 AM', callShift: '-', putShift: 'SFT : 26000 -> 26100' },
    { time: '09:28:18 AM', callShift: '-', putShift: 'SFT : 26100 -> 26000' },
    { time: '09:28:06 AM', callShift: '-', putShift: 'SFT : 26000 -> 26100' },
  ]);

  // Info/Guide modal
  const [infoOpen, setInfoOpen] = useState(false);

  // LTP Calculator modal
  const [ltpModalOpen, setLtpModalOpen] = useState(false);
  const [selectedStrikeData, setSelectedStrikeData] = useState<OptionData | null>(null);

  const handleStrikeClick = (row: OptionData) => {
    setSelectedStrikeData(row);
    setLtpModalOpen(true);
  };

  // Calculate support and resistance levels
  const calculateLevels = useCallback(() => {
    if (optionData.length === 0) return { resistance: 0, support: 0 };
    
    let maxCallOI = 0, maxPutOI = 0;
    let resistanceStrike = 0, supportStrike = 0;
    
    optionData.forEach(row => {
      if (row.call_options.market_data.oi > maxCallOI) {
        maxCallOI = row.call_options.market_data.oi;
        resistanceStrike = row.strike_price;
      }
      if (row.put_options.market_data.oi > maxPutOI) {
        maxPutOI = row.put_options.market_data.oi;
        supportStrike = row.strike_price;
      }
    });
    
    return { resistance: resistanceStrike, support: supportStrike };
  }, [optionData]);

  const levels = calculateLevels();

  // Fetch symbols
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('option-chain', {
          body: { action: 'getSymbols' }
        });
        if (error) throw error;
        console.log('Symbols response:', data);
        
        // API returns "index symbols" (with space) not "index_symbols"
        const idxSymbols = data?.['index symbols'] || data?.index_symbols || [];
        const stkSymbols = data?.symbols || [];
        console.log('Index symbols:', idxSymbols);
        console.log('Stock symbols:', stkSymbols);
        setIndexSymbols(idxSymbols);
        setStockSymbols(stkSymbols);
        
        // Auto-select first index symbol if available
        if (idxSymbols.length > 0 && !idxSymbols.includes(selectedSymbol) && !stkSymbols.includes(selectedSymbol)) {
          setSelectedSymbol(idxSymbols[0]);
        }
      } catch (err) {
        console.error('Error fetching symbols:', err);
      }
    };
    fetchSymbols();
  }, []);

  // Fetch expiry dates when symbol changes
  useEffect(() => {
    const fetchExpiryDates = async () => {
      if (!selectedSymbol) return;
      try {
        const { data, error } = await supabase.functions.invoke('option-chain', {
          body: { action: 'getExpiryDates', symbol: selectedSymbol }
        });
        if (error) throw error;
        console.log('Expiry dates response:', data);
        // Handle response format: { expiry_dates: [...] }
        let expiryList: string[] = [];
        if (data?.expiry_dates && Array.isArray(data.expiry_dates)) {
          expiryList = data.expiry_dates;
        } else if (Array.isArray(data)) {
          expiryList = data;
        }
        if (expiryList.length > 0) {
          setExpiryDates(expiryList);
          setSelectedExpiry(expiryList[0]);
        }
      } catch (err) {
        console.error('Error fetching expiry dates:', err);
      }
    };
    fetchExpiryDates();
  }, [selectedSymbol]);

  // Fetch option chain data
  const fetchOptionChain = useCallback(async () => {
    if (!selectedSymbol || !selectedExpiry) return;
    setLoading(true);
    try {
      const body: Record<string, string> = {
        action: 'getOptionChain',
        symbol: selectedSymbol,
        expiry_date: selectedExpiry
      };
      
      if (!isLive && historicalTime) {
        body.time = historicalTime;
      }
      
      const { data, error } = await supabase.functions.invoke('option-chain', { body });
      if (error) throw error;
      
      console.log('Option chain response:', data);
      
      // API returns: { option_chain: { status, data: [...] } } OR { data: [...] }
      let chainData: OptionData[] = [];
      if (data?.option_chain?.data && Array.isArray(data.option_chain.data)) {
        chainData = data.option_chain.data;
      } else if (data?.data && Array.isArray(data.data)) {
        chainData = data.data;
      }
      
      if (chainData.length > 0) {
        setOptionData(chainData);
        setSpotPrice(chainData[0].underlying_spot_price);
        console.log('Option data set:', chainData.length, 'rows, spot:', chainData[0].underlying_spot_price);
      }
    } catch (err) {
      console.error('Error fetching option chain:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol, selectedExpiry, isLive, historicalTime]);

  useEffect(() => {
    if (selectedExpiry) {
      fetchOptionChain();
    }
  }, [selectedExpiry, fetchOptionChain]);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Handle time navigation
  const handleTimeChange = (direction: 'prev' | 'next') => {
    const currentIndex = TIME_SLOTS.indexOf(historicalTime);
    let newIndex = currentIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
    } else {
      newIndex = currentIndex < TIME_SLOTS.length - 1 ? currentIndex + 1 : TIME_SLOTS.length - 1;
    }
    
    if (newIndex !== currentIndex) {
      setHistoricalTime(TIME_SLOTS[newIndex]);
    }
  };

  const toggleLiveMode = () => {
    if (isLive) {
      setIsLive(false);
      const defaultTimeIndex = Math.floor(TIME_SLOTS.length / 2);
      setHistoricalTime(TIME_SLOTS[defaultTimeIndex]);
    } else {
      setIsLive(true);
      setHistoricalTime('');
    }
  };

  // Auto-fetch on historical time change
  useEffect(() => {
    if (!isLive && historicalTime) {
      const timer = setTimeout(() => {
        fetchOptionChain();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [historicalTime, isLive, fetchOptionChain]);

  // Calculate filtered data based on strike count
  const getFilteredData = () => {
    if (optionData.length === 0) return [];
    
    const sorted = [...optionData].sort((a, b) => a.strike_price - b.strike_price);
    const spotPriceIndex = sorted.findIndex(row => row.strike_price > spotPrice);
    const startIndex = Math.max(0, spotPriceIndex - strikeCount);
    const endIndex = Math.min(sorted.length, spotPriceIndex + strikeCount);
    
    return sorted.slice(startIndex, endIndex);
  };

  const filteredData = getFilteredData();

  // Calculate top N values for highlighting
  const getTopNValues = (data: OptionData[], keyFn: (row: OptionData) => number, n: number) => {
    return data.map(row => keyFn(row)).sort((a, b) => b - a).slice(0, n);
  };

  const topCallVolumes = getTopNValues(optionData, row => row.call_options.market_data.volume, highlightCount);
  const topPutVolumes = getTopNValues(optionData, row => row.put_options.market_data.volume, highlightCount);
  const topCallOIs = getTopNValues(optionData, row => row.call_options.market_data.oi, highlightCount);
  const topPutOIs = getTopNValues(optionData, row => row.put_options.market_data.oi, highlightCount);
  const topCallCOIs = getTopNValues(optionData, row => row.call_options.market_data.oi - row.call_options.market_data.prev_oi, highlightCount);
  const topPutCOIs = getTopNValues(optionData, row => row.put_options.market_data.oi - row.put_options.market_data.prev_oi, highlightCount);

  // Calculate totals
  const totals = optionData.reduce((acc, row) => ({
    callOI: acc.callOI + row.call_options.market_data.oi,
    callCOI: acc.callCOI + (row.call_options.market_data.oi - row.call_options.market_data.prev_oi),
    callVolume: acc.callVolume + row.call_options.market_data.volume,
    putOI: acc.putOI + row.put_options.market_data.oi,
    putCOI: acc.putCOI + (row.put_options.market_data.oi - row.put_options.market_data.prev_oi),
    putVolume: acc.putVolume + row.put_options.market_data.volume,
  }), { callOI: 0, callCOI: 0, callVolume: 0, putOI: 0, putCOI: 0, putVolume: 0 });

  // Get highlight class for a value
  const getHighlightClass = (value: number, topValues: number[], isPut: boolean) => {
    const index = topValues.indexOf(value);
    if (index === -1) return { bg: '', isHighlighted: false };
    if (index === 0) return { bg: isPut ? 'bg-green-700 border border-white/50 rounded' : 'bg-red-700 border border-white/50 rounded', isHighlighted: true };
    if (value >= topValues[0] * (highlightPercentage / 100)) {
      if (index === 1) return { bg: 'bg-amber-600 border border-white/50 rounded', isHighlighted: true };
      if (index === 2) return { bg: 'bg-pink-600 border border-white/50 rounded', isHighlighted: true };
      if (index === 3) return { bg: 'bg-gray-500 border border-white/50 rounded', isHighlighted: true };
    }
    return { bg: '', isHighlighted: false };
  };

  // Format values based on lots/quantity setting
  const formatValue = (value: number) => {
    if (displayAsLots) {
      return formatIndianNumber(Math.round(value / lotSize));
    }
    return formatIndianNumber(value);
  };

  // PCR calculations
  const pcrOI = totals.callOI > 0 ? (totals.putOI / totals.callOI).toFixed(2) : '-';
  const pcrCOI = totals.callCOI > 0 ? (totals.putCOI / totals.callCOI).toFixed(2) : '-';
  const pcrVol = totals.callVolume > 0 ? (totals.putVolume / totals.callVolume).toFixed(2) : '-';

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Skeleton className="h-12 w-48" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TickerRibbon />
      <Navbar />
      
      <main className="flex-1 p-2 md:p-4">
        {/* Header Controls */}
        <Card className="mb-4 bg-card border-border">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              {/* Symbol Select */}
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-32 md:w-40 bg-muted border-border text-xs md:text-sm">
                  <SelectValue placeholder="Symbol" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-popover">
                  {indexSymbols.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50">INDEX</div>
                      {indexSymbols.map(sym => (
                        <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                      ))}
                    </>
                  )}
                  {stockSymbols.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50 mt-1">STOCKS</div>
                      {stockSymbols.map(sym => (
                        <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>

              {/* Expiry Select */}
              <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
                <SelectTrigger className="w-28 md:w-36 bg-muted border-border text-xs md:text-sm">
                  <SelectValue placeholder="Expiry" />
                </SelectTrigger>
                <SelectContent>
                  {expiryDates.map(date => (
                    <SelectItem key={date} value={date}>{date}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Live/Historical Toggle */}
              <Button
                variant={isLive ? "default" : "outline"}
                size="sm"
                onClick={toggleLiveMode}
                className="text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                {isLive ? 'Live' : 'Historical'}
              </Button>

              {/* Historical Time Controls */}
              {!isLive && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleTimeChange('prev')}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-medium px-2 bg-muted rounded py-1 min-w-[70px] text-center">
                    {formatTimeDisplay(historicalTime)}
                  </span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleTimeChange('next')}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Refresh */}
              <Button variant="outline" size="sm" onClick={fetchOptionChain} disabled={loading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Refresh</span>
              </Button>

              {/* Settings */}
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-3 w-3" />
              </Button>

              {/* Info/Guide */}
              <Button variant="outline" size="sm" onClick={() => setInfoOpen(true)} className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10">
                <Info className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Table */}
        <div className="overflow-x-auto bg-card rounded-lg border border-border">
          <Table className="w-full text-xs">
            <TableHeader>
              {/* Header Row 1 - CALL | IDV | PUT */}
              <TableRow className="border-b border-border">
                <TableHead 
                  colSpan={6} 
                  className="bg-red-800 text-white text-center cursor-pointer hover:bg-red-700 transition-colors"
                  onClick={() => setShiftingOpen(true)}
                >
                  CALL | Resistance: {levels.resistance}
                </TableHead>
                <TableHead className="bg-indigo-900 text-white text-center">IDV: -</TableHead>
                <TableHead 
                  colSpan={6} 
                  className="bg-green-800 text-white text-center cursor-pointer hover:bg-green-700 transition-colors"
                  onClick={() => setShiftingOpen(true)}
                >
                  PUT | Support: {levels.support}
                </TableHead>
              </TableRow>
              
              {/* Header Row 2 - Column headers */}
              <TableRow className="bg-muted/50 text-[10px] md:text-xs">
                <TableHead className="text-center p-1 md:p-2">DELTA IV</TableHead>
                <TableHead className="text-center p-1 md:p-2">COI</TableHead>
                <TableHead className="text-center p-1 md:p-2">OI</TableHead>
                <TableHead className="text-center p-1 md:p-2">VOLUME</TableHead>
                <TableHead className="text-center p-1 md:p-2">LTP</TableHead>
                <TableHead className="text-center p-1 md:p-2">S LEV</TableHead>
                <TableHead className="text-center p-1 md:p-2 bg-indigo-900/50">STRIKE PCR</TableHead>
                <TableHead className="text-center p-1 md:p-2">S LEV</TableHead>
                <TableHead className="text-center p-1 md:p-2">LTP</TableHead>
                <TableHead className="text-center p-1 md:p-2">VOLUME</TableHead>
                <TableHead className="text-center p-1 md:p-2">OI</TableHead>
                <TableHead className="text-center p-1 md:p-2">COI</TableHead>
                <TableHead className="text-center p-1 md:p-2">DELTA IV</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 13 }).map((_, j) => (
                      <TableCell key={j} className="p-1"><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                filteredData.map((row, idx) => {
                  const isCallITM = row.strike_price < spotPrice;
                  const isPutITM = row.strike_price > spotPrice;
                  const isSpotRow = idx > 0 && filteredData[idx - 1]?.strike_price < spotPrice && row.strike_price > spotPrice;
                  
                  const callCOI = row.call_options.market_data.oi - row.call_options.market_data.prev_oi;
                  const putCOI = row.put_options.market_data.oi - row.put_options.market_data.prev_oi;
                  const pcrOfCoi = callCOI !== 0 ? (putCOI / callCOI).toFixed(2) : '-';

                  const callOIPercent = topCallOIs[0] > 0 ? ((row.call_options.market_data.oi / topCallOIs[0]) * 100).toFixed(1) : '0';
                  const putOIPercent = topPutOIs[0] > 0 ? ((row.put_options.market_data.oi / topPutOIs[0]) * 100).toFixed(1) : '0';
                  const callVolPercent = topCallVolumes[0] > 0 ? ((row.call_options.market_data.volume / topCallVolumes[0]) * 100).toFixed(1) : '0';
                  const putVolPercent = topPutVolumes[0] > 0 ? ((row.put_options.market_data.volume / topPutVolumes[0]) * 100).toFixed(1) : '0';
                  const callCOIPercent = topCallCOIs[0] > 0 ? ((callCOI / topCallCOIs[0]) * 100).toFixed(1) : '0';
                  const putCOIPercent = topPutCOIs[0] > 0 ? ((putCOI / topPutCOIs[0]) * 100).toFixed(1) : '0';

                  return (
                    <>
                      {isSpotRow && (
                        <TableRow key={`spot-${idx}`} className="border-y-2 border-red-500">
                          <TableCell colSpan={13} className="p-0">
                            <div className="flex justify-between items-center bg-card/80 px-4 py-2">
                              <span className="text-xs text-muted-foreground">OI: {((totals.putOI / (totals.callOI + totals.putOI)) * 100).toFixed(1)}%</span>
                              <span className="bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold">
                                SPOT: {spotPrice.toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground">OI: {((totals.callOI / (totals.callOI + totals.putOI)) * 100).toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      
                      <TableRow key={row.strike_price} className="hover:bg-muted/20">
                        {/* CALL Side */}
                        <TableCell className={`p-1 text-center ${isCallITM ? 'bg-red-950/30' : ''}`}>
                          <div className="font-semibold">{row.call_options.option_greeks.delta}</div>
                          <div className="text-muted-foreground text-[9px]">{row.call_options.option_greeks.iv?.toFixed(2)}</div>
                        </TableCell>
                        <TableCell className={`p-1 text-center ${isCallITM ? 'bg-red-950/30' : ''} ${getHighlightClass(callCOI, topCallCOIs, false).bg}`}>
                          <div className={`font-medium ${getHighlightClass(callCOI, topCallCOIs, false).isHighlighted ? 'text-white' : callCOI < 0 ? 'text-red-400' : ''}`}>{formatValue(callCOI)}</div>
                          <div className={`text-[9px] ${getHighlightClass(callCOI, topCallCOIs, false).isHighlighted ? 'text-white/80' : 'text-muted-foreground'}`}>{callCOIPercent}%</div>
                        </TableCell>
                        <TableCell className={`p-1 text-center ${isCallITM ? 'bg-red-950/30' : ''} ${getHighlightClass(row.call_options.market_data.oi, topCallOIs, false).bg}`}>
                          <div className={`font-medium ${getHighlightClass(row.call_options.market_data.oi, topCallOIs, false).isHighlighted ? 'text-white' : ''}`}>{formatValue(row.call_options.market_data.oi)}</div>
                          <div className={`text-[9px] ${getHighlightClass(row.call_options.market_data.oi, topCallOIs, false).isHighlighted ? 'text-white/80' : 'text-muted-foreground'}`}>{callOIPercent}%</div>
                        </TableCell>
                        <TableCell className={`p-1 text-center ${isCallITM ? 'bg-red-950/30' : ''} ${getHighlightClass(row.call_options.market_data.volume, topCallVolumes, false).bg}`}>
                          <div className={`font-medium ${getHighlightClass(row.call_options.market_data.volume, topCallVolumes, false).isHighlighted ? 'text-white' : ''}`}>{formatValue(row.call_options.market_data.volume)}</div>
                          <div className={`text-[9px] ${getHighlightClass(row.call_options.market_data.volume, topCallVolumes, false).isHighlighted ? 'text-white/80' : 'text-muted-foreground'}`}>{callVolPercent}%</div>
                        </TableCell>
                        <TableCell className={`p-1 text-center ${isCallITM ? 'bg-red-950/30' : ''}`}>
                          {row.call_options.market_data.ltp}
                        </TableCell>
                        <TableCell className={`p-1 text-center ${isCallITM ? 'bg-red-950/30 text-red-400' : 'text-muted-foreground'}`}>
                          -
                        </TableCell>
                        
                        {/* Strike Price Center - Clickable */}
                        <TableCell 
                          className="p-1 text-center bg-indigo-900/30 font-bold cursor-pointer hover:bg-indigo-800/50 transition-colors"
                          onClick={() => handleStrikeClick(row)}
                        >
                          <div className="hover:text-amber-400 transition-colors">{row.strike_price}</div>
                          <div className="text-[9px] text-muted-foreground">
                            {row.pcr?.toFixed(2)} ({pcrOfCoi})
                          </div>
                        </TableCell>
                        
                        {/* PUT Side */}
                        <TableCell className={`p-1 text-center ${isPutITM ? 'bg-emerald-950/30 text-green-400' : 'text-muted-foreground'}`}>
                          -
                        </TableCell>
                        <TableCell className={`p-1 text-center ${isPutITM ? 'bg-emerald-950/30' : ''}`}>
                          {row.put_options.market_data.ltp}
                        </TableCell>
                        <TableCell className={`p-1 text-center ${isPutITM ? 'bg-emerald-950/30' : ''} ${getHighlightClass(row.put_options.market_data.volume, topPutVolumes, true).bg}`}>
                          <div className={`font-medium ${getHighlightClass(row.put_options.market_data.volume, topPutVolumes, true).isHighlighted ? 'text-white' : ''}`}>{formatValue(row.put_options.market_data.volume)}</div>
                          <div className={`text-[9px] ${getHighlightClass(row.put_options.market_data.volume, topPutVolumes, true).isHighlighted ? 'text-white/80' : 'text-muted-foreground'}`}>{putVolPercent}%</div>
                        </TableCell>
                        <TableCell className={`p-1 text-center ${isPutITM ? 'bg-emerald-950/30' : ''} ${getHighlightClass(row.put_options.market_data.oi, topPutOIs, true).bg}`}>
                          <div className={`font-medium ${getHighlightClass(row.put_options.market_data.oi, topPutOIs, true).isHighlighted ? 'text-white' : ''}`}>{formatValue(row.put_options.market_data.oi)}</div>
                          <div className={`text-[9px] ${getHighlightClass(row.put_options.market_data.oi, topPutOIs, true).isHighlighted ? 'text-white/80' : 'text-muted-foreground'}`}>{putOIPercent}%</div>
                        </TableCell>
                        <TableCell className={`p-1 text-center ${isPutITM ? 'bg-emerald-950/30' : ''} ${getHighlightClass(putCOI, topPutCOIs, true).bg}`}>
                          <div className={`font-medium ${getHighlightClass(putCOI, topPutCOIs, true).isHighlighted ? 'text-white' : putCOI < 0 ? 'text-red-400' : ''}`}>{formatValue(putCOI)}</div>
                          <div className={`text-[9px] ${getHighlightClass(putCOI, topPutCOIs, true).isHighlighted ? 'text-white/80' : 'text-muted-foreground'}`}>{putCOIPercent}%</div>
                        </TableCell>
                        <TableCell className={`p-1 text-center ${isPutITM ? 'bg-emerald-950/30' : ''}`}>
                          <div className="font-semibold">{row.put_options.option_greeks.delta}</div>
                          <div className="text-muted-foreground text-[9px]">{row.put_options.option_greeks.iv?.toFixed(2)}</div>
                        </TableCell>
                      </TableRow>
                    </>
                  );
                })
              )}
              
              {/* Footer Totals */}
              {!loading && filteredData.length > 0 && (
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell className="p-1 text-center"></TableCell>
                  <TableCell className="p-1 text-center bg-red-900/50 text-red-400">{formatValue(totals.callCOI)}</TableCell>
                  <TableCell className="p-1 text-center bg-red-900/50">{formatValue(totals.callOI)}</TableCell>
                  <TableCell className="p-1 text-center bg-red-900/50">{formatValue(totals.callVolume)}</TableCell>
                  <TableCell className="p-1 text-center"></TableCell>
                  <TableCell className="p-1 text-center"></TableCell>
                  <TableCell className="p-1 text-center bg-indigo-900/50">Total</TableCell>
                  <TableCell className="p-1 text-center"></TableCell>
                  <TableCell className="p-1 text-center"></TableCell>
                  <TableCell className="p-1 text-center bg-green-900/50">{formatValue(totals.putVolume)}</TableCell>
                  <TableCell className="p-1 text-center bg-green-900/50">{formatValue(totals.putOI)}</TableCell>
                  <TableCell className="p-1 text-center bg-green-900/50">{formatValue(totals.putCOI)}</TableCell>
                  <TableCell className="p-1 text-center"></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Bar */}
        <div className="mt-4 flex flex-wrap gap-2 p-3 bg-amber-950/50 border border-amber-800 rounded-lg">
          {[
            { label: 'T.V CE', value: '98.52%' },
            { label: 'T.V PE', value: '1.48%' },
            { label: 'LTP CE', value: '78.03%' },
            { label: 'LTP PE', value: '21.97%' },
            { label: 'PCR Vol', value: pcrVol },
            { label: 'PCR OI', value: pcrOI },
            { label: 'PCR COI', value: pcrCOI },
            { label: 'Lot Size', value: lotSize.toString() },
            { label: 'Max Pain', value: levels.resistance.toString() },
          ].map((item, i) => (
            <div key={i} className="flex-1 min-w-[80px] text-center border-r border-amber-800 last:border-r-0 px-2">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="text-sm font-semibold">{item.value}</div>
            </div>
          ))}
        </div>

        {/* PCR Info */}
        <div className="mt-4 p-4 bg-yellow-950/30 border border-yellow-800/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            The Put-Call Ratio (PCR) helps in determining market sentiment.
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <span className="text-green-400">PCR &gt; 1.2 - Bullish Market</span>
            <span className="text-red-400">PCR &lt; 0.8 - Bearish Market</span>
            <span className="text-yellow-400">PCR 0.8-1.2 - Neutral Market</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          ▲ Disclaimer: The information and tools provided are for educational and informational purposes only.
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-amber-500">Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Strikes to show (ATM up/down):</Label>
              <Input
                type="number"
                value={strikeCount}
                onChange={(e) => setStrikeCount(parseInt(e.target.value) || 10)}
                className="w-20"
                min={1}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>COI, OI & Volume as:</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={displayAsLots ? "default" : "outline"}
                  onClick={() => setDisplayAsLots(true)}
                >
                  Lots
                </Button>
                <Button
                  size="sm"
                  variant={!displayAsLots ? "default" : "outline"}
                  onClick={() => setDisplayAsLots(false)}
                >
                  Quantity
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Lot Size:</Label>
              <Input
                type="number"
                value={lotSize}
                onChange={(e) => setLotSize(parseInt(e.target.value) || 75)}
                className="w-20"
                min={1}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Number of Highlights:</Label>
              <Select value={highlightCount.toString()} onValueChange={(v) => setHighlightCount(parseInt(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Highlight Percentage:</Label>
              <Input
                type="number"
                value={highlightPercentage}
                onChange={(e) => setHighlightPercentage(parseFloat(e.target.value) || 74.99)}
                className="w-24"
                min={0}
                max={100}
                step={0.01}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Rows will be highlighted if their value is greater than this percentage of the maximum value
            </p>
            <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => setSettingsOpen(false)}>
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shifting Modal */}
      <Dialog open={shiftingOpen} onOpenChange={setShiftingOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-amber-500">All Shiftings</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>TIME</TableHead>
                <TableHead className="bg-red-900">CALL SHIFT</TableHead>
                <TableHead className="bg-green-900">PUT SHIFT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftingData.map((entry, i) => (
                <TableRow key={i}>
                  <TableCell>{entry.time}</TableCell>
                  <TableCell>{entry.callShift}</TableCell>
                  <TableCell>{entry.putShift}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* LTP Calculator Modal */}
      {selectedStrikeData && (
        <LTPCalculatorModal
          open={ltpModalOpen}
          onOpenChange={setLtpModalOpen}
          strikePrice={selectedStrikeData.strike_price}
          spotPrice={spotPrice}
          callLTP={selectedStrikeData.call_options.market_data.ltp}
          putLTP={selectedStrikeData.put_options.market_data.ltp}
          callIV={selectedStrikeData.call_options.option_greeks.iv}
          putIV={selectedStrikeData.put_options.option_greeks.iv}
          expiry={selectedExpiry}
        />
      )}

      {/* Info/Guide Modal */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-amber-500 text-xl flex items-center gap-2">
              <Info className="h-5 w-5" />
              RunAlgo Option Chain – Page Use Guide
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6 text-sm">
              {/* Option Writer Perspective */}
              <div className="p-4 bg-gradient-to-r from-amber-950/50 to-transparent border-l-4 border-amber-500 rounded">
                <h3 className="font-bold text-amber-400 mb-2">📊 Option Writer ke Nazariye se Data</h3>
                <p className="text-muted-foreground">
                  Is page me ham option chain data ko option writer ke nazariye se dekhte hain. Agar Call side ka OI, COI aur Volume Put side se jyada hai, 
                  to ham ise <span className="text-red-400 font-semibold">Bearish Sentiment</span> mante hain kyunki Call Writers jyada hain 
                  to wo market ko upar nahi jane denge.
                </p>
              </div>

              {/* Highlighting Logic */}
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <h3 className="font-bold text-primary mb-3">🎯 Highlighting Logic</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <span className="text-white">Highest OI/COI/Volume</span> wale strike ko highlight karte hain (Support/Resistance 1)</li>
                  <li>• <span className="text-amber-400">Second Highest</span> ko bhi highlight karte hain agar wo 75%+ hai first ka (Support/Resistance 2)</li>
                  <li>• Settings me jakar aap 2 se zyada bhi highlight kar sakte ho</li>
                  <li>• <span className="bg-red-700 px-2 py-0.5 rounded text-white text-xs">Red</span> = Call side (Resistance)</li>
                  <li>• <span className="bg-green-700 px-2 py-0.5 rounded text-white text-xs">Green</span> = Put side (Support)</li>
                </ul>
              </div>

              {/* First 10 Seconds */}
              <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-800/50">
                <h3 className="font-bold text-blue-400 mb-3">1️⃣ Page Open karte hi kya dekhen (First 10 Seconds)</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Index / Symbol (NIFTY / BANKNIFTY)</li>
                  <li>• ATM Strike (beech wala strike)</li>
                  <li>• Support Side (PUT – Red)</li>
                  <li>• Resistance Side (CALL – Green)</li>
                  <li>• Powered by NSE / Live MTM Update</li>
                </ul>
                <p className="mt-2 text-amber-400 text-xs">👉 Goal: Sirf level nahi, strength padhna</p>
              </div>

              {/* Support-Resistance */}
              <div className="p-4 bg-gradient-to-r from-red-950/30 via-transparent to-green-950/30 rounded-lg border border-border">
                <h3 className="font-bold text-primary mb-3">2️⃣ Support–Resistance Identify kaise karein</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-red-900/30 rounded">
                    <span className="text-red-400 font-bold">🔴 Red / PUT side</span>
                    <p className="text-xs text-muted-foreground mt-1">= Support Zone</p>
                  </div>
                  <div className="text-center p-3 bg-green-900/30 rounded">
                    <span className="text-green-400 font-bold">🟢 Green / CALL side</span>
                    <p className="text-xs text-muted-foreground mt-1">= Resistance Zone</p>
                  </div>
                </div>
              </div>

              {/* Strength Labels */}
              <div className="p-4 bg-purple-950/30 rounded-lg border border-purple-800/50">
                <h3 className="font-bold text-purple-400 mb-3">3️⃣ Strength Labels kaise padhein (Sabse Zaruri)</h3>
                <p className="text-muted-foreground mb-3">Har strike ke upar likha text dhyan se dekhein:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-green-900/30 rounded">SUPPORT STRONG</div>
                  <div className="p-2 bg-amber-900/30 rounded">SUPPORT WTT / WTB</div>
                  <div className="p-2 bg-red-900/30 rounded">RESISTANCE STRONG</div>
                  <div className="p-2 bg-amber-900/30 rounded">RESISTANCE WTT / WTB</div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  <p><span className="text-green-400 font-semibold">STRONG</span> → Pressure tik raha hai</p>
                  <p><span className="text-amber-400 font-semibold">WTB</span> (Weak Towards Bottom) → Tootne ki taiyari</p>
                  <p><span className="text-amber-400 font-semibold">WTT</span> (Weak Towards Top) → Upar se dabaav kam</p>
                </div>
              </div>

              {/* State of Confusion */}
              <div className="p-4 bg-yellow-950/30 rounded-lg border border-yellow-800/50">
                <h3 className="font-bold text-yellow-400 mb-3">4️⃣ State of Confusion pehchanne ka tarika</h3>
                <div className="bg-yellow-900/20 p-3 rounded mb-3">
                  <p className="font-semibold text-yellow-300">🔑 Golden Rule:</p>
                  <p className="text-muted-foreground">Confusion hamesha WEAK side par hota hai</p>
                </div>
                <p className="text-muted-foreground text-xs">
                  <span className="text-yellow-400">Kaise pehchanen:</span> Ek side STRONG, dusri side WTT/WTB → Usi weak side par State of Confusion ACTIVE
                </p>
                <p className="text-red-400 text-xs mt-2">⚠️ Strong side par confusion manna galti hai</p>
              </div>

              {/* Percentage Panel */}
              <div className="p-4 bg-indigo-950/30 rounded-lg border border-indigo-800/50">
                <h3 className="font-bold text-indigo-400 mb-3">5️⃣ Percentage Panel kaise use karein</h3>
                <p className="text-muted-foreground mb-2">Confusion VALID kab hoga?</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• % 1 ghante stable rahe</li>
                  <li>• Ya 2 ghante oscillate kare (75↔80)</li>
                  <li>• Ya 3 ghante repeated up–down</li>
                </ul>
                <div className="mt-3 flex gap-2 text-xs">
                  <span className="text-red-400">❌ NSE site par ye possible nahi</span>
                  <span className="text-green-400">✅ RunAlgo me real-time visible</span>
                </div>
              </div>

              {/* Trade Entry */}
              <div className="p-4 bg-gradient-to-r from-green-950/50 to-emerald-950/30 rounded-lg border border-green-800/50">
                <h3 className="font-bold text-green-400 mb-3">6️⃣ Trade kab lena hai (Most Important Part)</h3>
                <div className="bg-red-900/30 p-3 rounded mb-3">
                  <p className="text-red-400 font-semibold text-center">⚠️ Confusion ≠ Entry</p>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="font-semibold text-amber-400 mb-1">Agar Confusion Resistance Side par hai:</p>
                    <p className="text-muted-foreground">Market pehle neeche girega → PUT extension (jaise 24150/24140) tak aayega → Wahi se <span className="text-green-400 font-semibold">BUY CALL</span></p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="font-semibold text-amber-400 mb-1">Agar Confusion Support Side par hai:</p>
                    <p className="text-muted-foreground">Market pehle upar jayega → CALL extension (jaise 24300+) touch karega → Wahi se <span className="text-red-400 font-semibold">BUY PUT</span></p>
                  </div>
                </div>
              </div>

              {/* Live Example */}
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
                <h3 className="font-bold text-slate-300 mb-3">7️⃣ Live Example</h3>
                <div className="p-3 bg-slate-900/50 rounded text-xs font-mono">
                  <p className="text-amber-400">"Market abhi 24275 par hai, RunAlgo dikha raha hai:</p>
                  <p className="text-green-400 ml-4">• Support STRONG</p>
                  <p className="text-red-400 ml-4">• Resistance WTB (94 mins)</p>
                  <p className="text-white mt-2">Matlab confusion CALL side par hai.</p>
                  <p className="text-muted-foreground mt-2">Ab main trade nahi lunga.<br/>Main wait karunga market ke 24150 extension tak aane ka.<br/>Wahi se CALL buy karunga."</p>
                </div>
              </div>

              {/* Common Mistakes */}
              <div className="p-4 bg-red-950/30 rounded-lg border border-red-800/50">
                <h3 className="font-bold text-red-400 mb-3">8️⃣ Common User Mistakes (Page par kya na karein)</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-red-900/30 rounded flex items-center gap-2">
                    <span className="text-red-500">❌</span> Confusion dikhte hi trade
                  </div>
                  <div className="p-2 bg-red-900/30 rounded flex items-center gap-2">
                    <span className="text-red-500">❌</span> Beech market se entry
                  </div>
                  <div className="p-2 bg-red-900/30 rounded flex items-center gap-2">
                    <span className="text-red-500">❌</span> Percentage ignore karna
                  </div>
                  <div className="p-2 bg-red-900/30 rounded flex items-center gap-2">
                    <span className="text-red-500">❌</span> Extension wait na karna
                  </div>
                </div>
              </div>

              {/* Page Flow */}
              <div className="p-4 bg-cyan-950/30 rounded-lg border border-cyan-800/50">
                <h3 className="font-bold text-cyan-400 mb-3">9️⃣ Page Use karne ka Correct Flow</h3>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>ATM aur strikes dekhiye</li>
                  <li>Support / Resistance identify kariye</li>
                  <li>Strength labels padhiye</li>
                  <li>Weak side par confusion note kariye</li>
                  <li>Percentage behavior confirm kariye</li>
                  <li>Extension level ka wait kariye</li>
                  <li>Phir hi trade plan kariye</li>
                </ol>
              </div>

              {/* Why RunAlgo */}
              <div className="p-4 bg-gradient-to-r from-amber-950/50 to-yellow-950/30 rounded-lg border border-amber-800/50">
                <h3 className="font-bold text-amber-400 mb-3">🔟 Is Tool ka Advantage kya hai? (Why RunAlgo?)</h3>
                <div className="grid md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-red-900/20 rounded">
                    <p className="text-red-400 font-semibold mb-2">❌ Normal Option Chain (NSE / Public)</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Sirf Volume aur OI numbers</li>
                      <li>• Percentage nahi dikhta</li>
                      <li>• Strength/Weakness clear nahi</li>
                      <li>• State of Confusion pehchanna impossible</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-green-900/20 rounded">
                    <p className="text-green-400 font-semibold mb-2">✅ RunAlgo Option Chain Tool</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Live MTM (market ke saath update)</li>
                      <li>• Volume + OI ka percentage share</li>
                      <li>• Clear labels: STRONG / WTT / WTB</li>
                      <li>• Confusion side direct identify</li>
                      <li>• Emotional trading se bachata hai</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <h3 className="font-bold text-slate-400 mb-2">⚠️ Important Disclaimer</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>❌ Ye tool direct BUY/SELL signal nahi deta</li>
                  <li>❌ Ye guarantee nahi deta ki trade milega hi milega</li>
                  <li>✅ Ye tool market ka pressure aur intention dikhata hai</li>
                  <li>✅ Trade lena hai jab market extension level touch kare</li>
                </ul>
              </div>

              {/* Philosophy */}
              <div className="p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-lg border border-amber-500/30 text-center">
                <p className="text-amber-400 font-bold text-lg mb-2">RunAlgo Core Philosophy</p>
                <p className="text-muted-foreground italic">"RunAlgo ek indicator nahi hai — Ye market ka X-ray hai"</p>
                <p className="text-xs text-muted-foreground mt-3">Trade tab lo jab market aapko jagah de</p>
              </div>

              {/* Final Summary */}
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                <h3 className="font-bold text-primary mb-3">📌 Final Summary</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Confusion signal hai, entry nahi</li>
                  <li>• Strong side safe hoti hai</li>
                  <li>• Weak side opportunity ban sakti hai</li>
                  <li>• Extension bina touch hue trade mat lo</li>
                  <li>• Market ko follow karo, force mat karo</li>
                </ul>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportResistance;
