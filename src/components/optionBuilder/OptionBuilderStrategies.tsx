import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface StrategyData {
  svg: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'others';
}

interface Strategy {
  id: string;
  name: string;
  category: 'bullish' | 'bearish' | 'neutral' | 'others';
  svgUrl: string;
}

const formatStrategyName = (id: string): string => {
  return id
    .replace(/-[A-Za-z0-9]{8}$/, '') // Remove hash suffixes like -BuaBwyDA
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface OptionBuilderStrategiesProps {
  onSelectStrategy: (strategyId: string) => void;
}

const OptionBuilderStrategies = ({ onSelectStrategy }: OptionBuilderStrategiesProps) => {
  const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish' | 'neutral' | 'others'>('bullish');
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const response = await fetch('https://runalgo.xyz/strategyBuilderWAutoPlay/StrategySVGData.json');
        const data: Record<string, StrategyData> = await response.json();
        
        const strategyList: Strategy[] = Object.entries(data).map(([id, info]) => ({
          id,
          name: formatStrategyName(id),
          category: info.type,
          svgUrl: `https://runalgo.xyz/strategyBuilderWAutoPlay/${info.svg}`,
        }));
        
        setStrategies(strategyList);
      } catch (error) {
        console.error('Error fetching strategies:', error);
        // Fallback strategies if API fails
        setStrategies([
          { id: 'buy-call', name: 'Buy Call', category: 'bullish', svgUrl: '' },
          { id: 'sell-put', name: 'Sell Put', category: 'bullish', svgUrl: '' },
          { id: 'buy-put', name: 'Buy Put', category: 'bearish', svgUrl: '' },
          { id: 'sell-call', name: 'Sell Call', category: 'bearish', svgUrl: '' },
          { id: 'long-straddle', name: 'Long Straddle', category: 'neutral', svgUrl: '' },
          { id: 'iron-condor', name: 'Iron Condor', category: 'neutral', svgUrl: '' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStrategies();
  }, []);

  const filteredStrategies = filter === 'all' 
    ? strategies 
    : strategies.filter(s => s.category === filter);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Button
            variant={filter === 'bullish' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('bullish')}
          >
            Bullish
          </Button>
          <Button
            variant={filter === 'bearish' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('bearish')}
          >
            Bearish
          </Button>
          <Button
            variant={filter === 'neutral' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('neutral')}
          >
            Neutral
          </Button>
          <Button
            variant={filter === 'others' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('others')}
          >
            Others
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredStrategies.map((strategy) => (
              <Card
                key={strategy.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => onSelectStrategy(strategy.id)}
              >
                <CardContent className="p-3 text-center">
                  {strategy.svgUrl ? (
                    <img 
                      src={strategy.svgUrl} 
                      alt={strategy.name}
                      className="w-full h-12 mb-2 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-12 mb-2 bg-muted rounded flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No preview</span>
                    </div>
                  )}
                  <div className="text-xs font-medium truncate">{strategy.name}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OptionBuilderStrategies;
