import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { TickerRibbon } from '@/components/TickerRibbon';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Download, RefreshCw, Plus, Copy, Settings, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import OptionBuilderChart from '@/components/optionBuilder/OptionBuilderChart';
import OptionBuilderPositions from '@/components/optionBuilder/OptionBuilderPositions';
import OptionBuilderGreeks from '@/components/optionBuilder/OptionBuilderGreeks';
import OptionBuilderMetrics from '@/components/optionBuilder/OptionBuilderMetrics';
import OptionBuilderStrategies from '@/components/optionBuilder/OptionBuilderStrategies';
import OptionBuilderChain from '@/components/optionBuilder/OptionBuilderChain';
import { 
  Position, 
  OptionChainResponse,
  ExpiryData,
  generatePLChartData, 
  findBreakevenPoints,
  calculateTotalGreeks,
  fetchOptionChainData,
  calculateMargin,
  formatIndianNumber,
} from '@/services/optionBuilderApi';

const SYMBOLS = [
  { value: 'Nifty 50', label: 'NIFTY' },
  { value: 'Nifty Bank', label: 'BANKNIFTY' },
  { value: 'Nifty Fin Service', label: 'FINNIFTY' },
  { value: 'Nifty Mid Select', label: 'MIDCPNIFTY' },
];

