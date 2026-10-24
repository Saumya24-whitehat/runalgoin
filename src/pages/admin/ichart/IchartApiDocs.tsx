import { IchartShell } from "@/components/ichart/IchartShell";
import { ICHART_DATA_SOURCES } from "@/components/ichart/ichartDataSources";

export default function IchartApiDocs() {
  return (
    <IchartShell title="API Document">
      <div className="box" style={{ overflowX: "auto" }}>
        <table className="table table-bordered" style={{ width: "100%", fontSize: 12 }}>
          <thead>
            <tr><th>Page</th><th>ichart endpoint</th><th>OptionWorld function</th><th>Source URL</th><th>Fields used</th><th>How it's calculated</th></tr>
          </thead>
          <tbody>
            {ICHART_DATA_SOURCES.flatMap((p) =>
              p.sources.map((s, i) => (
                <tr key={p.page + i}>
                  {i === 0 && <td rowSpan={p.sources.length}><b>{p.page}</b></td>}
                  {i === 0 && <td rowSpan={p.sources.length}>{p.ichartEndpoint}</td>}
                  <td>{s.fn}</td><td>{s.url}</td><td>{s.fields}</td><td>{s.calc}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </IchartShell>
  );
}
