import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PLHistoryPoint {
  time: string;
  pnl: number;
  spotPrice: number;
}

interface PLHistoryChartProps {
  history: PLHistoryPoint[];
}

const PLHistoryChart = ({ history }: PLHistoryChartProps) => {
  const chartData = useMemo(() => {
    return history.map((point) => ({
      ...point,
      time: point.time.replace(/^(\d{2})(\d{2})$/, "$1:$2"),
    }));
  }, [history]);

  const minPnL = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.min(...chartData.map((d) => d.pnl));
  }, [chartData]);

  const maxPnL = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map((d) => d.pnl));
  }, [chartData]);

  const formatPnL = (value: number) => {
    if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toFixed(0)}`;
  };

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm">P&L History</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            P&L history will appear as you move through time
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentPnL = chartData[chartData.length - 1]?.pnl || 0;

  return (
    <Card>
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">P&L History</CardTitle>
          <div
            className={`text-sm font-semibold ${
              currentPnL >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {currentPnL >= 0 ? "+" : ""}
            {formatPnL(currentPnL)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={formatPnL}
                domain={[
                  Math.min(minPnL * 1.1, 0),
                  Math.max(maxPnL * 1.1, 0),
                ]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [formatPnL(value), "P&L"]}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="pnl"
                stroke={currentPnL >= 0 ? "hsl(142.1 76.2% 36.3%)" : "hsl(0 84.2% 60.2%)"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PLHistoryChart;
