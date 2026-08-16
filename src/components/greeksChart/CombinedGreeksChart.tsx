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
import { buildSessionAxis, GreeksChartRow, minuteOfDay } from "@/utils/greeksSessionAxis";
import { format } from "date-fns";

interface CombinedGreeksChartProps {
  symbol: string;
  expiry: string;
  strike: number;
  timeframe: string;
  callData: GreeksDataPoint[];
  putData: GreeksDataPoint[];
}

type DataPointKey = "ltp" | "oi" | "iv" | "delta" | "theta" | "gamma" | "vega" | "ivRoc" | "coi";

const dataPointOptions: { key: DataPointKey; label: string; callColor: string; putColor: string; callDash?: string; putDash?: string }[] = [
  { key: "ltp", label: "LTP", callColor: "#22c55e", putColor: "#f97316" },
  { key: "oi", label: "OI", callColor: "#22c55e", putColor: "#f97316", callDash: "6 6", putDash: "6 6" },
  { key: "coi", label: "COI", callColor: "#22c55e", putColor: "#f97316", callDash: "1 3", putDash: "1 3" },
  { key: "iv", label: "IV", callColor: "#22c55e", putColor: "#f97316", callDash: "5 2 1 2", putDash: "5 2 1 2" },
  { key: "delta", label: "Delta", callColor: "#22c55e", putColor: "#f97316", callDash: "7 4", putDash: "7 4" },
  { key: "theta", label: "Theta", callColor: "#22c55e", putColor: "#f97316", callDash: "8 2", putDash: "8 2" },
  { key: "gamma", label: "Gamma", callColor: "#22c55e", putColor: "#f97316", callDash: "4 1 4 1", putDash: "4 1 4 1" },
  { key: "vega", label: "Vega", callColor: "#22c55e", putColor: "#f97316", callDash: "3 2 3 2", putDash: "3 2 3 2" },
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
  timeframe,
  callData,
  putData,
}: CombinedGreeksChartProps) => {
  const [selectedDataPoints, setSelectedDataPoints] = useState<DataPointKey[]>(["ltp"]);

  // Merge call and put data by timestamp, aligned to a fixed 09:15 → 15:30 session axis
  const { chartData, hourTicks, lastPlottedTime } = useMemo(() => {
    const calls = callData.filter((d) => !isEmptyPoint(d));
    const puts = putData.filter((d) => !isEmptyPoint(d));
    const callBaseIv = calls.find((d) => d.iv > 0)?.iv;
    const putBaseIv = puts.find((d) => d.iv > 0)?.iv;

    const { axis, hourTicks } = buildSessionAxis(timeframe, [...calls, ...puts]);
    const step = Math.max(1, parseInt(timeframe) || 3);

    // Bucket each data point into its slot by rounding minute to the slot start
    const bucketIndex = (ts: number) => {
      const m = minuteOfDay(ts);
      const idx = Math.floor((m - (9 * 60 + 15)) / step);
      return Math.max(0, Math.min(axis.length - 1, idx));
    };

    const rows: GreeksChartRow[] = axis.map((slot) => ({
      ...slot,
      timestamp: slot.timestamp,
      time: slot.time,
      callLtp: null,
      putLtp: null,
      callCoi: null,
      putCoi: null,
      callOi: null,
      putOi: null,
      callIv: null,
      putIv: null,
      callDelta: null,
      putDelta: null,
      callTheta: null,
      putTheta: null,
      callGamma: null,
      putGamma: null,
      callVega: null,
      putVega: null,
      callIvRoc: null,
      putIvRoc: null,
    }));

    const roc = (iv?: number, base?: number) =>
      base && iv && iv > 0 ? ((iv - base) / base) * 100 : undefined;

    const fill = (d: GreeksDataPoint, side: "call" | "put") => {
      const idx = bucketIndex(d.timestamp);
      const row = rows[idx];
      if (!row) return;
      const prefix = side === "call" ? "call" : "put";
      row[`${prefix}Ltp`] = nz(d.ltp);
      row[`${prefix}Coi`] = nz(d.coi);
      row[`${prefix}Oi`] = nz(d.oi);
      row[`${prefix}Iv`] = nz(d.iv);
      row[`${prefix}Delta`] = nz(d.delta);
      row[`${prefix}Theta`] = nz(d.theta);
      row[`${prefix}Gamma`] = nz(d.gamma);
      row[`${prefix}Vega`] = nz(d.vega);
      row[`${prefix}IvRoc`] = roc(d.iv, side === "call" ? callBaseIv : putBaseIv);
    };

    calls.forEach((d) => fill(d, "call"));
    puts.forEach((d) => fill(d, "put"));

    // Null-out slots that are after the last real data point so the line grows, not the axis shifts
    const lastDataIdx = rows.reduce((max, row, idx) => (row.hasData ? idx : max), -1);
    for (let i = lastDataIdx + 1; i < rows.length; i++) {
      Object.keys(rows[i]).forEach((k) => {
        if (!["timestamp", "time", "minute", "hasData"].includes(k)) {
          rows[i][k] = null;
        }
      });
    }

    const lastPlottedTime = lastDataIdx >= 0 ? rows[lastDataIdx].time : "--:--";

    return { chartData: rows, hourTicks, lastPlottedTime };
  }, [callData, putData, timeframe]);

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
          <div>
            <CardTitle className="text-base sm:text-lg">
              {symbol} {expiry} {strike} - Combined Greeks
            </CardTitle>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Session 09:15 → 15:30 (plotted till {lastPlottedTime})
            </div>
          </div>

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
                ticks={hourTicks}
                interval={0}
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
