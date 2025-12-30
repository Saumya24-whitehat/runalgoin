import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';

interface OptionBuilderChartProps {
  expiryData: [number, number][];
  todayData: [number, number][];
  currentPrice: number;
}

const OptionBuilderChart = ({ expiryData, todayData, currentPrice }: OptionBuilderChartProps) => {
  const chartData = useMemo(() => {
    return expiryData.map(([price, expiryPL], index) => ({
      price,
      expiryPL,
      todayPL: todayData[index]?.[1] ?? 0,
    }));
  }, [expiryData, todayData]);

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    if (Math.abs(value) >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value.toFixed(0)}`;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Add positions to see P/L chart
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lossGradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="price" 
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => value.toFixed(0)}
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={formatValue}
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number, name: string) => [
              formatValue(value),
              name === 'expiryPL' ? 'P/L at Expiry' : 'P/L Today'
            ]}
            labelFormatter={(value) => `Spot: ${value}`}
          />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
          <ReferenceLine 
            x={currentPrice} 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{ 
              value: `LTP: ${currentPrice}`, 
              position: 'top',
              fill: 'hsl(var(--primary))',
              fontSize: 12
            }}
          />
          <Area
            type="monotone"
            dataKey="expiryPL"
            stroke="none"
            fill="url(#profitGradient)"
            fillOpacity={1}
          />
          <Line
            type="monotone"
            dataKey="expiryPL"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={false}
            name="expiryPL"
          />
          <Line
            type="monotone"
            dataKey="todayPL"
            stroke="hsl(var(--chart-4))"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="todayPL"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OptionBuilderChart;
