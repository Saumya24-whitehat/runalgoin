import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { GreeksDataPoint } from "@/services/greeksChartApi";
import { format } from "date-fns";

interface IndividualGreeksChartProps {
  symbol: string;
  expiry: string;
  strike: number;
  optionType: "CE" | "PE";
  data: GreeksDataPoint[];
}

type DataPointKey = "ltp" | "oi" | "iv" | "delta" | "theta" | "gamma" | "vega";

const dataPointOptions: { key: DataPointKey; label: string; color: string }[] = [
  { key: "ltp", label: "LTP", color: "#a855f7" },
  { key: "oi", label: "OI", color: "#3b82f6" },
  { key: "iv", label: "IV", color: "#f59e0b" },
  { key: "delta", label: "Delta", color: "#22c55e" },
  { key: "theta", label: "Theta", color: "#ef4444" },
  { key: "gamma", label: "Gamma", color: "#06b6d4" },
  { key: "vega", label: "Vega", color: "#ec4899" },
];

export const IndividualGreeksChart = ({
  symbol,
  expiry,
  strike,
  optionType,
  data,
}: IndividualGreeksChartProps) => {
  const [selectedDataPoints, setSelectedDataPoints] = useState<DataPointKey[]>(["ltp"]);
  const [showVolume, setShowVolume] = useState(false);

  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      time: format(new Date(d.timestamp), "HH:mm"),
    }));
  }, [data]);

  const latestData = data[data.length - 1];
  const firstData = data[0];
  const priceChange = latestData && firstData ? latestData.ltp - firstData.ltp : 0;
  const priceChangePercent = firstData?.ltp ? (priceChange / firstData.ltp) * 100 : 0;

  const toggleDataPoint = (key: DataPointKey) => {
    setSelectedDataPoints((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const formatValue = (value: number) => {
    if (value === undefined || value === null) return "-";
    if (Math.abs(value) >= 1000000) return (value / 100000).toFixed(1) + "L";
    if (Math.abs(value) >= 1000) return (value / 1000).toFixed(1) + "K";
    return value.toFixed(2);
  };

  if (data.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50 h-full">
        <CardContent className="py-12 text-center text-muted-foreground">
          No {optionType} data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`${optionType === "CE" ? "text-green-500 border-green-500" : "text-red-500 border-red-500"}`}
            >
              {optionType} · 5 · NSE
            </Badge>
            {latestData && (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{latestData.ltp.toFixed(2)}</span>
                <span className={`text-sm ${priceChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {dataPointOptions.map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={selectedDataPoints.includes(opt.key) ? "default" : "outline"}
              onClick={() => toggleDataPoint(opt.key)}
              className="text-xs h-6 px-2"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${optionType}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis
                dataKey="time"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              {selectedDataPoints.map((key, idx) => (
                <YAxis
                  key={key}
                  yAxisId={key}
                  orientation={idx % 2 === 0 ? "right" : "left"}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickFormatter={(v) => formatValue(v)}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                />
              ))}
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                labelFormatter={(label) => `Time: ${label}`}
                formatter={(value: number, name: string) => [formatValue(value), name]}
              />
              {selectedDataPoints.map((key) => {
                const opt = dataPointOptions.find((o) => o.key === key)!;
                return (
                  <Line
                    key={key}
                    yAxisId={key}
                    type="monotone"
                    dataKey={key}
                    name={opt.label}
                    stroke={opt.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Greeks Summary */}
        {latestData && (
          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border/50">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Delta</div>
              <div className="text-sm font-medium">{latestData.delta.toFixed(4)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Gamma</div>
              <div className="text-sm font-medium">{latestData.gamma.toFixed(6)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Theta</div>
              <div className="text-sm font-medium">{latestData.theta.toFixed(4)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Vega</div>
              <div className="text-sm font-medium">{latestData.vega.toFixed(4)}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
