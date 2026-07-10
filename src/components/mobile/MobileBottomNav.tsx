import { NavLink, useLocation } from "react-router-dom";
import { Home, Link2, Activity, Wrench, User } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/option-chain", label: "Chain", icon: Link2 },
  { to: "/indices", label: "Markets", icon: Activity },
  { to: "/option-builder", label: "Strategy", icon: Wrench },
  { to: "/profile", label: "Profile", icon: User },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  // Hide on auth/landing/welcome
  if (["/auth", "/", "/welcome"].includes(pathname)) return null;

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-[90] bg-nav-bg border-t border-nav-border shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1.5 px-1 text-[10px] font-medium transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
              end={to === "/dashboard"}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} strokeWidth={isActive ? 2.4 : 2} />
                  <span className="leading-none">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
