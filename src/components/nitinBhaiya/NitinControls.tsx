import { format, parse } from "date-fns";
import { CalendarIcon, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const times = Array.from({ length: 126 }, (_, i) => {
  const total = 9 * 60 + 15 + i * 3;
  return total <= 15 * 60 + 30 ? `${String(Math.floor(total / 60)).padStart(2, "0")}${String(total % 60).padStart(2, "0")}` : null;
}).filter((value): value is string => Boolean(value));

interface Props { symbols: string[]; expiries: string[]; symbol: string; expiry: string; date: string; time: string; loading: boolean; onSymbol: (value: string) => void; onExpiry: (value: string) => void; onDate: (value: string) => void; onTime: (value: string) => void; onRefresh: () => void }

export function NitinControls(props: Props) {
  const selected = props.date ? parse(props.date, "yyyy-MM-dd", new Date()) : undefined;
  return <div className="grid gap-2 border-y bg-card p-3 sm:grid-cols-[minmax(140px,1fr)_minmax(135px,1fr)_minmax(150px,auto)_minmax(130px,1fr)_auto]">
    <Select value={props.symbol} onValueChange={props.onSymbol}><SelectTrigger aria-label="Underlying"><SelectValue /></SelectTrigger><SelectContent>{props.symbols.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
    <Select value={props.expiry} onValueChange={props.onExpiry}><SelectTrigger aria-label="Expiry"><SelectValue placeholder="Expiry" /></SelectTrigger><SelectContent>{props.expiries.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
    <div className="flex gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !props.date && "text-muted-foreground")} aria-label="Historical date">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selected ? format(selected, "dd/MM/yyyy") : <span>Today (live)</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={selected} onSelect={(d) => props.onDate(d ? format(d, "yyyy-MM-dd") : "")} disabled={(d) => d > new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
        </PopoverContent>
      </Popover>
      {props.date && <Button variant="ghost" size="icon" onClick={() => props.onDate("")} aria-label="Back to live"><X className="h-4 w-4" /></Button>}
    </div>
    <Select value={props.time || "live"} onValueChange={(value) => props.onTime(value === "live" ? "" : value)}><SelectTrigger aria-label="Market time"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="live">{props.date ? "Full day" : "LIVE · auto refresh"}</SelectItem>{times.map((item) => <SelectItem key={item} value={item}>{item.slice(0, 2)}:{item.slice(2)} IST</SelectItem>)}</SelectContent></Select>
    <Button variant="outline" size="icon" onClick={props.onRefresh} disabled={props.loading} aria-label="Refresh analysis"><RefreshCw className={`h-4 w-4 ${props.loading ? "animate-spin" : ""}`} /></Button>
  </div>;
}
