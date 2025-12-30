import { Position } from '@/services/optionBuilderApi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, LogOut, Edit } from 'lucide-react';

interface OptionBuilderPositionsProps {
  positions: Position[];
  onToggle: (id: string) => void;
  onExit: (id: string, exitPrice: number) => void;
  onRemove: (id: string) => void;
}

const OptionBuilderPositions = ({ positions, onToggle, onExit, onRemove }: OptionBuilderPositionsProps) => {
  const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;

  if (positions.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No positions added yet. Click on the option chain or select a strategy to add positions.
      </div>
    );
  }

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
                className={!position.enabled ? 'opacity-50' : ''}
              >
                <TableCell>
                  <Checkbox 
                    checked={position.enabled}
                    onCheckedChange={() => position.id && onToggle(position.id)}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant={position.action === 'Buy' ? 'default' : 'destructive'}>
                    {position.action.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{position.lots}</TableCell>
                <TableCell>{position.date}</TableCell>
                <TableCell>{position.expiry}</TableCell>
                <TableCell className="font-medium">{position.strike}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={position.optType === 'CE' ? 'text-green-500' : 'text-red-500'}>
                    {position.optType}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(position.entryPrice)}</TableCell>
                <TableCell>
                  {isExited ? (
                    <span className="text-muted-foreground">{formatCurrency(position.exitPrice!)}</span>
                  ) : (
                    formatCurrency(position.currentPrice)
                  )}
                </TableCell>
                <TableCell className={isProfit ? 'text-green-500' : 'text-red-500'}>
                  {isProfit ? '+' : ''}{formatCurrency(pnl)}
                </TableCell>
                <TableCell>{position.IV.toFixed(1)}%</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {!isExited && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => position.id && onExit(position.id, position.currentPrice)}
                        className="h-8 w-8 p-0"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => position.id && onRemove(position.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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
