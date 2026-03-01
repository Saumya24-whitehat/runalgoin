import { PCRTimeData } from "@/services/pcrApi";

export type PCRTimeframe = "3min" | "5min" | "15min" | "30min" | "1hr";

/**
 * Parses a time string like "09:15" or "09:15:00" into total minutes from midnight.
 */
function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

/**
 * Returns the bucket start minute for a given time based on the timeframe interval.
 * E.g., for 15min timeframe, 09:18 → 09:15 (minute 555).
 */
function getBucketStart(minutes: number, intervalMinutes: number, marketOpenMinute: number): number {
  const elapsed = minutes - marketOpenMinute;
  const bucketIndex = Math.floor(elapsed / intervalMinutes);
  return marketOpenMinute + bucketIndex * intervalMinutes;
}

/**
 * Aggregates 3-minute PCR data into a higher timeframe.
 * For each bucket, uses the LAST entry's snapshot values (spot, PCR, OI, strikes).
 */
export function aggregatePCRData(
  data: PCRTimeData[],
  timeframe: PCRTimeframe
): PCRTimeData[] {
  if (timeframe === "3min" || data.length === 0) return data;

  const intervalMap: Record<PCRTimeframe, number> = {
    "3min": 3,
    "5min": 5,
    "15min": 15,
    "30min": 30,
    "1hr": 60,
  };

  const interval = intervalMap[timeframe];

  // Determine market open from first entry
  const marketOpenMinute = parseTimeToMinutes(data[0].time);

  // Group entries by bucket
  const buckets = new Map<number, PCRTimeData[]>();

  for (const entry of data) {
    const mins = parseTimeToMinutes(entry.time);
    const bucketStart = getBucketStart(mins, interval, marketOpenMinute);
    if (!buckets.has(bucketStart)) {
      buckets.set(bucketStart, []);
    }
    buckets.get(bucketStart)!.push(entry);
  }

  // For each bucket, take the last entry (latest snapshot in that candle)
  const result: PCRTimeData[] = [];
  const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a - b);

  for (const key of sortedKeys) {
    const entries = buckets.get(key)!;
    const last = { ...entries[entries.length - 1] };
    // Use bucket start time as the display time
    const hours = Math.floor(key / 60);
    const mins = key % 60;
    last.time = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    result.push(last);
  }

  return result;
}
