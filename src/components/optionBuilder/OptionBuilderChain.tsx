import { useState, useMemo, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Position, ExpiryData, formatIndianNumber } from '@/services/optionBuilderApi';
import { Skeleton } from '@/components/ui/skeleton';

interface OptionBuilderChainProps {
  symbol: string;
  expiry: string;
  currentPrice: number;
  lotSize: number;
  expiryData: ExpiryData | null;
  isLoading: boolean;
  onAddPosition: (position: Omit<Position, 'id' | 'enabled'>) => void;
}

interface StrikeData {
  strike: number;
  callLTP: number;
  callIV: number;
  callDelta: number;
  callTheta: number;
  callGamma: number;
  callVega: number;
  callOI: number;
  callVolume: number;
  callToken: string;
  putLTP: number;
  putIV: number;
  putDelta: number;
  putTheta: number;
  putGamma: number;
  putVega: number;
  putOI: number;
  putVolume: number;
  putToken: string;
}

const OptionBuilderChain = ({ 
  symbol, 
  expiry, 
  currentPrice, 
  lotSize, 
  expiryData,
  isLoading,
  onAddPosition 
}: OptionBuilderChainProps) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Transform expiry data into strike data array
  const strikeData: StrikeData[] = useMemo(() => {
    if (!expiryData || !expiryData.data || expiryData.data.length === 0) {
      return [];
    }

    return expiryData.data.map((item, idx) => {
      const callData = item.call_options;
      const putData = item.put_options;

      return {
        strike: item.strike_price,
        callLTP: callData?.market_data?.ltp || 0,
        callIV: (callData?.option_greeks?.iv || 0) * 100,
        callDelta: callData?.option_greeks?.delta || 0,
        callTheta: callData?.option_greeks?.theta || 0,
        callGamma: callData?.option_greeks?.gamma || 0,
        callVega: callData?.option_greeks?.vega || 0,
        callOI: callData?.market_data?.oi || 0,
        callVolume: callData?.market_data?.volume || 0,
        callToken: expiryData.ceToken?.[idx] || callData?.instrument_key || '',
        putLTP: putData?.market_data?.ltp || 0,
        putIV: (putData?.option_greeks?.iv || 0) * 100,
        putDelta: putData?.option_greeks?.delta || 0,
        putTheta: putData?.option_greeks?.theta || 0,
        putGamma: putData?.option_greeks?.gamma || 0,
        putVega: putData?.option_greeks?.vega || 0,
        putOI: putData?.market_data?.oi || 0,
        putVolume: putData?.market_data?.volume || 0,
        putToken: expiryData.peToken?.[idx] || putData?.instrument_key || '',
      };
    });
  }, [expiryData]);

  const handleAddPosition = (strike: number, optType: 'CE' | 'PE', action: 'Buy' | 'Sell') => {
    const data = strikeData.find(s => s.strike === strike);
    if (!data) return;

    const today = new Date().toISOString().split('T')[0];
    const price = optType === 'CE' ? data.callLTP : data.putLTP;
    const iv = optType === 'CE' ? data.callIV : data.putIV;
    const delta = optType === 'CE' ? data.callDelta : data.putDelta;
    const theta = optType === 'CE' ? data.callTheta : data.putTheta;
    const gamma = optType === 'CE' ? data.callGamma : data.putGamma;
    const vega = optType === 'CE' ? data.callVega : data.putVega;
    const token = optType === 'CE' ? data.callToken : data.putToken;

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
      gamma,
      theta,
      vega,
      instrumentToken: token,
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 10000000) {
      return `${(num / 10000000).toFixed(1)}Cr`;
    }
    if (num >= 100000) {
      return `${(num / 100000).toFixed(1)}L`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const strikeDiff = symbol.includes('Bank') ? 100 : 50;
  const atmStrike = Math.round(currentPrice / strikeDiff) * strikeDiff;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (strikeData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No option chain data available for {expiry}
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="text-center text-emerald-500 text-xs">OI</TableHead>
            <TableHead className="text-center text-emerald-500 text-xs">Vol</TableHead>
            <TableHead className="text-center text-emerald-500 text-xs">IV</TableHead>
            <TableHead className="text-center text-emerald-500 text-xs">LTP</TableHead>
            <TableHead className="text-center font-bold text-xs">Strike</TableHead>
            <TableHead className="text-center text-red-500 text-xs">LTP</TableHead>
            <TableHead className="text-center text-red-500 text-xs">IV</TableHead>
            <TableHead className="text-center text-red-500 text-xs">Vol</TableHead>
            <TableHead className="text-center text-red-500 text-xs">OI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {strikeData.map((row) => {
            const isATM = Math.abs(row.strike - atmStrike) < strikeDiff / 2;
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
                <TableCell className={`text-center text-xs ${isITMCall ? 'bg-emerald-500/10' : ''}`}>
                  {formatNumber(row.callOI)}
                </TableCell>
                <TableCell className={`text-center text-xs ${isITMCall ? 'bg-emerald-500/10' : ''}`}>
                  {formatNumber(row.callVolume)}
                </TableCell>
                <TableCell className={`text-center text-xs ${isITMCall ? 'bg-emerald-500/10' : ''}`}>
                  {row.callIV.toFixed(1)}
                </TableCell>
                <TableCell 
                  className={`text-center relative ${isITMCall ? 'bg-emerald-500/10' : ''}`}
                >
                  <span className="text-xs font-medium">{row.callLTP.toFixed(2)}</span>
                  {isHovered && (
                    <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/90">
                      <Button 
                        size="sm" 
                        className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
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
                <TableCell className={`text-center font-bold text-xs ${isATM ? 'text-primary bg-primary/20' : ''}`}>
                  {row.strike}
                </TableCell>

                {/* Put Side */}
                <TableCell 
                  className={`text-center relative ${isITMPut ? 'bg-red-500/10' : ''}`}
                >
                  <span className="text-xs font-medium">{row.putLTP.toFixed(2)}</span>
                  {isHovered && (
                    <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/90">
                      <Button 
                        size="sm" 
                        className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
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
                <TableCell className={`text-center text-xs ${isITMPut ? 'bg-red-500/10' : ''}`}>
                  {row.putIV.toFixed(1)}
                </TableCell>
                <TableCell className={`text-center text-xs ${isITMPut ? 'bg-red-500/10' : ''}`}>
                  {formatNumber(row.putVolume)}
                </TableCell>
                <TableCell className={`text-center text-xs ${isITMPut ? 'bg-red-500/10' : ''}`}>
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
