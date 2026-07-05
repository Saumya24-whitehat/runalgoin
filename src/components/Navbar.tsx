import { useState, useEffect, useMemo } from "react";

import { useNavigate, Link } from "react-router-dom";
import {
  ChevronDown,
  TrendingUp,
  Menu,
  X,
  LogOut,
  LogIn,
  BarChart3,
  LineChart,
  Layers,
  Crown,
  Bot,
  Star,
  Link2,
  Target,
  Flame,
  Filter,
  Wrench,
  Scale,
  BarChart2,
  Calculator,
  PieChart,
  Activity,
  Play,
  User,
  Shield,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavDropdownItem {
  icon: React.ElementType;
  label: string;
  iconColor?: string;
  path?: string;
}

interface NavDropdownSection {
  title: string;
  items: NavDropdownItem[];
}

interface NavItem {
  label: string;
  icon?: React.ElementType;
  hasDropdown?: boolean;
  sections?: NavDropdownSection[];
  path?: string;
}

const baseNavItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: BarChart3,
    hasDropdown: false,
    path: "/dashboard",
  },
  {
    label: "Option Data",
    icon: TrendingUp,
    hasDropdown: true,
    sections: [
      {
        title: "ANALYSIS",
        items: [
          { icon: Star, label: "Summary Score", iconColor: "text-yellow-500" },
          { icon: Bot, label: "AI Analysis", iconColor: "text-emerald-500" },
          { icon: Layers, label: "Options Summary", iconColor: "text-primary", path: "/options-summary" },
        ],
      },
      {
        title: "OPTION CHAIN",
        items: [
          { icon: Link2, label: "Option Chain", iconColor: "text-primary", path: "/option-chain" },
          {
            icon: Target,
            label: "Open Chain Support-Resistance",
            iconColor: "text-emerald-500",
            path: "/support-resistance",
          },
          { icon: Flame, label: "Open Heat Map", iconColor: "text-orange-500", path: "/option-heatmap" },
          { icon: Filter, label: "Option Chain Screener", iconColor: "text-primary" },
          { icon: Wrench, label: "Option Builder", iconColor: "text-primary", path: "/option-builder" },
          { icon: Play, label: "Option Simulator", iconColor: "text-yellow-500", path: "/option-simulator" },
        ],
      },
      {
        title: "OI & COI CALCULATION",
        items: [
          { icon: Scale, label: "PCR", iconColor: "text-primary", path: "/pcr" },
          { icon: BarChart2, label: "PCR Long & Short", iconColor: "text-emerald-500", path: "/pcr-long-short" },
          { icon: Calculator, label: "TOI", iconColor: "text-emerald-500", path: "/toi" },
          { icon: BarChart3, label: "PCR All Strikes", iconColor: "text-emerald-500", path: "/pcr-all-strikes" },
          { icon: Target, label: "Max Pain", iconColor: "text-red-500", path: "/max-pain" },
          { icon: TrendingUp, label: "OI Trend All Strikes", iconColor: "text-orange-500", path: "/oi-change-trend" },
        ],
      },
      {
        title: "CHARTS",
        items: [
          { icon: TrendingUp, label: "OTR", iconColor: "text-primary", path: "/otr" },
          { icon: LineChart, label: "Options Chart", iconColor: "text-primary", path: "/options-chart" },
          { icon: PieChart, label: "Greeks", iconColor: "text-primary", path: "/greeks-chart" },
          { icon: BarChart3, label: "Strategy Charts", iconColor: "text-emerald-500", path: "/strategy-charts" },
          { icon: Target, label: "Premium Erosion", iconColor: "text-red-500", path: "/premium-decay" },
        ],
      },
    ],
  },
  {
    label: "Future Data",
    icon: BarChart3,
    hasDropdown: true,
    sections: [
      {
        title: "ANALYSIS",
        items: [
          { icon: Layers, label: "OI Buildup", iconColor: "text-red-500", path: "/future-buildup" },
          {
            icon: TrendingUp,
            label: "Future Open - High & Low",
            iconColor: "text-yellow-500",
            path: "/future-open-high-low",
          },
          { icon: Activity, label: "Future Rollover", iconColor: "text-emerald-500", path: "/future-rollover" },
          { icon: BarChart2, label: "Futures OI Breakup", iconColor: "text-primary", path: "/futures-oi-breakup" },
        ],
      },
    ],
  },
  {
    label: "Market Breath",
    icon: Activity,
    hasDropdown: false,
    path: "/market-breadth",
  },
  {
    label: "Stocks",
    icon: LineChart,
    hasDropdown: true,
    sections: [
      {
        title: "ANALYSIS",
        items: [{ icon: BarChart3, label: "Screeners", iconColor: "text-primary", path: "/stock-screeners" }],
      },
      {
        title: "JACKPOT SECTION",
        items: [
          { icon: Target, label: "Jackpot Scanner", iconColor: "text-yellow-500", path: "/jackpot-scanner" },
          { icon: Crown, label: "Jackpot", iconColor: "text-yellow-500", path: "/jackpot-detail?symbol=RELIANCE" },
        ],
      },
      {
        title: "SECTOR SELECTION",
        items: [
          { icon: BarChart2, label: "All Sector Analysis", iconColor: "text-emerald-500", path: "/all-sectors" },
          { icon: Layers, label: "Sector Analysis", iconColor: "text-emerald-500", path: "/sector-analysis" },
        ],
      },
    ],
  },
  {
    label: "Plans",
    icon: Crown,
    hasDropdown: false,
    path: "/plans",
  },
  {
    label: "Algo",
    icon: Bot,
    hasDropdown: false,
    path: "/algo",
  },
  {
    label: "Info",
    icon: Activity,
    hasDropdown: true,
    sections: [
      {
        title: "INFORMATION",
        items: [
          { icon: Activity, label: "NSE Holidays", iconColor: "text-red-500", path: "/holidays" },
        ],
      },
    ],
  },
];

