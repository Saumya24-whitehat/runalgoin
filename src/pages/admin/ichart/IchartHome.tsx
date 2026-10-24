import { Link } from "react-router-dom";
import { IchartShell } from "@/components/ichart/IchartShell";
import { ICHART_MENU } from "@/components/ichart/ichartMenu";

export default function IchartHome() {
  return (
    <IchartShell title="iChart Home" back={false}>
      <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
        {ICHART_MENU.map((g) => (
          <div key={g.group} className="border bg-card">
            <div className="border-b bg-primary/10 px-3 py-2 text-xs font-semibold uppercase text-primary">{g.group}</div>
            <ul className="divide-y">
              {g.items.map((i) => (
                <li key={i.key + i.label} className="flex items-center justify-between px-3 py-2 text-xs">
                  {i.to ? <Link to={i.to} className="font-medium text-foreground hover:text-primary hover:underline">{i.label}</Link> : <span className="text-muted-foreground">{i.label}</span>}
                  <span className={`text-[10px] ${i.to ? "text-success" : "text-muted-foreground"}`}>{i.to ? "Ready" : "Coming soon"}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </IchartShell>
  );
}
