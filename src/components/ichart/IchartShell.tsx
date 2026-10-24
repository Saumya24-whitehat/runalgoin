import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ICHART_MENU, IchartMenuNode } from "./ichartMenu";
import "./vendor/sm-core.css";
import "./vendor/sm-blue.css";
import "./ichart.css";

const HIDDEN_TOP = new Set(["Subscription Details", "Login", "Logout", "New Year Offer"]);

function MenuItem({ node }: { node: IchartMenuNode }) {
  const label = node.label.trim();
  return (
    <li>
      {node.to ? <Link to={node.to}>{label}</Link> : <a href="#" onClick={(e) => e.preventDefault()} className={node.children ? "has-submenu" : "disabled"} title={node.children ? undefined : "Coming soon"}>{label}{node.children && <span className="sub-arrow" />}</a>}
      {node.children && <ul>{node.children.map((c) => <MenuItem key={c.label} node={c} />)}</ul>}
    </li>
  );
}

export function IchartShell({ title, children }: { title?: string; children: ReactNode; back?: boolean }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) navigate("/dashboard");
      setAllowed(Boolean(data));
    });
  }, [user, loading, navigate]);

  if (!allowed) return <div className="ichart p-6">Checking access…</div>;

  return (
    <div className="ichart">
      <nav id="main-nav" className="ichart-nav">
        <button className="main-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle main menu"><span className="main-menu-btn-icon" /></button>
        <ul id="main-menu" className={`sm sm-blue ${mobileOpen ? "open" : ""}`}>
          {ICHART_MENU.filter((n) => !HIDDEN_TOP.has(n.label.trim())).map((n) => <MenuItem key={n.label} node={n} />)}
          <li><Link to="/admin">Admin</Link></li>
        </ul>
      </nav>
      {title && <div className="pageHeading">{title}</div>}
      {children}
      <div className="bottom-nav ichart-footer">
        <div className="px-2"><a href="#">© {new Date().getFullYear()}, OptionWorld</a></div>
        <div className="ichart-footer-links">
          <div className="px-2"><Link to="/contact">Contact Us</Link></div>
          <div className="px-2"><Link to="/about">About Us</Link></div>
          <div className="px-2"><Link to="/privacy-policy">Privacy Policy</Link></div>
        </div>
      </div>
    </div>
  );
}
