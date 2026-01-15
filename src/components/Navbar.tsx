import { useState } from "react";
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

const navItems: NavItem[] = [
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
          { icon: Layers, label: "Summary", iconColor: "text-primary" },
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
        ],
      },
      {
        title: "CHARTS",
        items: [
          { icon: TrendingUp, label: "OTR", iconColor: "text-primary", path: "/otr" },
          { icon: LineChart, label: "Options Chart", iconColor: "text-primary", path: "/options-chart" },
          { icon: PieChart, label: "Greeks", iconColor: "text-primary", path: "/greeks-chart" },
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

  const toggleMobileDropdown = (label: string) => {
    setExpandedMobileItem(expandedMobileItem === label ? null : label);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-[100] bg-nav-bg border-b border-nav-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="216" height="233">
              <path
                d="M0 0 C0.70706085 0.00359528 1.4141217 0.00719055 2.14260864 0.01089478 C3.25473473 0.01067574 3.25473473 0.01067574 4.389328 0.01045227 C6.85130696 0.01115152 9.31321119 0.01894442 11.775177 0.02676392 C13.47768614 0.02862806 15.18019582 0.03005198 16.88270569 0.03105164 C21.37245148 0.03487714 25.86216513 0.0447077 30.35189819 0.05575562 C34.92983566 0.06596903 39.50777831 0.07054911 44.08572388 0.07559204 C53.07467259 0.08632995 62.06358898 0.103927 71.05252075 0.12442017 C71.05252075 5.07442017 71.05252075 10.02442017 71.05252075 15.12442017 C52.856062 24.22264954 30.39385855 16.77965173 10.05252075 17.12442017 C9.72252075 57.38442017 9.39252075 97.64442017 9.05252075 139.12442017 C4.10252075 139.12442017 -0.84747925 139.12442017 -5.94747925 139.12442017 C-5.97059739 121.14872738 -5.98845804 103.17303967 -5.99929142 85.19733524 C-6.00445454 76.85149188 -6.01149755 68.5056579 -6.0229187 60.15982056 C-6.03286504 52.88823247 -6.03933255 45.61665118 -6.04156774 38.34505647 C-6.04287494 34.49242495 -6.04596133 30.63981288 -6.0532093 26.78718758 C-6.05996873 23.16509345 -6.06209637 19.54302688 -6.06058693 15.92092705 C-6.06099561 13.94944788 -6.06639122 11.97797176 -6.07189941 10.00650024 C-6.07052475 8.84397232 -6.06915009 7.6814444 -6.06773376 6.48368835 C-6.06865556 5.46695069 -6.06957735 4.45021303 -6.07052708 3.40266514 C-5.84214293 -0.82589415 -3.71102174 0.00796037 0 0 Z "
                fill="#D5D6D7"
                transform="translate(44.947479248046875,28.875579833984375)"
              />
              <path
                d="M0 0 C4.62 0 9.24 0 14 0 C14 45.87 14 91.74 14 139 C-11.08 139 -36.16 139 -62 139 C-62 134.05 -62 129.1 -62 124 C-41.87 124 -21.74 124 -1 124 C-1.01160156 115.13253906 -1.02320313 106.26507813 -1.03515625 97.12890625 C-1.04091163 90.81629052 -1.04603855 84.50367675 -1.05025387 78.19106007 C-1.05580573 70.00293718 -1.06286555 61.81482442 -1.07543945 53.62670898 C-1.08538641 47.14618658 -1.09185346 40.66567181 -1.09408849 34.18514198 C-1.09539558 30.75169458 -1.0984813 27.318269 -1.10573006 23.88482857 C-1.11374416 20.05806179 -1.11399113 16.23131665 -1.11352539 12.40454102 C-1.11712067 11.25799545 -1.12071594 10.11144989 -1.12442017 8.93016052 C-1.1230455 7.89384491 -1.12167084 6.8575293 -1.12025452 5.78981018 C-1.12117631 4.88368768 -1.1220981 3.97756517 -1.12304783 3.04398441 C-1 1 -1 1 0 0 Z "
                fill="#D6D6D7"
                transform="translate(163,29)"
              />
              <path
                id="Bar1"
                d="M0 0 C1.32 0 2.64 0 4 0 C4 3.3 4 6.6 4 10 C5.65 10 7.3 10 9 10 C9 34.42 9 58.84 9 84 C7.35 84 5.7 84 4 84 C4.185625 84.9075 4.37125 85.815 4.5625 86.75 C4.95734621 89.68314324 4.94691572 91.2644657 4 94 C2.35 94 0.7 94 -1 94 C-1 90.7 -1 87.4 -1 84 C-2.65 84 -4.3 84 -6 84 C-6 59.91 -6 35.82 -6 11 C-4.35 10.67 -2.7 10.34 -1 10 C-1.01160156 9.36191406 -1.02320312 8.72382812 -1.03515625 8.06640625 C-1.04417969 7.24011719 -1.05320312 6.41382812 -1.0625 5.5625 C-1.07410156 4.73878906 -1.08570312 3.91507812 -1.09765625 3.06640625 C-1 1 -1 1 0 0 Z "
                fill="#3896DE"
                transform="translate(79,84)"
              />
              <path
                id="Bar2"
                d="M0 0 C2.0625 0.4375 2.0625 0.4375 4 1 C4.125 8.75 4.125 8.75 3 11 C4.98 11 6.96 11 9 11 C9 35.09 9 59.18 9 84 C7.02 84 5.04 84 3 84 C3 87.63 3 91.26 3 95 C1.68 95 0.36 95 -1 95 C-1 91.37 -1 87.74 -1 84 C-2.65 84 -4.3 84 -6 84 C-6 59.91 -6 35.82 -6 11 C-4.35 11 -2.7 11 -1 11 C-1.01160156 10.28972656 -1.02320312 9.57945313 -1.03515625 8.84765625 C-1.04869141 7.46900391 -1.04869141 7.46900391 -1.0625 6.0625 C-1.07410156 5.14597656 -1.08570312 4.22945312 -1.09765625 3.28515625 C-1 1 -1 1 0 0 Z "
                fill="#3598E4"
                transform="translate(107,51)"
              />
              <path
                id="Bar3"
                d="M0 0 C1.32 0 2.64 0 4 0 C4 3.3 4 6.6 4 10 C5.65 10 7.3 10 9 10 C9 34.42 9 58.84 9 84 C7.35 84 5.7 84 4 84 C4 87.3 4 90.6 4 94 C2.68 94 1.36 94 0 94 C-0.91058531 90.92677456 -1.08886184 88.19902639 -1 85 C-2.32 84.67 -3.64 84.34 -5 84 C-5.74866354 79.33449792 -6.12259115 74.8699906 -6.11352539 70.14672852 C-6.11367142 69.50197067 -6.11381744 68.85721283 -6.1139679 68.19291687 C-6.11327817 66.08821093 -6.10553042 63.98359649 -6.09765625 61.87890625 C-6.09578872 60.40917509 -6.0943664 58.93944331 -6.09336853 57.4697113 C-6.0895697 53.62120819 -6.07976221 49.77274344 -6.06866455 45.92425537 C-6.0583935 41.9892224 -6.05385876 38.05418317 -6.04882812 34.11914062 C-6.03813732 26.41274302 -6.02109292 18.70637691 -6 11 C-4.35 10.34 -2.7 9.68 -1 9 C-1.020625 7.700625 -1.04125 6.40125 -1.0625 5.0625 C-1.08399454 3.70834367 -1.07148199 2.35243917 -1 1 C-0.67 0.67 -0.34 0.34 0 0 Z "
                fill="#3597E1"
                transform="translate(134,13)"
              />
              <path
                d="M0 0 C0.680625 -0.00515625 1.36125 -0.0103125 2.0625 -0.015625 C4 0.25 4 0.25 7 2.25 C7 1.59 7 0.93 7 0.25 C9.33294775 0.20758277 11.66702567 0.20907063 14 0.25 C16.57377917 2.82377917 15.23458945 9.97975847 15.25 13.4375 C15.270625 14.57509766 15.29125 15.71269531 15.3125 16.88476562 C15.3445822 23.7543674 15.02792116 28.59126194 10.5 34.0625 C6.89175856 36.91902448 2.37754321 36.72973076 -2 36.25 C-5.67688817 34.61582748 -7.94159485 32.71678762 -10 29.25 C-10 28.26 -10 27.27 -10 26.25 C-3.84765625 26.15234375 -3.84765625 26.15234375 -2 26.25 C-1.67 26.58 -1.34 26.91 -1 27.25 C0.99958364 27.29080783 3.00045254 27.29254356 5 27.25 C5.33 25.93 5.66 24.61 6 23.25 C4.96875 23.641875 3.9375 24.03375 2.875 24.4375 C-1 25.25 -1 25.25 -4.25 24.0625 C-7.89943306 21.65719185 -9.60823597 20.42529209 -11 16.25 C-11.50154202 10.1311874 -11.07788705 7.14346446 -7 2.25 C-4.00261059 0.25174039 -3.36652492 -0.02550398 0 0 Z M1 7.25 C-2.13344454 8.92710239 -2.13344454 8.92710239 -2.9375 11.625 C-3.29301917 14.41722305 -3.29301917 14.41722305 -1.0625 16.5625 C-0.381875 17.119375 0.29875 17.67625 1 18.25 C2.65 17.59 4.3 16.93 6 16.25 C6 13.94 6 11.63 6 9.25 C3.67145537 8.05161791 3.67145537 8.05161791 1 7.25 Z "
                fill="#D7D8D9"
                transform="translate(154,195.75)"
              />
              <path
                d="M0 0 C16.59259259 0 16.59259259 0 20.375 2.6875 C22.41374374 5.58878917 22.92765204 7.45494989 23 11 C21.6875 13.625 21.6875 13.625 20 16 C18.66606758 17.84492843 18.66606758 17.84492843 18 20 C18.84680807 22.1517085 18.84680807 22.1517085 20.375 24.125 C23 27.84491979 23 27.84491979 23 30 C19.89810712 30.42575 17.08355042 30.61361622 14 30 C11.75913956 27.95866823 10.36574291 25.69030764 9 23 C8.67 25.31 8.34 27.62 8 30 C5.36 30 2.72 30 0 30 C0 20.1 0 10.2 0 0 Z M8 7 C8 8.98 8 10.96 8 13 C9.98 12.67 11.96 12.34 14 12 C13.67 10.35 13.34 8.7 13 7 C11.35 7 9.7 7 8 7 Z "
                fill="#D8D9DA"
                transform="translate(23,190)"
              />
              <path
                d="M0 0 C1.23556641 0.01740234 1.23556641 0.01740234 2.49609375 0.03515625 C3.32238281 0.04417969 4.14867188 0.05320313 5 0.0625 C5.63808594 0.07410156 6.27617188 0.08570313 6.93359375 0.09765625 C9.84341483 5.44277375 11.721447 11.01483053 13.62109375 16.78515625 C13.94142578 17.73455078 14.26175781 18.68394531 14.59179688 19.66210938 C15.04522461 21.02819336 15.04522461 21.02819336 15.5078125 22.421875 C15.78197998 23.24776123 16.05614746 24.07364746 16.33862305 24.92456055 C16.93359375 27.09765625 16.93359375 27.09765625 16.93359375 30.09765625 C14.29359375 30.09765625 11.65359375 30.09765625 8.93359375 30.09765625 C8.27359375 28.44765625 7.61359375 26.79765625 6.93359375 25.09765625 C5.4741167 25.15771703 4.01580103 25.24652515 2.55859375 25.34765625 C1.74648437 25.3940625 0.934375 25.44046875 0.09765625 25.48828125 C-2.25479552 25.88986545 -2.25479552 25.88986545 -3.35546875 28.14453125 C-3.59007813 28.7890625 -3.8246875 29.43359375 -4.06640625 30.09765625 C-6.70640625 30.09765625 -9.34640625 30.09765625 -12.06640625 30.09765625 C-11.47716977 26.05818725 -10.6000429 22.36733224 -9.25390625 18.515625 C-8.90070313 17.50177734 -8.5475 16.48792969 -8.18359375 15.44335938 C-7.63058594 13.88004883 -7.63058594 13.88004883 -7.06640625 12.28515625 C-6.51339844 10.6928418 -6.51339844 10.6928418 -5.94921875 9.06835938 C-2.81644793 0.13310245 -2.81644793 0.13310245 0 0 Z M1.93359375 11.09765625 C1.27359375 13.73765625 0.61359375 16.37765625 -0.06640625 19.09765625 C1.58359375 19.09765625 3.23359375 19.09765625 4.93359375 19.09765625 C4.27359375 16.45765625 3.61359375 13.81765625 2.93359375 11.09765625 C2.60359375 11.09765625 2.27359375 11.09765625 1.93359375 11.09765625 Z "
                fill="#D8D9DA"
                transform="translate(114.06640625,189.90234375)"
              />
              <path
                d="M0 0 C2.64 0 5.28 0 8 0 C8.33 5.28 8.66 10.56 9 16 C9.99 16.33 10.98 16.66 12 17 C14.14285776 16.21446432 14.14285776 16.21446432 14.625 14.29296875 C15.06701132 11.5902537 15.05847046 9.04964841 15 6.3125 C14.96248083 4.54206418 14.95318441 2.77021439 15 1 C16 0 16 0 19.5 -0.125 C23 0 23 0 24 1 C24.08713831 2.70772358 24.10700007 4.41898649 24.09765625 6.12890625 C24.09443359 7.16337891 24.09121094 8.19785156 24.08789062 9.26367188 C24.07951172 10.35228516 24.07113281 11.44089844 24.0625 12.5625 C24.05798828 13.65498047 24.05347656 14.74746094 24.04882812 15.87304688 C24.03699826 18.58208495 24.02051543 21.29101599 24 24 C23.31583008 23.99202393 22.63166016 23.98404785 21.92675781 23.97583008 C21.02795898 23.96962646 20.12916016 23.96342285 19.203125 23.95703125 C17.86749512 23.94506714 17.86749512 23.94506714 16.50488281 23.93286133 C13.85513392 23.92840211 13.85513392 23.92840211 10.75 24.6875 C6.98402727 25.11545145 5.12472574 24.05947833 2 22 C0.20716844 19.1510963 -0.24300649 17.01045406 -0.1953125 13.671875 C-0.18886719 12.87265625 -0.18242188 12.0734375 -0.17578125 11.25 C-0.15902344 10.425 -0.14226563 9.6 -0.125 8.75 C-0.11597656 7.90953125 -0.10695312 7.0690625 -0.09765625 6.203125 C-0.07415817 4.13529396 -0.03828908 2.06761005 0 0 Z "
                fill="#D7D8D9"
                transform="translate(49,196)"
              />
              <path
                d="M0 0 C3.33333333 0 6.66666667 0 10 0 C11.258125 -0.103125 12.51625 -0.20625 13.8125 -0.3125 C17.40535925 -0.32556494 17.91071279 -0.07028993 20.9375 2.3125 C24.37933534 6.79731574 24.12400737 10.77012035 24.0625 16.1875 C24.05798828 16.93708984 24.05347656 17.68667969 24.04882812 18.45898438 C24.03706354 20.30602383 24.01912865 22.15302213 24 24 C21.03 24 18.06 24 15 24 C15 18.72 15 13.44 15 8 C13.02 8.33 11.04 8.66 9 9 C8.67 13.95 8.34 18.9 8 24 C5.36 24 2.72 24 0 24 C0 16.08 0 8.16 0 0 Z "
                fill="#D7D7D8"
                transform="translate(77,196)"
              />
              <path
                d="M0 0 C3.3792573 2.03005291 6.22397384 4.44794768 8 8 C8.38557539 12.62690464 8.42958838 15.08927264 6.4375 19.3125 C3.40673816 22.65410921 1.37369179 23.85280215 -3 25 C-8.04240911 24.87026392 -11.18804925 23.67938736 -15.0625 20.4375 C-17.51095674 16.09346385 -18.22452665 12.87277155 -17 8 C-12.78928332 1.12718888 -8.02407528 -1.42679316 0 0 Z M-7.625 8.1875 C-9.1983984 9.96069105 -9.1983984 9.96069105 -9.375 12.5 C-9.17799733 15.02085683 -9.17799733 15.02085683 -7.75 16.875 C-6.0549643 18.21804394 -6.0549643 18.21804394 -3.9375 17.8125 C-1.81287474 17.06529664 -1.81287474 17.06529664 0 15 C0.50014953 12.54258463 0.50014953 12.54258463 0 10 C-2.56432114 7.52115623 -4.43603387 5.85710167 -7.625 8.1875 Z "
                fill="#D7D8DA"
                transform="translate(188,196)"
              />
              <path
                d="M0 0 C2.64 0 5.28 0 8 0 C8 10.23 8 20.46 8 31 C5.36 31 2.72 31 0 31 C0 20.77 0 10.54 0 0 Z "
                fill="#D7D8D9"
                transform="translate(133,189)"
              />
              <path
                d="M0 0 C1.32 0 2.64 0 4 0 C4.66 0.66 5.32 1.32 6 2 C6.66 2.33 7.32 2.66 8 3 C7 4 7 4 5.15234375 4.09765625 C3.1015625 4.06510417 1.05078125 4.03255208 -1 4 C-0.67 2.68 -0.34 1.36 0 0 Z "
                fill="#DEE1E2"
                transform="translate(103,216)"
              />
              <path d="M0 0 C3 1 3 1 3 1 Z " fill="#80A3A3" transform="translate(134,11)" />
            </svg>
            <span className="font-heading font-bold text-xl text-foreground">Runalgo</span>
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
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.hasDropdown ? (
                  <>
                    <button
                      onClick={() => toggleMobileDropdown(item.label)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors w-full"
                    >
                      {item.icon && <item.icon className="h-5 w-5 text-primary" />}
                      <span className="font-medium">{item.label}</span>
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