function NavDropdown({
  sections,
  isOpen,
  onItemClick,
}: {
  sections: NavDropdownSection[];
  isOpen: boolean;
  onItemClick?: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 bg-dropdown-bg border border-dropdown-border rounded-lg shadow-xl p-4 min-w-max animate-slide-down z-50">
      <div className="flex gap-8">
        {sections.map((section, idx) => (
          <div key={idx} className="min-w-[180px]">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide">{section.title}</h4>
            <ul className="space-y-1">
              {section.items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  {item.path ? (
                    <Link
                      to={item.path}
                      onClick={onItemClick}
                      className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-dropdown-hover transition-colors text-sm text-foreground"
                    >
                      <item.icon className={`h-4 w-4 ${item.iconColor || "text-primary"}`} />
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-dropdown-hover transition-colors text-sm text-foreground cursor-pointer opacity-60">
                      <item.icon className={`h-4 w-4 ${item.iconColor || "text-primary"}`} />
                      <span>{item.label}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Navbar() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMobileItem, setExpandedMobileItem] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const { isAdmin } = useSubscription();
  const navigate = useNavigate();

  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    // Find the Info section and add Admin if user is admin
    const infoItem = items.find((i) => i.label === "Info");
    if (isAdmin && infoItem?.sections?.[0]) {
      const hasAdmin = infoItem.sections[0].items.some((i) => i.label === "Admin Panel");
      if (!hasAdmin) {
        infoItem.sections[0].items.push({
          icon: Shield,
          label: "Admin Panel",
          iconColor: "text-amber-500",
          path: "/admin",
        });
      }
    }
    return items;
  }, [isAdmin]);

  // Logo animation removed with old logo
  const toggleMobileDropdown = (label: string) => {
    setExpandedMobileItem(expandedMobileItem === label ? null : label);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-[100] bg-nav-bg border-b border-nav-border">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-1.5 sm:gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              width={36}
              height={36}
              viewBox="0 0 375 375"
              preserveAspectRatio="xMidYMid meet"
              className="sm:w-[50px] sm:h-[50px]"
            >
              <defs>
                <clipPath id="clip1">
                  <path d="M231 13.414L261 13.414L261 211L231 211Z" />
                </clipPath>

                <clipPath id="clip2">
                  <path d="M114 164L144 164L144 361.414L114 361.414Z" />
                </clipPath>

                <clipPath id="clip3">
                  <path d="M42.0625 48L203 48L203 340L42.0625 340Z" />
                </clipPath>
              </defs>

              <path
                id="Bar1"
                ref={bars.Bar1}
                fill="#0f97e4"
                d="M172.855469 117.667969H183.875V95.667969H191.128906V117.667969H202.144531V270.707031H191.128906V292.710938H183.875V270.707031H172.855469Z"
              />

              <g clipPath="url(#clip1)">
                <path
                  id="Bar2"
                  ref={bars.Bar2}
                  fill="#0f97e4"
                  d="M231.433594 35.414062H242.449219V13.414062H249.703125V35.414062H260.722656V188.453125H249.703125V210.453125H242.449219V188.453125H231.433594Z"
                />
              </g>

              <g clipPath="url(#clip2)">
                <path
                  id="Bar3"
                  ref={bars.Bar3}
                  fill="#0f97e4"
                  d="M114.28125 186.535156H125.296875V164.53125H132.550781V186.535156H143.570312V339.574219H132.550781V361.578125H125.296875V339.574219H114.28125Z"
                />
              </g>

              <g clipPath="url(#clip3)">
                <path
                  fill="#d9d9d9"
                  d="M71.402344 198.019531V78.089844H202.144531V48.800781H42.113281V339.574219H71.402344Z"
                />
              </g>

              <path
                fill="#d9d9d9"
                d="M303.597656 78.089844V310.285156H172.855469V339.574219H332.886719V48.800781H303.597656Z"
              />
            </svg>
            <span className="font-heading font-bold text-lg sm:text-xl text-foreground">Runalgo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.hasDropdown && setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                {item.path && !item.hasDropdown ? (
                  <Link
                    to={item.path}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-secondary text-foreground"
                  >
                    {item.icon && <item.icon className="h-4 w-4 text-primary" />}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-secondary ${
                      activeDropdown === item.label ? "bg-secondary text-primary" : "text-foreground"
                    }`}
                  >
                    {item.icon && <item.icon className="h-4 w-4 text-primary" />}
                    <span>{item.label}</span>
                    {item.hasDropdown && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${activeDropdown === item.label ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>
                )}
                {item.sections && (
                  <NavDropdown
                    sections={item.sections}
                    isOpen={activeDropdown === item.label}
                    onItemClick={() => setActiveDropdown(null)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden sm:flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{user.user_metadata?.name?.split(" ")[0] || "Account"}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Shield className="h-4 w-4 mr-2" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/plans")}>
                    <Crown className="h-4 w-4 mr-2" />
                    Plans
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" onClick={() => navigate("/auth")} className="hidden sm:flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-foreground" />
              ) : (
                <Menu className="h-6 w-6 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-nav-bg border-t border-nav-border animate-slide-down max-h-[80vh] overflow-y-auto">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-1 sm:space-y-2">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.hasDropdown ? (
                  <>
                    <button
                      onClick={() => toggleMobileDropdown(item.label)}
                      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-foreground hover:bg-secondary transition-colors w-full min-h-[44px]"
                    >
                      {item.icon && <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
                      <span className="font-medium text-sm sm:text-base">{item.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 ml-auto transition-transform duration-200 ${
                          expandedMobileItem === item.label ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {expandedMobileItem === item.label && item.sections && (
                      <div className="mt-2 ml-4 space-y-4 bg-secondary/30 rounded-lg p-3 animate-slide-down">
                        {item.sections.map((section, idx) => (
                          <div key={idx}>
                            <h4 className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
                              {section.title}
                            </h4>
                            <ul className="space-y-1">
                              {section.items.map((subItem, subIdx) => (
                                <li key={subIdx}>
                                  {subItem.path ? (
                                    <Link
                                      to={subItem.path}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary transition-colors text-sm text-foreground"
                                    >
                                      <subItem.icon className={`h-4 w-4 ${subItem.iconColor || "text-primary"}`} />
                                      <span>{subItem.label}</span>
                                    </Link>
                                  ) : (
                                    <span className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary transition-colors text-sm text-foreground cursor-pointer opacity-60">
                                      <subItem.icon className={`h-4 w-4 ${subItem.iconColor || "text-primary"}`} />
                                      <span>{subItem.label}</span>
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : item.path ? (
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors"
                  >
                    {item.icon && <item.icon className="h-5 w-5 text-primary" />}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ) : (
                  <span className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors opacity-60 cursor-not-allowed">
                    {item.icon && <item.icon className="h-5 w-5 text-primary" />}
                    <span className="font-medium">{item.label}</span>
                  </span>
                )}
              </div>
            ))}
            <hr className="border-border my-2" />
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors"
                >
                  <User className="h-5 w-5 text-primary" />
                  <span className="font-medium">Profile</span>
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors"
                  >
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="font-medium">Admin Panel</span>
                  </Link>
                )}
                <Link
                  to="/plans"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors"
                >
                  <Crown className="h-5 w-5 text-primary" />
                  <span className="font-medium">Plans</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors w-full"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/auth")}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 transition-colors w-full"
              >
                <LogIn className="h-5 w-5" />
                <span className="font-medium">Login</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
