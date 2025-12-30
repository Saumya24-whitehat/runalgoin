import { Position } from '@/services/optionBuilderApi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface OptionBuilderGreeksProps {
  positions: Position[];
  totalGreeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}

const OptionBuilderGreeks = ({ positions, totalGreeks }: OptionBuilderGreeksProps) => {
  const formatGreek = (value: number, decimals: number = 4) => {
    return value.toFixed(decimals);
  };

  const enabledPositions = positions.filter(p => p.enabled && p.exitPrice === undefined);

  if (enabledPositions.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No active positions to display Greeks.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total Greeks Summary */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase">Total Delta</div>
          <div className={`text-lg font-semibold ${totalGreeks.delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatGreek(totalGreeks.delta, 2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase">Total Gamma</div>
          <div className={`text-lg font-semibold ${totalGreeks.gamma >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatGreek(totalGreeks.gamma, 4)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase">Total Theta</div>
          <div className={`text-lg font-semibold ${totalGreeks.theta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatGreek(totalGreeks.theta, 2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase">Total Vega</div>
          <div className={`text-lg font-semibold ${totalGreeks.vega >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatGreek(totalGreeks.vega, 2)}
          </div>
        </div>
      </div>

      {/* Individual Position Greeks */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>Strike/Type</TableHead>
              <TableHead className="text-right">Delta</TableHead>
              <TableHead className="text-right">Gamma</TableHead>
              <TableHead className="text-right">Theta</TableHead>
              <TableHead className="text-right">Vega</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enabledPositions.map((position) => {
              const multiplier = position.lots * position.lotSize * (position.action === 'Buy' ? 1 : -1);
              
              return (
                <TableRow key={position.id}>
                  <TableCell>
                    <Badge variant={position.action === 'Buy' ? 'default' : 'destructive'}>
                      {position.action.toUpperCase()}
                    </Badge>
                    <span className="ml-2">{position.lots} lot{position.lots > 1 ? 's' : ''}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{position.strike}</span>
                    <Badge variant="outline" className={`ml-2 ${position.optType === 'CE' ? 'text-green-500' : 'text-red-500'}`}>
                      {position.optType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={(position.delta || 0) * multiplier >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {formatGreek((position.delta || 0) * multiplier, 2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={(position.gamma || 0) * multiplier >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {formatGreek((position.gamma || 0) * multiplier, 4)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={(position.theta || 0) * multiplier >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {formatGreek((position.theta || 0) * multiplier, 2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={(position.vega || 0) * multiplier >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {formatGreek((position.vega || 0) * multiplier, 2)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OptionBuilderGreeks;
