import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

type JournalRow = {
  id: string;
  trade_date: string;
  symbol: string;
  expiry_date: string | null;
  expiry_type: string;
  strike: number | null;
  option_type: string;
  side: string;
  lots: number;
  qty_per_lot: number;
  entry_premium: number;
  exit_premium: number | null;
  entry_time: string | null;
  exit_time: string | null;
  status: string;
  notes: string | null;
};

const SYMBOLS = ["Nifty 50", "Nifty Bank", "Sensex", "Fin Nifty", "Midcap Nifty", "Other"];
const OPTION_TYPES = ["CE", "PE", "FUT"];

const emptyForm = {
  trade_date: "",
  symbol: "Nifty 50",
  expiry_date: "",
  expiry_type: "weekly",
  strike: "",
  option_type: "CE",
  side: "buy",
  lots: "1",
  qty_per_lot: "75",
  entry_premium: "",
  exit_premium: "",
  entry_time: "",
  exit_time: "",
  notes: "",
};

type FormState = typeof emptyForm;

const istToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

const fmtDate = (value: string | null) => {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
};

const fmtTime = (value: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const inr = (value: number) =>
  `${value < 0 ? "-" : ""}₹${Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const toLocalInput = (value: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
};

const fromLocalInput = (value: string) => (value ? new Date(`${value}:00+05:30`).toISOString() : null);

/** P&L in rupees. Buy: (exit - entry) * qty. Sell: (entry - exit) * qty. */
function pnlOf(row: JournalRow) {
  if (row.exit_premium === null || row.exit_premium === undefined) return null;
  const qty = (row.lots || 0) * (row.qty_per_lot || 0);
  const diff =
    row.side === "sell"
      ? Number(row.entry_premium) - Number(row.exit_premium)
      : Number(row.exit_premium) - Number(row.entry_premium);
  return diff * qty;
}

export default function TradeJournal() {
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trade_journal")
      .select("*")
      .order("trade_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error("Trades load nahi ho paaye");
    setRows((data as JournalRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openNew = () => {
    setEditId(null);
    setForm({ ...emptyForm, trade_date: istToday() });
    setOpen(true);
  };

  const openEdit = (row: JournalRow) => {
    setEditId(row.id);
    setForm({
      trade_date: row.trade_date,
      symbol: row.symbol,
      expiry_date: row.expiry_date ?? "",
      expiry_type: row.expiry_type,
      strike: row.strike === null ? "" : String(row.strike),
      option_type: row.option_type,
      side: row.side,
      lots: String(row.lots),
      qty_per_lot: String(row.qty_per_lot),
      entry_premium: String(row.entry_premium),
      exit_premium: row.exit_premium === null ? "" : String(row.exit_premium),
      entry_time: toLocalInput(row.entry_time),
      exit_time: toLocalInput(row.exit_time),
      notes: row.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.symbol || !form.entry_premium) {
      toast.error("Symbol aur entry premium zaroori hai");
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      toast.error("Pehle login karein");
      return;
    }
    const payload = {
      user_id: auth.user.id,
      trade_date: form.trade_date || istToday(),
      symbol: form.symbol,
      expiry_date: form.expiry_date || null,
      expiry_type: form.expiry_type,
      strike: form.strike ? Number(form.strike) : null,
      option_type: form.option_type,
      side: form.side,
      lots: Number(form.lots) || 1,
      qty_per_lot: Number(form.qty_per_lot) || 1,
      entry_premium: Number(form.entry_premium) || 0,
      exit_premium: form.exit_premium ? Number(form.exit_premium) : null,
      entry_time: fromLocalInput(form.entry_time),
      exit_time: fromLocalInput(form.exit_time),
      status: form.exit_premium ? "closed" : "open",
      notes: form.notes || null,
    };
    const query = editId
      ? supabase.from("trade_journal").update(payload).eq("id", editId)
      : supabase.from("trade_journal").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) {
      toast.error("Save nahi hua");
      return;
    }
    toast.success(editId ? "Trade update ho gaya" : "Trade add ho gaya");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("trade_journal").delete().eq("id", id);
    if (error) {
      toast.error("Delete nahi hua");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const filtered = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  );

  const stats = useMemo(() => {
    const closed = rows.filter((r) => pnlOf(r) !== null);
    const pnls = closed.map((r) => pnlOf(r) as number);
    const net = pnls.reduce((a, b) => a + b, 0);
    const wins = pnls.filter((p) => p > 0).length;
    return {
      total: rows.length,
      open: rows.filter((r) => r.status !== "closed").length,
      closed: closed.length,
      net,
      winRate: closed.length ? (wins / closed.length) * 100 : 0,
    };
  }, [rows]);

  return (
    <PageLayout>
      <SEO
        path="/trade-journal"
        title="Trade Journal — Entry, Exit aur Profit-Loss Record | OptionWorld"
        description="Apne option trades ka record rakhein: expiry, strike, premium, entry-exit time aur profit-loss ek hi jagah par."
      />

      <div className="space-y-3 p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-semibold">Trade Journal</h1>
            <p className="text-[11px] text-muted-foreground">
              Expiry, strike, premium, entry-exit time aur profit-loss — sab ek jagah.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trades</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openNew}>
                  <Plus className="mr-1 h-3 w-3" /> Add trade
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editId ? "Trade edit karein" : "Naya trade add karein"}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Trade date</Label>
                    <Input type="date" value={form.trade_date} onChange={(e) => set("trade_date", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Symbol</Label>
                    <Select value={form.symbol} onValueChange={(v) => set("symbol", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SYMBOLS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Expiry date</Label>
                    <Input type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Expiry type</Label>
                    <Select value={form.expiry_type} onValueChange={(v) => set("expiry_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Strike</Label>
                    <Input type="number" value={form.strike} onChange={(e) => set("strike", e.target.value)} placeholder="25000" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">CE / PE / FUT</Label>
                    <Select value={form.option_type} onValueChange={(v) => set("option_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OPTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Buy / Sell</Label>
                    <Select value={form.side} onValueChange={(v) => set("side", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Lots</Label>
                      <Input type="number" value={form.lots} onChange={(e) => set("lots", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Lot size</Label>
                      <Input type="number" value={form.qty_per_lot} onChange={(e) => set("qty_per_lot", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Entry premium</Label>
                    <Input type="number" value={form.entry_premium} onChange={(e) => set("entry_premium", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Exit premium</Label>
                    <Input type="number" value={form.exit_premium} onChange={(e) => set("exit_premium", e.target.value)} placeholder="khaali = open" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Entry time</Label>
                    <Input type="datetime-local" value={form.entry_time} onChange={(e) => set("entry_time", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Exit time</Label>
                    <Input type="datetime-local" value={form.exit_time} onChange={(e) => set("exit_time", e.target.value)} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[11px]">Notes</Label>
                    <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Setup, reason, mistake..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button size="sm" onClick={save} disabled={saving}>
                    {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          <Card><CardContent className="p-2">
            <p className="text-[10px] text-muted-foreground">Total trades</p>
            <p className="text-lg font-semibold">{stats.total}</p>
          </CardContent></Card>
          <Card><CardContent className="p-2">
            <p className="text-[10px] text-muted-foreground">Open / Closed</p>
            <p className="text-lg font-semibold">{stats.open} / {stats.closed}</p>
          </CardContent></Card>
          <Card><CardContent className="p-2">
            <p className="text-[10px] text-muted-foreground">Net P&L</p>
            <p className={cn("text-lg font-semibold", stats.net >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {inr(stats.net)}
            </p>
          </CardContent></Card>
          <Card><CardContent className="p-2">
            <p className="text-[10px] text-muted-foreground">Win rate</p>
            <p className="text-lg font-semibold">{stats.winRate.toFixed(1)}%</p>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader className="p-2">
            <CardTitle className="text-xs">Trades</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-3 text-[11px] text-muted-foreground">Load ho raha hai...</p>
            ) : !filtered.length ? (
              <p className="p-3 text-[11px] text-muted-foreground">
                Abhi koi trade nahi hai. "Add trade" par click karke apna pehla trade likhein.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-1">Date</th>
                      <th className="p-1">Symbol</th>
                      <th className="p-1">Expiry</th>
                      <th className="p-1">Strike</th>
                      <th className="p-1">Side</th>
                      <th className="p-1 text-right">Qty</th>
                      <th className="p-1 text-right">Entry</th>
                      <th className="p-1 text-right">Exit</th>
                      <th className="p-1">In</th>
                      <th className="p-1">Out</th>
                      <th className="p-1 text-right">P&L</th>
                      <th className="p-1">Notes</th>
                      <th className="p-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const pnl = pnlOf(row);
                      return (
                        <tr key={row.id} className="border-t border-border/60">
                          <td className="p-1 whitespace-nowrap">{fmtDate(row.trade_date)}</td>
                          <td className="p-1 whitespace-nowrap">{row.symbol}</td>
                          <td className="p-1 whitespace-nowrap">
                            {fmtDate(row.expiry_date)}
                            <span className="ml-1 text-muted-foreground">({row.expiry_type})</span>
                          </td>
                          <td className="p-1 whitespace-nowrap">
                            {row.strike ?? "—"} {row.option_type}
                          </td>
                          <td className="p-1">
                            <Badge variant={row.side === "buy" ? "default" : "secondary"} className="px-1 py-0 text-[10px]">
                              {row.side === "buy" ? "Buy" : "Sell"}
                            </Badge>
                          </td>
                          <td className="p-1 text-right">{row.lots}×{row.qty_per_lot}</td>
                          <td className="p-1 text-right">{Number(row.entry_premium).toFixed(2)}</td>
                          <td className="p-1 text-right">
                            {row.exit_premium === null ? <span className="text-muted-foreground">open</span> : Number(row.exit_premium).toFixed(2)}
                          </td>
                          <td className="p-1 whitespace-nowrap">{fmtTime(row.entry_time)}</td>
                          <td className="p-1 whitespace-nowrap">{fmtTime(row.exit_time)}</td>
                          <td className={cn(
                            "p-1 text-right font-semibold",
                            pnl === null ? "text-muted-foreground" : pnl >= 0 ? "text-emerald-600" : "text-rose-600",
                          )}>
                            {pnl === null ? "—" : inr(pnl)}
                          </td>
                          <td className="max-w-[160px] truncate p-1 text-muted-foreground" title={row.notes ?? ""}>
                            {row.notes ?? "—"}
                          </td>
                          <td className="p-1">
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(row)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(row.id)}>
                                <Trash2 className="h-3 w-3 text-rose-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
