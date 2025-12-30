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
import { Save, Download, RefreshCw, Plus, Copy, Settings } from 'lucide-react';
import OptionBuilderChart from '@/components/optionBuilder/OptionBuilderChart';
import OptionBuilderPositions from '@/components/optionBuilder/OptionBuilderPositions';
import OptionBuilderGreeks from '@/components/optionBuilder/OptionBuilderGreeks';
import OptionBuilderMetrics from '@/components/optionBuilder/OptionBuilderMetrics';
import OptionBuilderStrategies from '@/components/optionBuilder/OptionBuilderStrategies';
import OptionBuilderChain from '@/components/optionBuilder/OptionBuilderChain';
import { 
  Position, 
  generatePLChartData, 
  findBreakevenPoints,
  calculateTotalGreeks
} from '@/services/optionBuilderApi';

const SYMBOLS = [
  { value: 'Nifty 50', label: 'NIFTY' },
  { value: 'Nifty Bank', label: 'BANKNIFTY' },
  { value: 'Nifty Fin Service', label: 'FINNIFTY' },
];

const OptionBuilder = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [symbol, setSymbol] = useState('Nifty 50');
  const [expiries, setExpiries] = useState<string[]>([]);
  const [activeExpiry, setActiveExpiry] = useState<string>('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPrice, setCurrentPrice] = useState(24000);
  const [lotSize, setLotSize] = useState(75);
  const [showStrategies, setShowStrategies] = useState(true);

  // Handle authentication
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Load mock expiry dates
  useEffect(() => {
    const mockExpiries = ['02JAN25', '09JAN25', '16JAN25', '23JAN25', '30JAN25'];
    setExpiries(mockExpiries);
    setActiveExpiry(mockExpiries[0]);
  }, [symbol]);

  // Calculate chart data
  const chartData = generatePLChartData(positions, currentPrice, 0.03);
  const breakevens = findBreakevenPoints(chartData.expiry);
  const greeks = calculateTotalGreeks(positions);

  // Calculate metrics
  const enabledPositions = positions.filter(p => p.enabled);
  let maxProfit: number | 'Unlimited' = -Infinity;
  let maxLoss: number | 'Unlimited' = Infinity;
  
  chartData.expiry.forEach(([, pl]) => {
    if (typeof maxProfit === 'number' && pl > maxProfit) maxProfit = pl;
    if (typeof maxLoss === 'number' && pl < maxLoss) maxLoss = pl;
  });

  // Check for unlimited profit/loss
  const longCalls = enabledPositions.filter(p => p.action === 'Buy' && p.optType === 'CE').reduce((sum, p) => sum + p.lots, 0);
  const shortCalls = enabledPositions.filter(p => p.action === 'Sell' && p.optType === 'CE').reduce((sum, p) => sum + p.lots, 0);
  const longPuts = enabledPositions.filter(p => p.action === 'Buy' && p.optType === 'PE').reduce((sum, p) => sum + p.lots, 0);
  const shortPuts = enabledPositions.filter(p => p.action === 'Sell' && p.optType === 'PE').reduce((sum, p) => sum + p.lots, 0);

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

  const clearAllPositions = useCallback(() => {
    setPositions([]);
    setShowStrategies(true);
    toast.success('All positions cleared');
  }, []);

  const handleAddStrategy = useCallback((strategyType: string) => {
    const today = new Date().toISOString().split('T')[0];
    const atm = Math.round(currentPrice / 50) * 50;

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
          strike: atm + 100,
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
          strike: atm - 100,
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
          strike: atm - 200,
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
          strike: atm + 100,
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
          strike: atm + 200,
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
  }, [activeExpiry, currentPrice, lotSize, addPosition]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
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
              <span className="text-muted-foreground">Spot: <span className="text-foreground font-medium">{currentPrice.toFixed(2)}</span></span>
              <span className="text-muted-foreground">Lot Size: <span className="text-foreground font-medium">{lotSize}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Expiry Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <div className="container mx-auto px-4">
          <div className="flex items-center">
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Option Chain / Strategy Cards */}
          <div className="space-y-6">
            {showStrategies && positions.length === 0 ? (
              <OptionBuilderStrategies onSelectStrategy={handleAddStrategy} />
            ) : (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Option Chain</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowStrategies(true)}
                    >
                      Show Strategies
                    </Button>
                  </div>
                  <OptionBuilderChain
                    symbol={symbol}
                    expiry={activeExpiry}
                    currentPrice={currentPrice}
                    lotSize={lotSize}
                    onAddPosition={addPosition}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Chart & Metrics */}
          <div className="space-y-6">
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
