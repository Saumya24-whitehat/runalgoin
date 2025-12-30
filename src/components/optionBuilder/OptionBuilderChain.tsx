import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Position } from '@/services/optionBuilderApi';

interface OptionBuilderChainProps {
  symbol: string;
  expiry: string;
  currentPrice: number;
  lotSize: number;
  onAddPosition: (position: Omit<Position, 'id' | 'enabled'>) => void;
}

interface StrikeData {
  strike: number;
  callLTP: number;
  callIV: number;
  callDelta: number;
  callOI: number;
  putLTP: number;
  putIV: number;
  putDelta: number;
  putOI: number;
}

const OptionBuilderChain = ({ symbol, expiry, currentPrice, lotSize, onAddPosition }: OptionBuilderChainProps) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Generate mock strike data around current price
  const strikeData: StrikeData[] = useMemo(() => {
    const strikeDiff = symbol.includes('Bank') ? 100 : 50;
    const atm = Math.round(currentPrice / strikeDiff) * strikeDiff;
    const strikes: StrikeData[] = [];

    for (let i = -10; i <= 10; i++) {
      const strike = atm + (i * strikeDiff);
      const moneyness = (currentPrice - strike) / currentPrice;
      
      // Mock prices based on moneyness
      const callIV = 15 + Math.random() * 5;
      const putIV = 15 + Math.random() * 5;
      
      const callIntrinsic = Math.max(0, currentPrice - strike);
      const putIntrinsic = Math.max(0, strike - currentPrice);
      
      const timeValue = Math.max(50, 200 - Math.abs(i) * 20) * (1 + Math.random() * 0.2);
      
      strikes.push({
        strike,
        callLTP: Math.round((callIntrinsic + (i < 0 ? timeValue : timeValue * 0.5)) * 100) / 100,
        callIV: Math.round(callIV * 100) / 100,
        callDelta: Math.min(1, Math.max(0, 0.5 - moneyness * 2)),
        callOI: Math.round(100000 + Math.random() * 500000),
        putLTP: Math.round((putIntrinsic + (i > 0 ? timeValue : timeValue * 0.5)) * 100) / 100,
        putIV: Math.round(putIV * 100) / 100,
        putDelta: Math.max(-1, Math.min(0, -0.5 - moneyness * 2)),
        putOI: Math.round(100000 + Math.random() * 500000),
      });
    }

    return strikes;
  }, [symbol, currentPrice]);

  const handleAddPosition = (strike: number, optType: 'CE' | 'PE', action: 'Buy' | 'Sell') => {
    const data = strikeData.find(s => s.strike === strike);
    if (!data) return;

    const today = new Date().toISOString().split('T')[0];
    const price = optType === 'CE' ? data.callLTP : data.putLTP;
    const iv = optType === 'CE' ? data.callIV : data.putIV;
    const delta = optType === 'CE' ? data.callDelta : data.putDelta;

    onAddPosition({
      action,
      lots: 1,
      date: today,
      expiry,
      strike,
      optType,
      entryPrice: price,
      currentPrice: price,
      IV: iv,
      lotSize,
      delta,
      gamma: 0.001,
      theta: -10,
      vega: 5,
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 100000) {
      return `${(num / 100000).toFixed(1)}L`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const atmStrike = Math.round(currentPrice / (symbol.includes('Bank') ? 100 : 50)) * (symbol.includes('Bank') ? 100 : 50);

  return (
    <div className="max-h-[400px] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="text-center text-green-500">OI</TableHead>
            <TableHead className="text-center text-green-500">IV</TableHead>
            <TableHead className="text-center text-green-500">LTP</TableHead>
            <TableHead className="text-center font-bold">Strike</TableHead>
            <TableHead className="text-center text-red-500">LTP</TableHead>
            <TableHead className="text-center text-red-500">IV</TableHead>
            <TableHead className="text-center text-red-500">OI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {strikeData.map((row) => {
            const isATM = row.strike === atmStrike;
            const isITMCall = row.strike < currentPrice;
            const isITMPut = row.strike > currentPrice;
            const isHovered = hoveredRow === row.strike;

            return (
              <TableRow 
                key={row.strike}
                className={`
                  relative cursor-pointer transition-colors
                  ${isATM ? 'bg-primary/10 font-medium' : ''}
                  ${isHovered ? 'bg-muted' : ''}
                `}
                onMouseEnter={() => setHoveredRow(row.strike)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Call Side */}
                <TableCell className={`text-center text-sm ${isITMCall ? 'bg-green-500/10' : ''}`}>
                  {formatNumber(row.callOI)}
                </TableCell>
                <TableCell className={`text-center text-sm ${isITMCall ? 'bg-green-500/10' : ''}`}>
                  {row.callIV.toFixed(1)}%
                </TableCell>
                <TableCell 
                  className={`text-center relative ${isITMCall ? 'bg-green-500/10' : ''}`}
                >
                  <span className="text-sm font-medium">{row.callLTP.toFixed(2)}</span>
                  {isHovered && (
                    <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/90">
                      <Button 
                        size="sm" 
                        className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => handleAddPosition(row.strike, 'CE', 'Buy')}
                      >
                        B
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleAddPosition(row.strike, 'CE', 'Sell')}
                      >
                        S
                      </Button>
                    </div>
                  )}
                </TableCell>

                {/* Strike */}
                <TableCell className={`text-center font-bold ${isATM ? 'text-primary' : ''}`}>
                  {row.strike}
                </TableCell>

                {/* Put Side */}
                <TableCell 
                  className={`text-center relative ${isITMPut ? 'bg-red-500/10' : ''}`}
                >
                  <span className="text-sm font-medium">{row.putLTP.toFixed(2)}</span>
                  {isHovered && (
                    <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/90">
                      <Button 
                        size="sm" 
                        className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => handleAddPosition(row.strike, 'PE', 'Buy')}
                      >
                        B
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleAddPosition(row.strike, 'PE', 'Sell')}
                      >
                        S
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell className={`text-center text-sm ${isITMPut ? 'bg-red-500/10' : ''}`}>
                  {row.putIV.toFixed(1)}%
                </TableCell>
                <TableCell className={`text-center text-sm ${isITMPut ? 'bg-red-500/10' : ''}`}>
                  {formatNumber(row.putOI)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default OptionBuilderChain;
