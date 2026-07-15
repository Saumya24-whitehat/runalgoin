import { Mail, Phone } from "lucide-react";

const footerLinks = [
  {
    title: "Products",
    links: [
      { name: "Option Chain", url: "/option-chain" },
      { name: "Future Data", url: "/future-data" },
      { name: "Market Breath", url: "/market-breadth" },
      { name: "Stock Analysis", url: "/stock-analysis" },
      { name: "Algo Trading", url: "/algo-trading" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Documentation", url: "/documentation" },
      { name: "Video Tutorials", url: "/videos" },
      { name: "FAQ", url: "/faq" },
      { name: "Support", url: "/support" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About Us", url: "/about" },
      { name: "Contact", url: "/contact" },
      { name: "Privacy Policy", url: "/privacy-policy" },
      { name: "Terms of Service", url: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-8 sm:py-12 lg:py-16">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-12 mb-8 sm:mb-12">
          {/* Brand Column */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-2">
            <a href="/" className="flex items-center mb-3 sm:mb-4">
              <img src="/logo.png" alt="OptionWorld - Indian Options Trading Platform" className="h-6 sm:h-8" />
            </a>
            <p className="text-muted-foreground mb-4 sm:mb-6 max-w-sm text-xs sm:text-sm">
              Advanced tools for smart options trading in Indian markets. Make data-driven decisions with real-time
              analytics.
            </p>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                <span>rm.rakesh@gmail.com</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                <span>+61 451 509 551</span>
              </div>
            </div>
          </div>

          {/* Link Columns */}
          {footerLinks.map((section, index) => (
            <div key={index}>
              <h4 className="font-heading font-semibold text-foreground mb-2 sm:mb-4 text-sm sm:text-base">{section.title}</h4>
              <ul className="space-y-1.5 sm:space-y-3">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <a href={link.url} className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          <p className="text-[10px] sm:text-sm text-muted-foreground">© 2024 OptionWorld. All rights reserved.</p>
          <p className="text-[10px] sm:text-sm text-muted-foreground text-center sm:text-right">Trading involves risk. Please trade responsibly.</p>
        </div>
      </div>
    </footer>
  );
}
