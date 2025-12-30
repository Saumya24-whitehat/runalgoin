import { Card, CardContent } from '@/components/ui/card';

interface OptionBuilderMetricsProps {
  maxProfit: number | 'Unlimited';
  maxLoss: number | 'Unlimited';
  breakevens: number[];
  currentPL: number;
  riskReward: number | null;
  margin?: number;
}

const OptionBuilderMetrics = ({ maxProfit, maxLoss, breakevens, currentPL, riskReward, margin }: OptionBuilderMetricsProps) => {
  const formatCurrency = (value: number | 'Unlimited') => {
    if (value === 'Unlimited') return 'Unlimited';
    if (Math.abs(value) >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toFixed(2)}`;
  };

  const metrics = [
    {
      title: 'Max Profit',
      value: formatCurrency(maxProfit),
      className: typeof maxProfit === 'number' && maxProfit > 0 ? 'text-emerald-500' : '',
    },
    {
      title: 'Max Loss',
      value: formatCurrency(maxLoss),
      className: typeof maxLoss === 'number' && maxLoss < 0 ? 'text-red-500' : '',
    },
    {
      title: 'Risk:Reward',
      value: riskReward ? `1:${riskReward.toFixed(2)}` : 'N/A',
      className: '',
    },
    {
      title: 'Breakeven',
      value: breakevens.length > 0 ? breakevens.join(' - ') : 'N/A',
      className: '',
    },
    {
      title: 'Current P/L',
      value: formatCurrency(currentPL),
      className: currentPL >= 0 ? 'text-emerald-500' : 'text-red-500',
    },
    ...(margin && margin > 0 ? [{
      title: 'Margin Required',
      value: formatCurrency(margin),
      className: '',
    }] : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {metrics.map((metric) => (
        <Card key={metric.title} className="border-l-4 border-l-primary">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {metric.title}
            </div>
            <div className={`text-lg font-semibold mt-1 ${metric.className}`}>
              {metric.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OptionBuilderMetrics;
