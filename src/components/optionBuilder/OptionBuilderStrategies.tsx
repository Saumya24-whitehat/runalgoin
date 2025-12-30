import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Strategy {
  id: string;
  name: string;
  category: 'bullish' | 'bearish' | 'neutral' | 'others';
  chartPath: string;
}

const strategies: Strategy[] = [
  { id: 'buy-call', name: 'Buy Call', category: 'bullish', chartPath: 'M10,50 L30,40 L50,25 L70,15 L90,5' },
  { id: 'sell-put', name: 'Sell Put', category: 'bullish', chartPath: 'M10,50 L30,45 L50,40 L70,40 L90,40' },
  { id: 'bull-call-spread', name: 'Bull Call Spread', category: 'bullish', chartPath: 'M10,50 L30,35 L50,25 L70,25 L90,25' },
  { id: 'bull-put-spread', name: 'Bull Put Spread', category: 'bullish', chartPath: 'M10,40 L30,35 L50,30 L70,30 L90,30' },
  { id: 'buy-put', name: 'Buy Put', category: 'bearish', chartPath: 'M10,5 L30,15 L50,25 L70,40 L90,50' },
  { id: 'sell-call', name: 'Sell Call', category: 'bearish', chartPath: 'M10,40 L30,40 L50,40 L70,45 L90,50' },
  { id: 'bear-call-spread', name: 'Bear Call Spread', category: 'bearish', chartPath: 'M10,25 L30,25 L50,35 L70,45 L90,50' },
  { id: 'bear-put-spread', name: 'Bear Put Spread', category: 'bearish', chartPath: 'M10,30 L30,30 L50,35 L70,45 L90,50' },
  { id: 'long-straddle', name: 'Long Straddle', category: 'neutral', chartPath: 'M10,15 L30,30 L50,45 L70,30 L90,15' },
  { id: 'long-strangle', name: 'Long Strangle', category: 'neutral', chartPath: 'M10,15 L30,35 L50,45 L70,35 L90,15' },
  { id: 'iron-condor', name: 'Iron Condor', category: 'neutral', chartPath: 'M10,50 L20,35 L40,30 L60,30 L80,35 L90,50' },
  { id: 'butterfly', name: 'Butterfly Spread', category: 'neutral', chartPath: 'M10,50 L30,35 L50,15 L70,35 L90,50' },
  { id: 'collar', name: 'Collar', category: 'others', chartPath: 'M10,35 L30,35 L50,25 L70,20 L90,20' },
  { id: 'covered-call', name: 'Covered Call', category: 'others', chartPath: 'M10,50 L30,40 L50,30 L70,30 L90,30' },
  { id: 'protective-put', name: 'Protective Put', category: 'others', chartPath: 'M10,35 L30,35 L50,25 L70,15 L90,5' },
  { id: 'ratio-spread', name: 'Ratio Spread', category: 'others', chartPath: 'M10,50 L30,35 L50,25 L70,30 L90,45' },
];

interface OptionBuilderStrategiesProps {
  onSelectStrategy: (strategyId: string) => void;
}

const OptionBuilderStrategies = ({ onSelectStrategy }: OptionBuilderStrategiesProps) => {
  const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish' | 'neutral' | 'others'>('bullish');

  const filteredStrategies = filter === 'all' 
    ? strategies 
    : strategies.filter(s => s.category === filter);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredStrategies.map((strategy) => (
            <Card
              key={strategy.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onSelectStrategy(strategy.id)}
            >
              <CardContent className="p-3 text-center">
                <svg 
                  viewBox="0 0 100 60" 
                  className="w-full h-12 mb-2"
                >
                  <polyline 
                    points={strategy.chartPath} 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="2" 
                    fill="none"
                  />
                  <polyline 
                    points="10,50 30,50 50,50 70,50 90,50" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth="1" 
                    strokeDasharray="3,3"
                    fill="none"
                  />
                </svg>
                <div className="text-xs font-medium">{strategy.name}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

import { useState } from 'react';

export default OptionBuilderStrategies;
