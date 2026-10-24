import { IchartShell } from "@/components/ichart/IchartShell";
import { ICHART_DATA_SOURCES } from "@/components/ichart/ichartDataSources";

export default function IchartMissingApi() {
  const rows = ICHART_DATA_SOURCES.flatMap((p) => p.missing.map((m) => ({ page: p.page, ...m })));
  return (
    <IchartShell title="Didn't Get API">
      <div className="box" style={{ overflowX: "auto" }}>
        <table className="table table-bordered" style={{ width: "100%", fontSize: 12 }}>
          <thead><tr><th>Page</th><th>Missing data</th><th>What ichart uses</th><th>Current fallback</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}><td><b>{r.page}</b></td><td>{r.data}</td><td>{r.ichartUses}</td><td>{r.fallback}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </IchartShell>
  );
}
