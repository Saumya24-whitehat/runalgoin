import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const times = Array.from({ length: 126 }, (_, i) => {
  const total = 9 * 60 + 15 + i * 3;
  return total <= 15 * 60 + 30 ? `${String(Math.floor(total / 60)).padStart(2, "0")}${String(total % 60).padStart(2, "0")}` : null;
}).filter((value): value is string => Boolean(value));

interface Props { symbols: string[]; expiries: string[]; symbol: string; expiry: string; time: string; loading: boolean; onSymbol: (value: string) => void; onExpiry: (value: string) => void; onTime: (value: string) => void; onRefresh: () => void }

export function NitinControls(props: Props) {
  return <div className="grid gap-2 border-y bg-card p-3 sm:grid-cols-[minmax(160px,1fr)_minmax(145px,1fr)_minmax(130px,1fr)_auto]">
    <Select value={props.symbol} onValueChange={props.onSymbol}><SelectTrigger aria-label="Underlying"><SelectValue /></SelectTrigger><SelectContent>{props.symbols.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
    <Select value={props.expiry} onValueChange={props.onExpiry}><SelectTrigger aria-label="Expiry"><SelectValue placeholder="Expiry" /></SelectTrigger><SelectContent>{props.expiries.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
    <Select value={props.time || "live"} onValueChange={(value) => props.onTime(value === "live" ? "" : value)}><SelectTrigger aria-label="Market time"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="live">LIVE · auto refresh</SelectItem>{times.map((item) => <SelectItem key={item} value={item}>{item.slice(0, 2)}:{item.slice(2)} IST</SelectItem>)}</SelectContent></Select>
    <Button variant="outline" size="icon" onClick={props.onRefresh} disabled={props.loading} aria-label="Refresh analysis"><RefreshCw className={`h-4 w-4 ${props.loading ? "animate-spin" : ""}`} /></Button>
  </div>;
}
