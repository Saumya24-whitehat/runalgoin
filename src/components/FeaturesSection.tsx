import { TrendingUp, Scale, BarChart3, Target, LineChart, Layers, Zap, Shield } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Real-Time Option Chain",
    description: "Track real-time options data for Nifty, Bank Nifty, and more with live updates.",
  },
  {
    icon: Scale,
    title: "Max Pain Analysis",
    description: "Identify market pain points to improve your trading strategies effectively.",
  },
  {
    icon: BarChart3,
    title: "PCR & OI Analysis",
    description: "Analyze Put-Call Ratio and Open Interest to stay ahead of market movements.",
  },
  {
    icon: Target,
    title: "Support & Resistance",
    description: "Automatic detection of key support and resistance levels for smarter entries.",
  },
  {
    icon: LineChart,
    title: "Advanced Charts",
    description: "Interactive charts with multiple indicators for comprehensive technical analysis.",
  },
  {
    icon: Layers,
    title: "Greeks Analysis",
    description: "Track Delta, Gamma, Theta, and Vega for precise options pricing insights.",
  },
  {
    icon: Zap,
    title: "Algo Trading",
    description: "Automate your trading strategies with our powerful algorithmic trading tools.",
  },
  {
    icon: Shield,
    title: "Risk Management",
    description: "Built-in risk management tools to protect your capital and maximize returns.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Powerful Trading Tools
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to make informed trading decisions in one platform
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-feature-card border border-feature-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-lg bg-feature-iconBg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <feature.icon className="h-7 w-7 text-feature-iconColor" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
