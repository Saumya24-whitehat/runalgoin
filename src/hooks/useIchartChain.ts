import { useCallback, useEffect, useState } from "react";
import { fetchIchartChain, fetchIchartExpiries, fetchIchartSymbols } from "@/services/ichartApi";
import { ChainStrike } from "@/utils/nitinBhaiyaEngine";

export function useIchartChain() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbol, setSymbol] = useState("Nifty 50");
  const [expiries, setExpiries] = useState<string[]>([]);
  const [expiry, setExpiry] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [rows, setRows] = useState<ChainStrike[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => { fetchIchartSymbols().then(setSymbols).catch(() => setError("Symbols could not be loaded.")); }, []);
  useEffect(() => {
    fetchIchartExpiries(symbol, date || undefined)
      .then((e) => { setExpiries(e); setExpiry(e[0] ?? ""); })
      .catch(() => setError("Expiry dates could not be loaded."));
  }, [symbol, date]);

  const refresh = useCallback(async (silent = false) => {
    if (!expiry) return;
    if (!silent) setLoading(true);
    try {
      setRows(await fetchIchartChain(symbol, expiry, time || undefined, date || undefined));
      setError(null);
      setLastRefresh(new Date());
    } catch { if (!silent) setError("Option chain data could not be loaded."); }
    finally { setLoading(false); }
  }, [symbol, expiry, time, date]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (time || date) return;
    const id = window.setInterval(() => refresh(true), 60000);
    return () => window.clearInterval(id);
  }, [refresh, time, date]);

  return { symbols, symbol, setSymbol, expiries, expiry, setExpiry, date, setDate, time, setTime, rows, loading, error, lastRefresh, refresh };
}
