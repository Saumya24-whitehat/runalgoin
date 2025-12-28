import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { TickerRibbon } from '@/components/TickerRibbon';
import { RefreshCw, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface OptionData {
  strike_price: number;
  underlying_spot_price: number;
  pcr: number;
  call_options: {
    market_data: {
      ltp: number;
      volume: number;
      oi: number;
      prev_oi: number;
      bid_price: number;
      ask_price: number;
    };
    option_greeks: {
      iv: number;
      delta: number;
      theta: number;
      gamma: number;
      vega: number;
    };
  };
  put_options: {
    market_data: {
      ltp: number;
      volume: number;
      oi: number;
      prev_oi: number;
      bid_price: number;
      ask_price: number;
    };
    option_greeks: {
      iv: number;
      delta: number;
      theta: number;
      gamma: number;
      vega: number;
    };
  };
}

type ViewMode = 'ltp_oi' | 'oi_iv' | 'ltp_greeks' | 'oi_greeks';

// Time slots from 9:15 AM to 3:30 PM in 1-minute intervals
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let h = 9; h <= 15; h++) {
    const startMin = h === 9 ? 15 : 0;
    const endMin = h === 15 ? 30 : 59;
    for (let m = startMin; m <= endMin; m++) {
      const hour = h.toString().padStart(2, '0');
      const min = m.toString().padStart(2, '0');
      slots.push(`${hour}${min}`);
    }
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

const OptionChain = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const spotPriceRowRef = useRef<HTMLTableRowElement>(null);
  
  const [symbols, setSymbols] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('Nifty 50');
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>('');
  const [optionData, setOptionData] = useState<OptionData[]>([]);
  const [spotPrice, setSpotPrice] = useState<number>(0);
  const [strikeCount, setStrikeCount] = useState<string>('9');
  const [viewMode, setViewMode] = useState<ViewMode>('ltp_oi');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isHistoricalMode, setIsHistoricalMode] = useState(false);
  
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [loadingChain, setLoadingChain] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch symbols on mount
  useEffect(() => {
    fetchSymbols();
  }, []);

  // Auto-fetch when symbol changes and expiry is loaded
  useEffect(() => {
    if (selectedSymbol) {
      fetchExpiryDates(selectedSymbol);
    }
  }, [selectedSymbol]);

  // Auto-load data when expiry is set
  useEffect(() => {
    if (selectedExpiry && selectedSymbol) {
      fetchOptionChain();
    }
  }, [selectedExpiry]);

  // Scroll to spot price row on mobile when data loads
  useEffect(() => {
    if (spotPriceRowRef.current && tableContainerRef.current) {
      setTimeout(() => {
        spotPriceRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [optionData, spotPrice]);

  const fetchSymbols = async () => {
    setLoadingSymbols(true);
    try {
      const { data, error } = await supabase.functions.invoke('option-chain', {
        body: { action: 'getSymbols' }
      });
      
      if (error) throw error;
      
      const indexSymbols = ['Nifty 50', 'Nifty Bank', 'Nifty Fin Service', 'Nifty Mid Select'];
      const stockSymbols = data.symbols || [];
      setSymbols([...indexSymbols, ...stockSymbols]);
    } catch (error) {
      console.error('Error fetching symbols:', error);
    } finally {
      setLoadingSymbols(false);
    }
  };

  const fetchExpiryDates = async (symbol: string) => {
    setLoadingExpiry(true);
    try {
      const { data, error } = await supabase.functions.invoke('option-chain', {
        body: { action: 'getExpiryDates', symbol }
      });
      
      if (error) throw error;
      
      const dates = data.expiry_dates || [];
      setExpiryDates(dates);
      if (dates.length > 0) {
        setSelectedExpiry(dates[0]);
      }
    } catch (error) {
      console.error('Error fetching expiry dates:', error);
    } finally {
      setLoadingExpiry(false);
    }
  };

  const fetchOptionChain = async () => {
    if (!selectedSymbol || !selectedExpiry) return;
    
    setLoadingChain(true);
    try {
      const body: any = { 
        action: 'getOptionChain', 
        symbol: selectedSymbol, 
        expiry_date: selectedExpiry 
      };
      
      if (isHistoricalMode && selectedTime) {
        body.time = selectedTime;
      }
      
      const { data, error } = await supabase.functions.invoke('option-chain', { body });
      
      if (error) throw error;
      
      const chainData = data.option_chain?.data || [];
      setOptionData(chainData);
      
      if (chainData.length > 0) {
        setSpotPrice(chainData[0].underlying_spot_price);
      }
    } catch (error) {
      console.error('Error fetching option chain:', error);
    } finally {
      setLoadingChain(false);
    }
  };

  const handleTimeChange = (direction: 'prev' | 'next') => {
    const currentIndex = TIME_SLOTS.indexOf(selectedTime);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedTime(TIME_SLOTS[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < TIME_SLOTS.length - 1) {
      setSelectedTime(TIME_SLOTS[currentIndex + 1]);
    }
  };

  const resetToLive = () => {
    setIsHistoricalMode(false);
    setSelectedTime('');
    fetchOptionChain();
  };

  const enableHistoricalMode = () => {
    if (!isHistoricalMode) {
      setIsHistoricalMode(true);
      // Set current time as default
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMin = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHour}${currentMin}`;
      // Find closest valid time slot
      const closestSlot = TIME_SLOTS.reduce((prev, curr) => {
        return Math.abs(parseInt(curr) - parseInt(currentTime)) < Math.abs(parseInt(prev) - parseInt(currentTime)) ? curr : prev;
      }, TIME_SLOTS[0]);
      setSelectedTime(closestSlot);
    }
  };

  // Filter data based on strike count around ATM
  const getFilteredData = () => {
    if (optionData.length === 0) return [];
    
    const count = parseInt(strikeCount);
    const atmIndex = optionData.findIndex(d => d.strike_price >= spotPrice);
    const startIndex = Math.max(0, atmIndex - count);
    const endIndex = Math.min(optionData.length, atmIndex + count + 1);
    
    return optionData.slice(startIndex, endIndex);
  };

  const formatNumber = (num: number) => {
    if (Math.abs(num) >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
    if (Math.abs(num) >= 100000) return (num / 100000).toFixed(2) + ' L';
    if (Math.abs(num) >= 1000) return (num / 1000).toFixed(2) + ' K';
    return num.toFixed(2);
  };

  const formatOI = (num: number) => {
    if (num >= 10000000) return (num / 10000000).toFixed(2);
    if (num >= 100000) return (num / 100000).toFixed(2);
    return num.toFixed(2);
  };

  const getCellColor = (value: number) => {
    if (value > 0) return 'text-emerald-400';
    if (value < 0) return 'text-red-400';
    return 'text-muted-foreground';
  };

  const isITM = (strike: number, type: 'call' | 'put') => {
    if (type === 'call') return strike < spotPrice;
    return strike > spotPrice;
  };

  const isATM = (strike: number) => {
    const diff = Math.abs(strike - spotPrice);
    return diff <= 50;
  };

  const getMaxOI = (type: 'call' | 'put') => {
    const filteredData = getFilteredData();
    if (filteredData.length === 0) return 0;
    
    if (type === 'call') {
      return Math.max(...filteredData.map(d => d.call_options.market_data.oi));
    }
    return Math.max(...filteredData.map(d => d.put_options.market_data.oi));
  };

  // Find where spot price should be inserted
  const getSpotPricePosition = () => {
    const filtered = getFilteredData();
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].strike_price >= spotPrice) {
        return i;
      }
    }
    return filtered.length;
  };

  const maxCallOI = getMaxOI('call');
  const maxPutOI = getMaxOI('put');
  const filteredData = getFilteredData();
  const spotPricePosition = getSpotPricePosition();

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
    </div>;
  }

  const renderSpotPriceRow = () => (
    <TableRow ref={spotPriceRowRef} className="bg-primary/20 border-y-2 border-primary">
      <TableCell colSpan={viewMode === 'ltp_oi' || viewMode === 'oi_iv' ? 9 : 9} className="py-2">
        <div className="flex items-center justify-center">
          <div className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-bold text-lg shadow-lg">
            {spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <TickerRibbon />
      
      <div className="container mx-auto px-2 sm:px-4 py-4">
        <Card className="bg-card border-border/30 shadow-xl">
          <CardContent className="p-3 sm:p-6">
            {/* Controls */}
            <div className="flex flex-wrap gap-3 mb-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Symbol</label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol} disabled={loadingSymbols}>
                  <SelectTrigger className="w-[140px] sm:w-[160px] bg-background/50">
                    <SelectValue placeholder="Select Symbol" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {symbols.map((sym) => (
                      <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Expiry</label>
                <Select value={selectedExpiry} onValueChange={setSelectedExpiry} disabled={loadingExpiry}>
                  <SelectTrigger className="w-[120px] sm:w-[140px] bg-background/50">
                    <SelectValue placeholder="Expiry" />
                  </SelectTrigger>
                  <SelectContent>
                    {expiryDates.map((date) => (
                      <SelectItem key={date} value={date}>{date}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Strikes</label>
                <Select value={strikeCount} onValueChange={setStrikeCount}>
                  <SelectTrigger className="w-[70px] bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['5', '7', '9', '11', '15', '20', '25'].map((count) => (
                      <SelectItem key={count} value={count}>{count}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Historical Time Picker */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-primary/50"
                  onClick={() => { enableHistoricalMode(); handleTimeChange('prev'); }}
                  disabled={!isHistoricalMode || TIME_SLOTS.indexOf(selectedTime) <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant={isHistoricalMode ? "default" : "outline"}
                  className={`h-9 px-3 flex items-center gap-2 ${isHistoricalMode ? 'bg-cyan-600 hover:bg-cyan-700' : 'border-primary/50'}`}
                  onClick={enableHistoricalMode}
                >
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {isHistoricalMode ? formatTimeDisplay(selectedTime) : 'Live'}
                  </span>
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-primary/50"
                  onClick={() => { enableHistoricalMode(); handleTimeChange('next'); }}
                  disabled={!isHistoricalMode || TIME_SLOTS.indexOf(selectedTime) >= TIME_SLOTS.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {isHistoricalMode && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-9 bg-cyan-600 hover:bg-cyan-700"
                    onClick={resetToLive}
                  >
                    Reset
                  </Button>
                )}
              </div>

              <Button 
                onClick={fetchOptionChain} 
                disabled={loadingChain} 
                className="bg-primary hover:bg-primary/90 h-9"
              >
                {loadingChain ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                Refresh
              </Button>
            </div>

            {/* View Mode Tabs */}
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-border/30">
              {[
                { mode: 'ltp_oi' as ViewMode, label: 'LTP & OI', color: 'cyan' },
                { mode: 'oi_iv' as ViewMode, label: 'OI & IV', color: 'cyan' },
                { mode: 'ltp_greeks' as ViewMode, label: 'LTP & Greeks', color: 'emerald' },
                { mode: 'oi_greeks' as ViewMode, label: 'OI & Greeks', color: 'amber' },
              ].map(({ mode, label, color }) => (
                <Button 
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className={viewMode === mode ? `bg-${color}-600 hover:bg-${color}-700 border-${color}-600` : 'border-border/50'}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Option Chain Table */}
            <div 
              ref={tableContainerRef}
              className="overflow-x-auto scrollbar-thin scrollbar-track-muted/20 scrollbar-thumb-muted/50"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {loadingChain ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredData.length > 0 ? (
                <Table className="min-w-[800px]">
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="border-border/30 bg-card">
                      <TableHead colSpan={4} className="text-center bg-red-500/10 text-red-400 font-bold text-sm py-3">
                        CALL
                      </TableHead>
                      <TableHead className="text-center bg-muted/30 font-bold text-sm py-3 sticky left-0 z-20 bg-card border-x border-border/30">
                        STRIKE
                      </TableHead>
                      <TableHead colSpan={4} className="text-center bg-emerald-500/10 text-emerald-400 font-bold text-sm py-3">
                        PUT
                      </TableHead>
                    </TableRow>
                    <TableRow className="border-border/30 bg-muted/5">
                      {/* Call Headers */}
                      {viewMode === 'ltp_oi' && (
                        <>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">OI (L)</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">COI</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">LTP</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Chg%</TableHead>
                        </>
                      )}
                      {viewMode === 'oi_iv' && (
                        <>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">OI (L)</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">COI</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">IV</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Vol</TableHead>
                        </>
                      )}
                      {viewMode === 'ltp_greeks' && (
                        <>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">LTP</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Delta</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Theta</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Vega</TableHead>
                        </>
                      )}
                      {viewMode === 'oi_greeks' && (
                        <>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">OI</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Delta</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Gamma</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">IV</TableHead>
                        </>
                      )}
                      
                      <TableHead className="text-center text-xs py-2 sticky left-0 z-20 bg-muted/20 border-x border-border/30 text-foreground font-medium">
                        PCR
                      </TableHead>
                      
                      {/* Put Headers */}
                      {viewMode === 'ltp_oi' && (
                        <>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Chg%</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">LTP</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">COI</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">OI (L)</TableHead>
                        </>
                      )}
                      {viewMode === 'oi_iv' && (
                        <>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Vol</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">IV</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">COI</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">OI (L)</TableHead>
                        </>
                      )}
                      {viewMode === 'ltp_greeks' && (
                        <>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Vega</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Theta</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Delta</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">LTP</TableHead>
                        </>
                      )}
                      {viewMode === 'oi_greeks' && (
                        <>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">IV</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Gamma</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">Delta</TableHead>
                          <TableHead className="text-center text-xs py-2 text-muted-foreground">OI</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row, index) => {
                      const callCOI = row.call_options.market_data.oi - row.call_options.market_data.prev_oi;
                      const putCOI = row.put_options.market_data.oi - row.put_options.market_data.prev_oi;
                      const callITM = isITM(row.strike_price, 'call');
                      const putITM = isITM(row.strike_price, 'put');
                      const isMaxCallOI = row.call_options.market_data.oi === maxCallOI;
                      const isMaxPutOI = row.put_options.market_data.oi === maxPutOI;
                      
                      // Calculate percentage change
                      const callPrevOI = row.call_options.market_data.prev_oi || 1;
                      const putPrevOI = row.put_options.market_data.prev_oi || 1;
                      const callOIChange = ((row.call_options.market_data.oi - callPrevOI) / callPrevOI) * 100;
                      const putOIChange = ((row.put_options.market_data.oi - putPrevOI) / putPrevOI) * 100;
                      
                      const showSpotPrice = index === spotPricePosition;
                      
                      return (
                        <>
                          {showSpotPrice && renderSpotPriceRow()}
                          <TableRow 
                            key={row.strike_price} 
                            className="border-border/20 hover:bg-muted/10 transition-colors"
                          >
                            {/* Call Data */}
                            {viewMode === 'ltp_oi' && (
                              <>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''} ${isMaxCallOI ? 'bg-cyan-500/20' : ''}`}>
                                  <span className={getCellColor(callOIChange)}>{formatOI(row.call_options.market_data.oi)}</span>
                                  <div className={`text-[10px] ${getCellColor(callOIChange)}`}>
                                    {callOIChange >= 0 ? '+' : ''}{callOIChange.toFixed(2)}%
                                  </div>
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''}`}>
                                  <span className={getCellColor(callCOI)}>{formatNumber(callCOI)}</span>
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 font-medium ${callITM ? 'bg-amber-500/5' : ''}`}>
                                  <span className={getCellColor(row.call_options.market_data.ltp - (row.call_options.market_data.bid_price || 0))}>
                                    {row.call_options.market_data.ltp.toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''}`}>
                                  <span className={getCellColor(callOIChange)}>
                                    {callOIChange >= 0 ? '+' : ''}{callOIChange.toFixed(2)}%
                                  </span>
                                </TableCell>
                              </>
                            )}
                            {viewMode === 'oi_iv' && (
                              <>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''} ${isMaxCallOI ? 'bg-cyan-500/20' : ''}`}>
                                  {formatOI(row.call_options.market_data.oi)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''}`}>
                                  <span className={getCellColor(callCOI)}>{formatNumber(callCOI)}</span>
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''}`}>
                                  {row.call_options.option_greeks.iv.toFixed(2)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''}`}>
                                  {formatNumber(row.call_options.market_data.volume)}
                                </TableCell>
                              </>
                            )}
                            {viewMode === 'ltp_greeks' && (
                              <>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''}`}>
                                  {row.call_options.market_data.ltp.toFixed(2)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''}`}>
                                  {row.call_options.option_greeks.delta.toFixed(4)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''}`}>
                                  {row.call_options.option_greeks.theta.toFixed(4)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''}`}>
                                  {row.call_options.option_greeks.vega.toFixed(4)}
                                </TableCell>
                              </>
                            )}
                            {viewMode === 'oi_greeks' && (
                              <>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''} ${isMaxCallOI ? 'bg-cyan-500/20' : ''}`}>
                                  {formatOI(row.call_options.market_data.oi)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''}`}>
                                  {row.call_options.option_greeks.delta.toFixed(4)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''}`}>
                                  {row.call_options.option_greeks.gamma.toFixed(4)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${callITM ? 'bg-amber-500/5' : ''}`}>
                                  {row.call_options.option_greeks.iv.toFixed(2)}
                                </TableCell>
                              </>
                            )}
                            
                            {/* Strike Price with PCR */}
                            <TableCell className="text-center font-bold text-sm py-2 sticky left-0 z-10 bg-card border-x border-border/30">
                              <div className="flex flex-col items-center">
                                <span className="text-foreground">{row.strike_price.toLocaleString('en-IN')}</span>
                                <span className="text-[10px] text-muted-foreground">PCR: {row.pcr?.toFixed(2) || '-'}</span>
                              </div>
                            </TableCell>
                            
                            {/* Put Data */}
                            {viewMode === 'ltp_oi' && (
                              <>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''}`}>
                                  <span className={getCellColor(putOIChange)}>
                                    {putOIChange >= 0 ? '+' : ''}{putOIChange.toFixed(2)}%
                                  </span>
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 font-medium ${putITM ? 'bg-sky-500/5' : ''}`}>
                                  <span className={getCellColor(row.put_options.market_data.ltp - (row.put_options.market_data.bid_price || 0))}>
                                    {row.put_options.market_data.ltp.toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''}`}>
                                  <span className={getCellColor(putCOI)}>{formatNumber(putCOI)}</span>
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''} ${isMaxPutOI ? 'bg-emerald-500/20' : ''}`}>
                                  <span className={getCellColor(putOIChange)}>{formatOI(row.put_options.market_data.oi)}</span>
                                  <div className={`text-[10px] ${getCellColor(putOIChange)}`}>
                                    {putOIChange >= 0 ? '+' : ''}{putOIChange.toFixed(2)}%
                                  </div>
                                </TableCell>
                              </>
                            )}
                            {viewMode === 'oi_iv' && (
                              <>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''}`}>
                                  {formatNumber(row.put_options.market_data.volume)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''}`}>
                                  {row.put_options.option_greeks.iv.toFixed(2)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''}`}>
                                  <span className={getCellColor(putCOI)}>{formatNumber(putCOI)}</span>
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''} ${isMaxPutOI ? 'bg-emerald-500/20' : ''}`}>
                                  {formatOI(row.put_options.market_data.oi)}
                                </TableCell>
                              </>
                            )}
                            {viewMode === 'ltp_greeks' && (
                              <>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''}`}>
                                  {row.put_options.option_greeks.vega.toFixed(4)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''}`}>
                                  {row.put_options.option_greeks.theta.toFixed(4)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''}`}>
                                  {row.put_options.option_greeks.delta.toFixed(4)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''}`}>
                                  {row.put_options.market_data.ltp.toFixed(2)}
                                </TableCell>
                              </>
                            )}
                            {viewMode === 'oi_greeks' && (
                              <>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''}`}>
                                  {row.put_options.option_greeks.iv.toFixed(2)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''}`}>
                                  {row.put_options.option_greeks.gamma.toFixed(4)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''}`}>
                                  {row.put_options.option_greeks.delta.toFixed(4)}
                                </TableCell>
                                <TableCell className={`text-center text-xs py-2 ${putITM ? 'bg-sky-500/5' : ''} ${isMaxPutOI ? 'bg-emerald-500/20' : ''}`}>
                                  {formatOI(row.put_options.market_data.oi)}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Loading option chain data...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OptionChain;
