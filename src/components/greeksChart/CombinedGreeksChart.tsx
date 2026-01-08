import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { GreeksDataPoint } from "@/services/greeksChartApi";
import { format } from "date-fns";

interface CombinedGreeksChartProps {
  symbol: string;
  expiry: string;
  strike: number;
  callData: GreeksDataPoint[];
  putData: GreeksDataPoint[];
}

type DataPointKey = "ltp" | "oi" | "iv" | "delta" | "theta" | "gamma" | "vega";

const dataPointOptions: { key: DataPointKey; label: string; callColor: string; putColor: string }[] = [
  { key: "ltp", label: "LTP", callColor: "#22c55e", putColor: "#f97316" },
  { key: "oi", label: "OI", callColor: "#22c55e", putColor: "#f97316" },
  { key: "iv", label: "IV", callColor: "#22c55e", putColor: "#f97316" },
  { key: "delta", label: "Delta", callColor: "#22c55e", putColor: "#f97316" },
  { key: "theta", label: "Theta", callColor: "#22c55e", putColor: "#f97316" },
  { key: "gamma", label: "Gamma", callColor: "#22c55e", putColor: "#f97316" },
  { key: "vega", label: "Vega", callColor: "#22c55e", putColor: "#f97316" },
];

export const CombinedGreeksChart = ({
  symbol,
  expiry,
  strike,
  callData,
  putData,
}: CombinedGreeksChartProps) => {
  const [selectedDataPoints, setSelectedDataPoints] = useState<DataPointKey[]>(["ltp"]);

  // Merge call and put data by timestamp
  const chartData = useMemo(() => {
    const timestampMap = new Map<number, { call?: GreeksDataPoint; put?: GreeksDataPoint }>();

    callData.forEach((d) => {
      timestampMap.set(d.timestamp, { ...timestampMap.get(d.timestamp), call: d });
    });

    putData.forEach((d) => {
      timestampMap.set(d.timestamp, { ...timestampMap.get(d.timestamp), put: d });
    });

    return Array.from(timestampMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, { call, put }]) => ({
        timestamp,
        time: format(new Date(timestamp), "HH:mm"),
        callLtp: call?.ltp,
        putLtp: put?.ltp,
        callOi: call?.oi,
        putOi: put?.oi,
        callIv: call?.iv,
        putIv: put?.iv,
        callDelta: call?.delta,
        putDelta: put?.delta,
        callTheta: call?.theta,
        putTheta: put?.theta,
        callGamma: call?.gamma,
        putGamma: put?.gamma,
        callVega: call?.vega,
        putVega: put?.vega,
      }));
  }, [callData, putData]);

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

  if (callData.length === 0 && putData.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          No data available. Select options and click GO to load data.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {symbol} {expiry} {strike} - Combined Greeks
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {dataPointOptions.map((opt) => (
              <Button
                key={opt.key}
                size="sm"
                variant={selectedDataPoints.includes(opt.key) ? "default" : "outline"}
                onClick={() => toggleDataPoint(opt.key)}
                className="text-xs h-7 px-3"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="time"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
              />
              {selectedDataPoints.map((key, idx) => (
                <YAxis
                  key={key}
                  yAxisId={key}
                  orientation={idx % 2 === 0 ? "left" : "right"}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickFormatter={(v) => formatValue(v)}
                  tickLine={false}
                  axisLine={false}
                />
              ))}
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(label) => `Time: ${label}`}
                formatter={(value: number, name: string) => [formatValue(value), name]}
              />
              <Legend />
              {selectedDataPoints.map((key) => {
                const opt = dataPointOptions.find((o) => o.key === key)!;
                const callKey = `call${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof chartData[0];
                const putKey = `put${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof chartData[0];
                return [
                  <Line
                    key={`call-${key}`}
                    yAxisId={key}
                    type="monotone"
                    dataKey={callKey}
                    name={`CE ${opt.label}`}
                    stroke={opt.callColor}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />,
                  <Line
                    key={`put-${key}`}
                    yAxisId={key}
                    type="monotone"
                    dataKey={putKey}
                    name={`PE ${opt.label}`}
                    stroke={opt.putColor}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />,
                ];
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
