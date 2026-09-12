import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchNitinAnalysis, fetchNitinExpiries, fetchNitinSymbols } from "@/services/nitinBhaiyaApi";
import { ChainStrike, runNitinBhaiyaEngine } from "@/utils/nitinBhaiyaEngine";

export function useNitinBhaiyaAnalysis() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [expiries, setExpiries] = useState<string[]>([]);
  const [symbol, setSymbol] = useState("Nifty 50");
  const [expiry, setExpiry] = useState("");
  const [time, setTime] = useState("");
  const [current, setCurrent] = useState<ChainStrike[]>([]);
  const [baseline, setBaseline] = useState<ChainStrike[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => { fetchNitinSymbols().then(setSymbols).catch(() => setError("Symbols could not be loaded.")); }, []);
  useEffect(() => {
    setExpiry(""); setExpiries([]);
    fetchNitinExpiries(symbol).then((items) => { setExpiries(items); setExpiry(items[0] ?? ""); }).catch(() => setError("Expiry dates could not be loaded."));
  }, [symbol]);
  const refresh = useCallback(async (silent = false) => {
    if (!symbol || !expiry) return;
    if (!silent) setLoading(true);
    setError("");
    try { const data = await fetchNitinAnalysis(symbol, expiry, time || undefined); setCurrent(data.current); setBaseline(data.baseline); setLastRefresh(new Date()); }
    catch { setError("Analysis data could not be loaded. Please retry."); }
    finally { if (!silent) setLoading(false); }
  }, [symbol, expiry, time]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (time) return; const id = window.setInterval(() => refresh(true), 60000); return () => window.clearInterval(id); }, [refresh, time]);
  const engine = useMemo(() => runNitinBhaiyaEngine(current, baseline), [current, baseline]);
  return { symbols, expiries, symbol, setSymbol, expiry, setExpiry, time, setTime, current, baseline, engine, loading, error, lastRefresh, refresh };
}