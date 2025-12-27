import { useState } from "react";
import { ChevronDown, TrendingUp, Menu, X, LogOut, BarChart3, LineChart, Layers, Crown, Bot, Star, Link2, Target, Flame, Filter, Wrench, Scale, BarChart2, Calculator, PieChart, Activity } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface NavDropdownItem {
  icon: React.ElementType;
  label: string;
  iconColor?: string;
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
}

const navItems: NavItem[] = [
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
          { icon: Layers, label: "Summary", iconColor: "text-primary" },
        ],
      },
      {
        title: "OPTION CHAIN",
        items: [
          { icon: Link2, label: "Option Chain", iconColor: "text-primary" },
          { icon: Target, label: "Open Chain Support-Resistance", iconColor: "text-emerald-500" },
          { icon: Flame, label: "Open Heat Map", iconColor: "text-orange-500" },
          { icon: Filter, label: "Option Chain Screener", iconColor: "text-primary" },
          { icon: Wrench, label: "Option Builder", iconColor: "text-muted-foreground" },
        ],
      },
      {
        title: "OI & COI CALCULATION",
        items: [
          { icon: Scale, label: "PCR", iconColor: "text-primary" },
          { icon: BarChart2, label: "PCR Long & Short", iconColor: "text-emerald-500" },
          { icon: Calculator, label: "TOI", iconColor: "text-emerald-500" },
          { icon: BarChart3, label: "PCR All Strikes", iconColor: "text-emerald-500" },
          { icon: Target, label: "Max Pain", iconColor: "text-red-500" },
        ],
      },
      {
        title: "CHARTS",
        items: [
          { icon: TrendingUp, label: "OTR", iconColor: "text-primary" },
          { icon: LineChart, label: "Option Chart", iconColor: "text-primary" },
          { icon: PieChart, label: "Greeks", iconColor: "text-primary" },
          { icon: Activity, label: "Greeks Combined", iconColor: "text-yellow-500" },
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
          { icon: Layers, label: "OI Buildup", iconColor: "text-red-500" },
          { icon: TrendingUp, label: "Future Open - High & Low", iconColor: "text-yellow-500" },
          { icon: Activity, label: "Future Rollover", iconColor: "text-emerald-500" },
        ],
      },
    ],
  },
  {
    label: "Market Breath",
    icon: BarChart3,
    hasDropdown: false,
  },
  {
    label: "Stocks",
    icon: LineChart,
    hasDropdown: true,
    sections: [
      {
        title: "ANALYSIS",
        items: [
          { icon: BarChart3, label: "Screeners", iconColor: "text-primary" },
        ],
      },
      {
        title: "JACKPOT SECTION",
        items: [
          { icon: Target, label: "Jackpot Scanner", iconColor: "text-yellow-500" },
          { icon: Crown, label: "Jackpot", iconColor: "text-yellow-500" },
        ],
      },
      {
        title: "SECTOR SELECTION",
        items: [
          { icon: BarChart2, label: "All Sector Analysis", iconColor: "text-emerald-500" },
          { icon: Layers, label: "Sector Analysis", iconColor: "text-emerald-500" },
        ],
      },
    ],
  },
  {
    label: "Plans",
    icon: Crown,
    hasDropdown: false,
  },
  {
    label: "Algo",
    icon: Bot,
    hasDropdown: false,
  },
];

function NavDropdown({ sections, isOpen }: { sections: NavDropdownSection[]; isOpen: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 mt-1 bg-dropdown-bg border border-dropdown-border rounded-lg shadow-xl p-4 min-w-max animate-slide-down z-50">
      <div className="flex gap-8">
        {sections.map((section, idx) => (
          <div key={idx} className="min-w-[180px]">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide">
              {section.title}
            </h4>
            <ul className="space-y-1">
              {section.items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  <a
                    href="#"
                    className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-dropdown-hover transition-colors text-sm text-foreground"
                  >
                    <item.icon className={`h-4 w-4 ${item.iconColor || "text-primary"}`} />
                    <span>{item.label}</span>
                  </a>
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

  return (
    <nav className="sticky top-0 z-40 bg-nav-bg border-b border-nav-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="font-heading font-bold text-xl text-foreground">Runalgo</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.hasDropdown && setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-secondary ${
                    activeDropdown === item.label
                      ? "bg-secondary text-primary"
                      : "text-foreground"
                  }`}
                >
                  {item.icon && <item.icon className="h-4 w-4 text-primary" />}
                  <span>{item.label}</span>
                  {item.hasDropdown && (
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        activeDropdown === item.label ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>
                {item.sections && (
                  <NavDropdown
                    sections={item.sections}
                    isOpen={activeDropdown === item.label}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>

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
        <div className="lg:hidden bg-nav-bg border-t border-nav-border animate-slide-down">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <a
                key={item.label}
                href="#"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors"
              >
                {item.icon && <item.icon className="h-5 w-5 text-primary" />}
                <span className="font-medium">{item.label}</span>
                {item.hasDropdown && <ChevronDown className="h-4 w-4 ml-auto" />}
              </a>
            ))}
            <hr className="border-border my-2" />
            <a
              href="#"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
