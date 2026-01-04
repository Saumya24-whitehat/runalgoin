import { TrendingUp, Mail, Phone, MapPin } from "lucide-react";

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
      { name: "Blog", url: "/blog" },
      { name: "FAQ", url: "/faq" },
      { name: "Support", url: "/support" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About Us", url: "/about" },
      { name: "Careers", url: "/careers" },
      { name: "Contact", url: "/contact" },
      { name: "Privacy Policy", url: "/privacy-policy" },
      { name: "Terms of Service", url: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <a href="/" className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
              <span className="font-heading font-bold text-xl text-foreground">Runalgo</span>
            </a>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Advanced tools for smart options trading in Indian markets. Make data-driven decisions with real-time
              analytics.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>support@runalgo.xyz</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Mumbai, India</span>
              </div>
            </div>
          </div>

          {/* Link Columns */}
          {footerLinks.map((section, index) => (
            <div key={index}>
              <h4 className="font-heading font-semibold text-foreground mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <a href={link.url} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2024 Runalgo. All rights reserved.</p>
          <p className="text-sm text-muted-foreground">Trading involves risk. Please trade responsibly.</p>
        </div>
      </div>
    </footer>
  );
}