const OptionBuilder = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [symbol, setSymbol] = useState('Nifty 50');
  const [optionChainData, setOptionChainData] = useState<OptionChainResponse | null>(null);
  const [expiries, setExpiries] = useState<string[]>([]);
  const [activeExpiry, setActiveExpiry] = useState<string>('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [lotSize, setLotSize] = useState(75);
  const [showStrategies, setShowStrategies] = useState(true);
  const [showOptionChain, setShowOptionChain] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [margin, setMargin] = useState<number>(0);

  // Handle authentication
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Fetch option chain data when symbol changes
  useEffect(() => {
    const loadOptionChainData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchOptionChainData(symbol);
        console.log('Option chain data:', data);
        setOptionChainData(data);
        
        // Set lot size from API
        setLotSize(data.lot || 75);
        
        // Set current price
        setCurrentPrice(data.spotPrice || 24000);

        // Extract expiry dates from expiryWise
        if (data.expiryWise) {
          const expiryKeys = Object.keys(data.expiryWise).sort();
          setExpiries(expiryKeys);
          if (expiryKeys.length > 0 && !activeExpiry) {
            setActiveExpiry(expiryKeys[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching option chain data:', error);
        toast.error('Failed to load option chain data');
      } finally {
        setIsLoading(false);
      }
    };

    loadOptionChainData();
  }, [symbol]);

  // Calculate margin when positions change
  useEffect(() => {
    const loadMargin = async () => {
      const enabledPositions = positions.filter(p => p.enabled && !p.exitPrice);
      if (enabledPositions.length === 0) {
        setMargin(0);
        return;
      }

      const marginPositions = enabledPositions.map(p => ({
        instrumentKey: p.instrumentToken || '',
        side: p.action === 'Buy' ? 'B' : 'S',
        quantity: p.lots * p.lotSize,
        product: 'D',
      }));

      try {
        const marginData = await calculateMargin(marginPositions);
        setMargin(marginData.finalMargin || 0);
      } catch (error) {
        console.error('Error calculating margin:', error);
      }
    };

    loadMargin();
  }, [positions]);

  // Get current expiry data
  const currentExpiryData: ExpiryData | null = optionChainData?.expiryWise?.[activeExpiry] || null;

  // Calculate chart data
  const chartData = generatePLChartData(positions, currentPrice, 0.03);
  const breakevens = findBreakevenPoints(chartData.expiry);
  const greeks = calculateTotalGreeks(positions);

  // Calculate metrics
  const enabledPositions = positions.filter(p => p.enabled);
  let maxProfit: number | 'Unlimited' = -Infinity;
  let maxLoss: number | 'Unlimited' = Infinity;
  
  if (chartData.expiry.length > 0) {
    chartData.expiry.forEach(([, pl]) => {
      if (typeof maxProfit === 'number' && pl > maxProfit) maxProfit = pl;
      if (typeof maxLoss === 'number' && pl < maxLoss) maxLoss = pl;
    });
  }

  // Check for unlimited profit/loss
  const longCalls = enabledPositions.filter(p => p.action === 'Buy' && p.optType === 'CE' && !p.exitPrice).reduce((sum, p) => sum + p.lots, 0);
  const shortCalls = enabledPositions.filter(p => p.action === 'Sell' && p.optType === 'CE' && !p.exitPrice).reduce((sum, p) => sum + p.lots, 0);
  const longPuts = enabledPositions.filter(p => p.action === 'Buy' && p.optType === 'PE' && !p.exitPrice).reduce((sum, p) => sum + p.lots, 0);
  const shortPuts = enabledPositions.filter(p => p.action === 'Sell' && p.optType === 'PE' && !p.exitPrice).reduce((sum, p) => sum + p.lots, 0);

  if (longCalls !== shortCalls || longPuts !== shortPuts) {
    if (longCalls > shortCalls || longPuts > shortPuts) {
      maxProfit = 'Unlimited';
    }
    if (shortCalls > longCalls || shortPuts > longPuts) {
      maxLoss = 'Unlimited';
    }
  }

  // Current P&L
  const currentPL = enabledPositions.reduce((total, pos) => {
    if (pos.exitPrice !== undefined) {
      return total + (pos.exitPrice - pos.entryPrice) * pos.lots * pos.lotSize * (pos.action === 'Buy' ? 1 : -1);
    }
    return total + (pos.currentPrice - pos.entryPrice) * pos.lots * pos.lotSize * (pos.action === 'Buy' ? 1 : -1);
  }, 0);

  const addPosition = useCallback((newPosition: Omit<Position, 'id' | 'enabled'>) => {
    const position: Position = {
      ...newPosition,
      id: Math.random().toString(36).substr(2, 9),
      enabled: true,
    };
    setPositions(prev => [...prev, position]);
    setShowStrategies(false);
    toast.success(`${newPosition.action} ${newPosition.strike} ${newPosition.optType} added`);
  }, []);

  const removePosition = useCallback((id: string) => {
    setPositions(prev => prev.filter(p => p.id !== id));
    toast.success('Position removed');
  }, []);

  const togglePosition = useCallback((id: string) => {
    setPositions(prev => prev.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ));
  }, []);

  const exitPosition = useCallback((id: string, exitPrice: number) => {
    setPositions(prev => prev.map(p => 
      p.id === id ? { ...p, exitPrice } : p
    ));
    toast.success('Position exited');
  }, []);

  const updatePosition = useCallback((id: string, updates: Partial<Position>) => {
    setPositions(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  }, []);

  const reEntryPosition = useCallback((id: string) => {
    setPositions(prev => prev.map(p => 
      p.id === id ? { ...p, exitPrice: undefined } : p
    ));
    toast.success('Position re-entered');
  }, []);

  const clearAllPositions = useCallback(() => {
    setPositions([]);
    setShowStrategies(true);
    toast.success('All positions cleared');
  }, []);

  const handleAddStrategy = useCallback((strategyType: string) => {
    const today = new Date().toISOString().split('T')[0];
    const strikeDiff = symbol.includes('Bank') ? 100 : 50;
    const atm = Math.round(currentPrice / strikeDiff) * strikeDiff;

    switch (strategyType) {
      case 'buy-call':
        addPosition({
          action: 'Buy',
          lots: 1,
          date: today,
          expiry: activeExpiry,
          strike: atm,
          optType: 'CE',
          entryPrice: 250,
          currentPrice: 250,
          IV: 15,
          lotSize,
        });
        break;
      case 'sell-put':
        addPosition({
          action: 'Sell',
          lots: 1,
          date: today,
          expiry: activeExpiry,
          strike: atm,
          optType: 'PE',
          entryPrice: 200,
          currentPrice: 200,
          IV: 15,
          lotSize,
        });
        break;
      case 'bull-call-spread':
        addPosition({
          action: 'Buy',
          lots: 1,
          date: today,
          expiry: activeExpiry,
          strike: atm,
          optType: 'CE',
          entryPrice: 250,
          currentPrice: 250,
          IV: 15,
          lotSize,
        });
        addPosition({
          action: 'Sell',
          lots: 1,
          date: today,
          expiry: activeExpiry,
          strike: atm + strikeDiff * 2,
          optType: 'CE',
          entryPrice: 180,
          currentPrice: 180,
          IV: 14,
          lotSize,
        });
        break;
      case 'iron-condor':
        addPosition({
          action: 'Sell',
          lots: 1,
          date: today,
          expiry: activeExpiry,
          strike: atm - strikeDiff * 2,
          optType: 'PE',
          entryPrice: 150,
          currentPrice: 150,
          IV: 14,
          lotSize,
        });
        addPosition({
          action: 'Buy',
          lots: 1,
          date: today,
          expiry: activeExpiry,
          strike: atm - strikeDiff * 4,
          optType: 'PE',
          entryPrice: 80,
          currentPrice: 80,
          IV: 15,
          lotSize,
        });
        addPosition({
          action: 'Sell',
          lots: 1,
          date: today,
          expiry: activeExpiry,
          strike: atm + strikeDiff * 2,
          optType: 'CE',
          entryPrice: 150,
          currentPrice: 150,
          IV: 14,
          lotSize,
        });
        addPosition({
          action: 'Buy',
          lots: 1,
          date: today,
          expiry: activeExpiry,
          strike: atm + strikeDiff * 4,
          optType: 'CE',
          entryPrice: 80,
          currentPrice: 80,
          IV: 15,
          lotSize,
        });
        break;
      default:
        toast.info('Strategy coming soon');
    }
  }, [activeExpiry, currentPrice, lotSize, addPosition, symbol]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchOptionChainData(symbol);
      setOptionChainData(data);
      setCurrentPrice(data.spotPrice || currentPrice);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, currentPrice]);

  const navigateExpiry = (direction: 'prev' | 'next') => {
    const currentIndex = expiries.indexOf(activeExpiry);
    if (direction === 'prev' && currentIndex > 0) {
      setActiveExpiry(expiries[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < expiries.length - 1) {
      setActiveExpiry(expiries[currentIndex + 1]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasPositions = positions.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <TickerRibbon />

      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYMBOLS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toast.info('Save feature coming soon')}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.info('Load feature coming soon')}>
                <Download className="h-4 w-4 mr-1" />
                Load
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllPositions}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.info('Copy feature coming soon')}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Spot: <span className="text-foreground font-medium">{currentPrice.toFixed(2)}</span>
              </span>
              <span className="text-muted-foreground">
                Lot Size: <span className="text-foreground font-medium">{lotSize}</span>
              </span>
              {margin > 0 && (
                <span className="text-muted-foreground">
                  Margin: <span className="text-foreground font-medium">₹{formatIndianNumber(Math.round(margin))}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expiry Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <div className="container mx-auto px-4">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigateExpiry('prev')}
              disabled={expiries.indexOf(activeExpiry) === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {expiries.map(exp => (
              <button
                key={exp}
                className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeExpiry === exp 
                    ? 'border-primary text-primary font-medium' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveExpiry(exp)}
              >
                {exp}
              </button>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigateExpiry('next')}
              disabled={expiries.indexOf(activeExpiry) === expiries.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Option Chain (always visible) */}
          <div className="space-y-6">
            {/* Strategies Panel - only show when no positions */}
            {showStrategies && !hasPositions && (
              <OptionBuilderStrategies onSelectStrategy={handleAddStrategy} />
            )}

            {/* Option Chain - always visible */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Option Chain - {activeExpiry}</h3>
                  <div className="flex items-center gap-2">
                    {hasPositions && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowStrategies(!showStrategies)}
                      >
                        {showStrategies ? 'Hide' : 'Show'} Strategies
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowOptionChain(!showOptionChain)}
                    >
                      {showOptionChain ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {showOptionChain && (
                  <OptionBuilderChain
                    symbol={symbol}
                    expiry={activeExpiry}
                    currentPrice={currentPrice}
                    lotSize={lotSize}
                    expiryData={currentExpiryData}
                    isLoading={isLoading}
                    onAddPosition={addPosition}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Chart & Metrics (only show when positions exist) */}
          <div className="space-y-6">
            {hasPositions && (
              <>
                {/* Metrics */}
                <OptionBuilderMetrics
                  maxProfit={maxProfit}
                  maxLoss={maxLoss}
                  breakevens={breakevens}
                  currentPL={currentPL}
                  riskReward={typeof maxProfit === 'number' && typeof maxLoss === 'number' && maxLoss !== 0
                    ? Math.abs(maxProfit / maxLoss)
                    : null
                  }
                  margin={margin}
                />

                {/* Chart */}
                <Card>
                  <CardContent className="p-4">
                    <OptionBuilderChart
                      expiryData={chartData.expiry}
                      todayData={chartData.today}
                      currentPrice={currentPrice}
                    />
                  </CardContent>
                </Card>
              </>
            )}

            {!hasPositions && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-muted-foreground">
                    <p className="text-lg mb-2">No positions yet</p>
                    <p className="text-sm">Select a strategy or add positions from the option chain to see the payoff chart</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Bottom Panel - Positions Table */}
        <div className="mt-6">
          <Card>
            <CardContent className="p-4">
              <Tabs defaultValue="legs">
                <TabsList>
                  <TabsTrigger value="legs">Legs</TabsTrigger>
                  <TabsTrigger value="greeks">Greeks</TabsTrigger>
                </TabsList>
                <TabsContent value="legs" className="mt-4">
                  <OptionBuilderPositions
                    positions={positions}
                    onToggle={togglePosition}
                    onExit={exitPosition}
                    onRemove={removePosition}
                    onUpdatePosition={updatePosition}
                    onReEntry={reEntryPosition}
                  />
                </TabsContent>
                <TabsContent value="greeks" className="mt-4">
                  <OptionBuilderGreeks
                    positions={positions}
                    totalGreeks={greeks}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default OptionBuilder;
