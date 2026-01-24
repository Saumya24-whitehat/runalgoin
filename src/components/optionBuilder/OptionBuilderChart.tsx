import { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart, Line } from 'recharts';

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
      // Split profit and loss areas for different coloring
      profitArea: expiryPL > 0 ? expiryPL : null,
      lossArea: expiryPL < 0 ? expiryPL : null,
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
            {/* Green gradient for profit area */}
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.1} />
            </linearGradient>
            {/* Red gradient for loss area */}
            <linearGradient id="lossGradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis 
            dataKey="price" 
            type="number"
            domain={['dataMin', 'dataMax']}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => value.toFixed(0)}
            fontSize={11}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={formatValue}
            fontSize={11}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            formatter={(value: number, name: string) => [
              formatValue(value),
              name === 'expiryPL' ? 'P/L at Expiry' : 'P/L Today'
            ]}
            labelFormatter={(value) => `Spot: ₹${value}`}
          />
          {/* Zero reference line */}
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeOpacity={0.7} />
          {/* Current spot price reference line - green dashed, updates dynamically */}
          <ReferenceLine 
            x={currentPrice} 
            stroke="hsl(var(--success))"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
            label={{ 
              value: `${currentPrice.toLocaleString('en-IN')}`, 
              position: 'top',
              fill: 'hsl(var(--success))',
              fontSize: 10,
              fontWeight: 500
            }}
          />
          {/* Profit area fill (green) */}
          <Area
            type="monotone"
            dataKey="profitArea"
            stroke="none"
            fill="url(#profitGradient)"
            fillOpacity={1}
            connectNulls={false}
            baseLine={0}
          />
          {/* Loss area fill (red) */}
          <Area
            type="monotone"
            dataKey="lossArea"
            stroke="none"
            fill="url(#lossGradient)"
            fillOpacity={1}
            connectNulls={false}
            baseLine={0}
          />
          {/* P/L at Expiry line - solid green */}
          <Line
            type="monotone"
            dataKey="expiryPL"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            name="expiryPL"
          />
          {/* P/L Today line - dashed gray */}
          <Line
            type="monotone"
            dataKey="todayPL"
            stroke="#9ca3af"
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
