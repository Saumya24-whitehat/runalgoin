import { Link } from "react-router-dom";
import { IchartShell } from "@/components/ichart/IchartShell";
import { ICHART_MENU } from "@/components/ichart/ichartMenu";

export default function IchartHome() {
  return (
    <IchartShell title="Home">
      <div style={{ display: "grid", gap: 12, padding: 12, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {ICHART_MENU.map((g) => (
          <div key={g.group} className="ichart-group">
            <h3>{g.group}</h3>
            <ul>
              {g.items.map((i) => (
                <li key={i.key + i.label}>
                  {i.to ? <Link to={i.to}>{i.label}</Link> : <span>{i.label}</span>}
                  {!i.to && <span className="soon">Coming soon</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </IchartShell>
  );
}
