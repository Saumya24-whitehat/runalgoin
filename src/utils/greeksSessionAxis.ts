import { GreeksDataPoint } from "@/services/greeksChartApi";

export interface SessionAxisPoint {
  timestamp: number;
  time: string;
  minute: number;
  hasData: boolean;
}

export interface GreeksChartRow extends SessionAxisPoint {
  // dynamic metric keys are added by consumers
  [key: string]: number | string | boolean | null | undefined;
}

/**
 * Build a fixed intraday session axis from 09:15 to 15:30 IST.
 * Candle timestamps are expected to have IST already baked into UTC parts,
 * so we read them as UTC hours/minutes.
 */
export function buildSessionAxis(
  timeframe: string,
  data: GreeksDataPoint[]
): { axis: SessionAxisPoint[]; hourTicks: string[] } {
  const step = Math.max(1, parseInt(timeframe) || 3);
  const start = 9 * 60 + 15; // 09:15
  const end = 15 * 60 + 30; // 15:30

  const minutes: number[] = [];
  for (let m = start; m <= end; m += step) {
    minutes.push(m);
  }

  const minuteOfDay = (ts: number) => {
    const d = new Date(ts);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  };

  const dataMinutes = data.map((d) => minuteOfDay(d.timestamp));
  const lastDataMinute = dataMinutes.length ? Math.max(...dataMinutes) : -1;

  const axis: SessionAxisPoint[] = minutes.map((m) => {
    const h = Math.floor(m / 60).toString().padStart(2, "0");
    const min = (m % 60).toString().padStart(2, "0");
    return {
      timestamp: m,
      time: `${h}:${min}`,
      minute: m,
      hasData: m <= lastDataMinute,
    };
  });

  const hourTicks = axis
    .filter((d) => d.time.endsWith(":00") || d.time.endsWith(":30"))
    .map((d) => d.time);

  return { axis, hourTicks };
}

export function minuteOfDay(ts: number): number {
  const d = new Date(ts);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
