import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { TickerRibbon } from '@/components/TickerRibbon';
import { RefreshCw } from 'lucide-react';

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

const OptionChain = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [symbols, setSymbols] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('Nifty 50');
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>('');
  const [optionData, setOptionData] = useState<OptionData[]>([]);
  const [spotPrice, setSpotPrice] = useState<number>(0);
  const [strikeCount, setStrikeCount] = useState<string>('9');
  const [viewMode, setViewMode] = useState<ViewMode>('ltp_oi');
  
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

  // Fetch expiry when symbol changes
  useEffect(() => {
    if (selectedSymbol) {
      fetchExpiryDates(selectedSymbol);
    }
  }, [selectedSymbol]);

  const fetchSymbols = async () => {
    setLoadingSymbols(true);
    try {
      const { data, error } = await supabase.functions.invoke('option-chain', {
        body: { action: 'getSymbols' }
      });
      
      if (error) throw error;
      
      // Add index symbols at the beginning
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
      const { data, error } = await supabase.functions.invoke('option-chain', {
        body: { action: 'getOptionChain', symbol: selectedSymbol, expiry_date: selectedExpiry }
      });
      
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
    if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
    if (num >= 100000) return (num / 100000).toFixed(2) + ' L';
    if (num >= 1000) return (num / 1000).toFixed(2) + ' K';
    return num.toFixed(2);
  };

  const formatVolume = (num: number) => {
    if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
    if (num >= 100000) return (num / 100000).toFixed(2) + ' L';
    return num.toLocaleString('en-IN');
  };

  const getCellColor = (value: number, isCall: boolean) => {
    if (value > 0) return isCall ? 'text-red-400' : 'text-green-400';
    if (value < 0) return isCall ? 'text-green-400' : 'text-red-400';
    return '';
  };

  const isATM = (strike: number) => {
    const diff = Math.abs(strike - spotPrice);
    return diff <= 50; // Within 50 points of spot
  };

  const getMaxOI = (type: 'call' | 'put') => {
    const filteredData = getFilteredData();
    if (filteredData.length === 0) return 0;
    
    if (type === 'call') {
      return Math.max(...filteredData.map(d => d.call_options.market_data.oi));
    }
    return Math.max(...filteredData.map(d => d.put_options.market_data.oi));
  };

  const maxCallOI = getMaxOI('call');
  const maxPutOI = getMaxOI('put');

  const filteredData = getFilteredData();

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <TickerRibbon />
      
      <div className="container mx-auto px-4 py-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold">Option Chain</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Controls */}
            <div className="flex flex-wrap gap-4 mb-6 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Symbol</label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol} disabled={loadingSymbols}>
                  <SelectTrigger className="w-[160px]">
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
                <label className="text-xs text-muted-foreground">Expiry Date</label>
                <Select value={selectedExpiry} onValueChange={setSelectedExpiry} disabled={loadingExpiry}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select Expiry" />
                  </SelectTrigger>
                  <SelectContent>
                    {expiryDates.map((date) => (
                      <SelectItem key={date} value={date}>{date}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Strikes</label>
                <Select value={strikeCount} onValueChange={setStrikeCount}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['5', '7', '9', '11', '15', '20', '25'].map((count) => (
                      <SelectItem key={count} value={count}>{count}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={fetchOptionChain} disabled={loadingChain} className="bg-primary hover:bg-primary/90">
                {loadingChain ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit
              </Button>

              <div className="flex gap-2 ml-auto">
                <Button 
                  variant={viewMode === 'ltp_oi' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewMode('ltp_oi')}
                  className={viewMode === 'ltp_oi' ? 'bg-cyan-600 hover:bg-cyan-700' : ''}
                >
                  LTP & OI
                </Button>
                <Button 
                  variant={viewMode === 'oi_iv' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewMode('oi_iv')}
                  className={viewMode === 'oi_iv' ? 'bg-cyan-600 hover:bg-cyan-700' : ''}
                >
                  OI & IV
                </Button>
                <Button 
                  variant={viewMode === 'ltp_greeks' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewMode('ltp_greeks')}
                  className={viewMode === 'ltp_greeks' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  LTP & Greeks
                </Button>
                <Button 
                  variant={viewMode === 'oi_greeks' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewMode('oi_greeks')}
                  className={viewMode === 'oi_greeks' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                >
                  OI & Greeks
                </Button>
              </div>
            </div>

            {/* Spot Price Display */}
            {spotPrice > 0 && (
              <div className="mb-4 text-center">
                <span className="text-muted-foreground">Spot Price: </span>
                <span className="text-lg font-bold text-primary">{spotPrice.toFixed(2)}</span>
              </div>
            )}

            {/* Option Chain Table */}
            <div className="overflow-x-auto">
              {loadingChain ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead colSpan={4} className="text-center bg-red-500/20 text-red-400 font-bold">
                        CALL
                      </TableHead>
                      <TableHead className="text-center bg-muted/30 text-primary font-bold">
                        Strike
                      </TableHead>
                      <TableHead colSpan={4} className="text-center bg-green-500/20 text-green-400 font-bold">
                        PUT
                      </TableHead>
                    </TableRow>
                    <TableRow className="border-border/50">
                      {/* Call Headers */}
                      {viewMode === 'ltp_oi' && (
                        <>
                          <TableHead className="text-center text-xs">Volume</TableHead>
                          <TableHead className="text-center text-xs">COI</TableHead>
                          <TableHead className="text-center text-xs">OI</TableHead>
                          <TableHead className="text-center text-xs">LTP</TableHead>
                        </>
                      )}
                      {viewMode === 'oi_iv' && (
                        <>
                          <TableHead className="text-center text-xs">Volume</TableHead>
                          <TableHead className="text-center text-xs">COI</TableHead>
                          <TableHead className="text-center text-xs">OI</TableHead>
                          <TableHead className="text-center text-xs">IV</TableHead>
                        </>
                      )}
                      {viewMode === 'ltp_greeks' && (
                        <>
                          <TableHead className="text-center text-xs">LTP</TableHead>
                          <TableHead className="text-center text-xs">Delta</TableHead>
                          <TableHead className="text-center text-xs">Theta</TableHead>
                          <TableHead className="text-center text-xs">Vega</TableHead>
                        </>
                      )}
                      {viewMode === 'oi_greeks' && (
                        <>
                          <TableHead className="text-center text-xs">OI</TableHead>
                          <TableHead className="text-center text-xs">Delta</TableHead>
                          <TableHead className="text-center text-xs">Gamma</TableHead>
                          <TableHead className="text-center text-xs">IV</TableHead>
                        </>
                      )}
                      
                      <TableHead className="text-center text-xs bg-muted/20">Strike</TableHead>
                      
                      {/* Put Headers */}
                      {viewMode === 'ltp_oi' && (
                        <>
                          <TableHead className="text-center text-xs">LTP</TableHead>
                          <TableHead className="text-center text-xs">OI</TableHead>
                          <TableHead className="text-center text-xs">COI</TableHead>
                          <TableHead className="text-center text-xs">Volume</TableHead>
                        </>
                      )}
                      {viewMode === 'oi_iv' && (
                        <>
                          <TableHead className="text-center text-xs">IV</TableHead>
                          <TableHead className="text-center text-xs">OI</TableHead>
                          <TableHead className="text-center text-xs">COI</TableHead>
                          <TableHead className="text-center text-xs">Volume</TableHead>
                        </>
                      )}
                      {viewMode === 'ltp_greeks' && (
                        <>
                          <TableHead className="text-center text-xs">Vega</TableHead>
                          <TableHead className="text-center text-xs">Theta</TableHead>
                          <TableHead className="text-center text-xs">Delta</TableHead>
                          <TableHead className="text-center text-xs">LTP</TableHead>
                        </>
                      )}
                      {viewMode === 'oi_greeks' && (
                        <>
                          <TableHead className="text-center text-xs">IV</TableHead>
                          <TableHead className="text-center text-xs">Gamma</TableHead>
                          <TableHead className="text-center text-xs">Delta</TableHead>
                          <TableHead className="text-center text-xs">OI</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row) => {
                      const callCOI = row.call_options.market_data.oi - row.call_options.market_data.prev_oi;
                      const putCOI = row.put_options.market_data.oi - row.put_options.market_data.prev_oi;
                      const isATMStrike = isATM(row.strike_price);
                      const isMaxCallOI = row.call_options.market_data.oi === maxCallOI;
                      const isMaxPutOI = row.put_options.market_data.oi === maxPutOI;
                      
                      return (
                        <TableRow 
                          key={row.strike_price} 
                          className={`border-border/30 ${isATMStrike ? 'bg-yellow-500/10' : ''}`}
                        >
                          {/* Call Data */}
                          {viewMode === 'ltp_oi' && (
                            <>
                              <TableCell className="text-center text-xs">{formatVolume(row.call_options.market_data.volume)}</TableCell>
                              <TableCell className={`text-center text-xs ${getCellColor(callCOI, true)}`}>
                                {formatNumber(callCOI)}
                              </TableCell>
                              <TableCell className={`text-center text-xs ${isMaxCallOI ? 'bg-cyan-500/30 font-bold' : ''}`}>
                                {formatNumber(row.call_options.market_data.oi)}
                              </TableCell>
                              <TableCell className="text-center text-xs">{row.call_options.market_data.ltp.toFixed(2)}</TableCell>
                            </>
                          )}
                          {viewMode === 'oi_iv' && (
                            <>
                              <TableCell className="text-center text-xs">{formatVolume(row.call_options.market_data.volume)}</TableCell>
                              <TableCell className={`text-center text-xs ${getCellColor(callCOI, true)}`}>
                                {formatNumber(callCOI)}
                              </TableCell>
                              <TableCell className={`text-center text-xs ${isMaxCallOI ? 'bg-cyan-500/30 font-bold' : ''}`}>
                                {formatNumber(row.call_options.market_data.oi)}
                              </TableCell>
                              <TableCell className="text-center text-xs">{row.call_options.option_greeks.iv.toFixed(2)}</TableCell>
                            </>
                          )}
                          {viewMode === 'ltp_greeks' && (
                            <>
                              <TableCell className="text-center text-xs">{row.call_options.market_data.ltp.toFixed(2)}</TableCell>
                              <TableCell className="text-center text-xs">{row.call_options.option_greeks.delta.toFixed(4)}</TableCell>
                              <TableCell className="text-center text-xs">{row.call_options.option_greeks.theta.toFixed(4)}</TableCell>
                              <TableCell className="text-center text-xs">{row.call_options.option_greeks.vega.toFixed(4)}</TableCell>
                            </>
                          )}
                          {viewMode === 'oi_greeks' && (
                            <>
                              <TableCell className={`text-center text-xs ${isMaxCallOI ? 'bg-cyan-500/30 font-bold' : ''}`}>
                                {formatNumber(row.call_options.market_data.oi)}
                              </TableCell>
                              <TableCell className="text-center text-xs">{row.call_options.option_greeks.delta.toFixed(4)}</TableCell>
                              <TableCell className="text-center text-xs">{row.call_options.option_greeks.gamma.toFixed(4)}</TableCell>
                              <TableCell className="text-center text-xs">{row.call_options.option_greeks.iv.toFixed(2)}</TableCell>
                            </>
                          )}
                          
                          {/* Strike Price */}
                          <TableCell className={`text-center font-bold text-sm ${isATMStrike ? 'text-yellow-400 bg-yellow-500/20' : 'text-primary'}`}>
                            {row.strike_price}
                          </TableCell>
                          
                          {/* Put Data */}
                          {viewMode === 'ltp_oi' && (
                            <>
                              <TableCell className="text-center text-xs">{row.put_options.market_data.ltp.toFixed(2)}</TableCell>
                              <TableCell className={`text-center text-xs ${isMaxPutOI ? 'bg-green-500/30 font-bold' : ''}`}>
                                {formatNumber(row.put_options.market_data.oi)}
                              </TableCell>
                              <TableCell className={`text-center text-xs ${getCellColor(putCOI, false)}`}>
                                {formatNumber(putCOI)}
                              </TableCell>
                              <TableCell className="text-center text-xs">{formatVolume(row.put_options.market_data.volume)}</TableCell>
                            </>
                          )}
                          {viewMode === 'oi_iv' && (
                            <>
                              <TableCell className="text-center text-xs">{row.put_options.option_greeks.iv.toFixed(2)}</TableCell>
                              <TableCell className={`text-center text-xs ${isMaxPutOI ? 'bg-green-500/30 font-bold' : ''}`}>
                                {formatNumber(row.put_options.market_data.oi)}
                              </TableCell>
                              <TableCell className={`text-center text-xs ${getCellColor(putCOI, false)}`}>
                                {formatNumber(putCOI)}
                              </TableCell>
                              <TableCell className="text-center text-xs">{formatVolume(row.put_options.market_data.volume)}</TableCell>
                            </>
                          )}
                          {viewMode === 'ltp_greeks' && (
                            <>
                              <TableCell className="text-center text-xs">{row.put_options.option_greeks.vega.toFixed(4)}</TableCell>
                              <TableCell className="text-center text-xs">{row.put_options.option_greeks.theta.toFixed(4)}</TableCell>
                              <TableCell className="text-center text-xs">{row.put_options.option_greeks.delta.toFixed(4)}</TableCell>
                              <TableCell className="text-center text-xs">{row.put_options.market_data.ltp.toFixed(2)}</TableCell>
                            </>
                          )}
                          {viewMode === 'oi_greeks' && (
                            <>
                              <TableCell className="text-center text-xs">{row.put_options.option_greeks.iv.toFixed(2)}</TableCell>
                              <TableCell className="text-center text-xs">{row.put_options.option_greeks.gamma.toFixed(4)}</TableCell>
                              <TableCell className="text-center text-xs">{row.put_options.option_greeks.delta.toFixed(4)}</TableCell>
                              <TableCell className={`text-center text-xs ${isMaxPutOI ? 'bg-green-500/30 font-bold' : ''}`}>
                                {formatNumber(row.put_options.market_data.oi)}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Select a symbol and expiry date, then click Submit to load option chain data
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
