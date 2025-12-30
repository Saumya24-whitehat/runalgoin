import { Position } from '@/services/optionBuilderApi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, LogOut, RotateCcw } from 'lucide-react';

interface OptionBuilderPositionsProps {
  positions: Position[];
  onToggle: (id: string) => void;
  onExit: (id: string, exitPrice: number) => void;
  onRemove: (id: string) => void;
  onUpdatePosition?: (id: string, updates: Partial<Position>) => void;
  onReEntry?: (id: string) => void;
}

const OptionBuilderPositions = ({ 
  positions, 
  onToggle, 
  onExit, 
  onRemove, 
  onUpdatePosition,
  onReEntry 
}: OptionBuilderPositionsProps) => {
  const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;

  if (positions.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No positions added yet. Click on the option chain or select a strategy to add positions.
      </div>
    );
  }

  const handleActionChange = (id: string, action: 'Buy' | 'Sell') => {
    onUpdatePosition?.(id, { action });
  };

  const handleLotsChange = (id: string, lots: number) => {
    if (lots > 0) {
      onUpdatePosition?.(id, { lots });
    }
  };

  const handleOptTypeChange = (id: string, optType: 'CE' | 'PE' | 'FUTURE') => {
    onUpdatePosition?.(id, { optType });
  };

  const handleEntryPriceChange = (id: string, entryPrice: number) => {
    if (entryPrice >= 0) {
      onUpdatePosition?.(id, { entryPrice });
    }
  };

  const handleExitPriceChange = (id: string, exitPrice: number) => {
    if (exitPrice >= 0) {
      onUpdatePosition?.(id, { exitPrice });
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox />
            </TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Lots</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Strike</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Entry Price</TableHead>
            <TableHead>Current/Exit</TableHead>
            <TableHead>P/L</TableHead>
            <TableHead>IV</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((position) => {
            const pnl = position.exitPrice !== undefined
              ? (position.exitPrice - position.entryPrice) * position.lots * position.lotSize * (position.action === 'Buy' ? 1 : -1)
              : (position.currentPrice - position.entryPrice) * position.lots * position.lotSize * (position.action === 'Buy' ? 1 : -1);
            const isProfit = pnl >= 0;
            const isExited = position.exitPrice !== undefined;

            return (
              <TableRow 
                key={position.id} 
                className={`${!position.enabled ? 'opacity-50' : ''} ${isExited ? 'bg-muted/30' : ''}`}
              >
                <TableCell>
                  <Checkbox 
                    checked={position.enabled}
                    onCheckedChange={() => position.id && onToggle(position.id)}
                  />
                </TableCell>
                <TableCell>
                  <Select 
                    value={position.action} 
                    onValueChange={(value: 'Buy' | 'Sell') => position.id && handleActionChange(position.id, value)}
                    disabled={isExited}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Buy">
                        <span className="text-green-500 font-medium">BUY</span>
                      </SelectItem>
                      <SelectItem value="Sell">
                        <span className="text-red-500 font-medium">SELL</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="1"
                    value={position.lots}
                    onChange={(e) => position.id && handleLotsChange(position.id, parseInt(e.target.value) || 1)}
                    className="w-16 h-8"
                    disabled={isExited}
                  />
                </TableCell>
                <TableCell className="text-sm">{position.date}</TableCell>
                <TableCell className="text-sm">{position.expiry}</TableCell>
                <TableCell className="font-medium">{position.strike}</TableCell>
                <TableCell>
                  <Select 
                    value={position.optType} 
                    onValueChange={(value: 'CE' | 'PE' | 'FUTURE') => position.id && handleOptTypeChange(position.id, value)}
                    disabled={isExited}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CE">
                        <span className="text-green-500">CE</span>
                      </SelectItem>
                      <SelectItem value="PE">
                        <span className="text-red-500">PE</span>
                      </SelectItem>
                      <SelectItem value="FUTURE">FUT</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.05"
                    value={position.entryPrice.toFixed(2)}
                    onChange={(e) => position.id && handleEntryPriceChange(position.id, parseFloat(e.target.value) || 0)}
                    className="w-20 h-8"
                    disabled={isExited}
                  />
                </TableCell>
                <TableCell>
                  {isExited ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.05"
                      value={position.exitPrice!.toFixed(2)}
                      onChange={(e) => position.id && handleExitPriceChange(position.id, parseFloat(e.target.value) || 0)}
                      className="w-20 h-8"
                    />
                  ) : (
                    <span className="text-muted-foreground">{formatCurrency(position.currentPrice)}</span>
                  )}
                </TableCell>
                <TableCell className={isProfit ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
                  {isProfit ? '+' : ''}{formatCurrency(pnl)}
                </TableCell>
                <TableCell>{position.IV.toFixed(1)}%</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {!isExited ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => position.id && onExit(position.id, position.currentPrice)}
                        className="h-8 w-8 p-0"
                        title="Exit position"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => position.id && onReEntry?.(position.id)}
                        className="h-8 w-8 p-0 text-primary"
                        title="Re-enter position"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => position.id && onRemove(position.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      title="Remove position"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default OptionBuilderPositions;
