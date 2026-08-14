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

type DataPointKey = "ltp" | "oi" | "iv" | "delta" | "theta" | "gamma" | "vega" | "ivRoc" | "coi";

const dataPointOptions: { key: DataPointKey; label: string; callColor: string; putColor: string; callDash?: string; putDash?: string }[] = [
  { key: "ltp", label: "LTP", callColor: "#22c55e", putColor: "#f97316" },
  { key: "oi", label: "OI", callColor: "#22c55e", putColor: "#f97316" },
  { key: "coi", label: "COI", callColor: "#22c55e", putColor: "#f97316", callDash: "1 3", putDash: "1 3" },
  { key: "iv", label: "IV", callColor: "#22c55e", putColor: "#f97316" },
  { key: "delta", label: "Delta", callColor: "#22c55e", putColor: "#f97316" },
  { key: "theta", label: "Theta", callColor: "#22c55e", putColor: "#f97316" },
  { key: "gamma", label: "Gamma", callColor: "#22c55e", putColor: "#f97316" },
  { key: "vega", label: "Vega", callColor: "#22c55e", putColor: "#f97316" },
  { key: "ivRoc", label: "IV RoC %", callColor: "#22c55e", putColor: "#f97316", callDash: "5 5", putDash: "5 5" },
];

// Convert 0 values to undefined so they are skipped instead of plotted at zero
const nz = (v?: number) => (v === 0 || v === undefined || v === null ? undefined : v);
const isEmptyPoint = (d?: GreeksDataPoint) =>
  !d || (!d.ltp && !d.oi && !d.iv && !d.delta && !d.theta && !d.gamma && !d.vega);

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
    const calls = callData.filter((d) => !isEmptyPoint(d));
    const puts = putData.filter((d) => !isEmptyPoint(d));
    const callBaseIv = calls.find((d) => d.iv > 0)?.iv;
    const putBaseIv = puts.find((d) => d.iv > 0)?.iv;

    const timestampMap = new Map<number, { call?: GreeksDataPoint; put?: GreeksDataPoint }>();

    calls.forEach((d) => {
      timestampMap.set(d.timestamp, { ...timestampMap.get(d.timestamp), call: d });
    });

    puts.forEach((d) => {
      timestampMap.set(d.timestamp, { ...timestampMap.get(d.timestamp), put: d });
    });

    const roc = (iv?: number, base?: number) =>
      base && iv && iv > 0 ? ((iv - base) / base) * 100 : undefined;

    return Array.from(timestampMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, { call, put }]) => ({
        timestamp,
        time: (() => { const d = new Date(timestamp); return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`; })(),
        callLtp: nz(call?.ltp),
        putLtp: nz(put?.ltp),
        callCoi: nz(call?.coi),
        putCoi: nz(put?.coi),
        callOi: nz(call?.oi),
        putOi: nz(put?.oi),
        callIv: nz(call?.iv),
        putIv: nz(put?.iv),
        callDelta: nz(call?.delta),
        putDelta: nz(put?.delta),
        callTheta: nz(call?.theta),
        putTheta: nz(put?.theta),
        callGamma: nz(call?.gamma),
        putGamma: nz(put?.gamma),
        callVega: nz(call?.vega),
        putVega: nz(put?.vega),
        callIvRoc: roc(call?.iv, callBaseIv),
        putIvRoc: roc(put?.iv, putBaseIv),
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">
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
                    strokeDasharray={opt.callDash}
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
                    strokeDasharray={opt.putDash}
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
