import { Check, X, Crown } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Perfect for getting started",
    features: [
      { name: "Option Chain", included: true },
      { name: "PCR Analysis", included: true },
      { name: "PCR All Strikes", included: true },
      { name: "Basic Charts", included: true },
      { name: "Option Heat Map", included: false },
      { name: "Option Chain Analysis", included: false },
      { name: "Option Builder", included: false },
      { name: "TOI & IV Skew", included: false },
      { name: "Advanced Screeners", included: false },
      { name: "Sector Analysis", included: false },
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "₹799",
    period: "per year",
    description: "For serious traders",
    features: [
      { name: "Option Chain", included: true },
      { name: "PCR Analysis", included: true },
      { name: "PCR All Strikes", included: true },
      { name: "Advanced Charts", included: true },
      { name: "Option Heat Map", included: true },
      { name: "Option Chain Analysis", included: true },
      { name: "Option Builder", included: true },
      { name: "TOI & IV Skew", included: true },
      { name: "Advanced Screeners", included: true },
      { name: "Sector Analysis", included: true },
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
];

export function PricingSection() {
  return (
    <section className="py-20 lg:py-28 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your trading needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-8 ${
                plan.popular
                  ? "bg-card border-2 border-primary shadow-xl shadow-primary/10"
                  : "bg-card border border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold">
                  <Crown className="h-4 w-4" />
                  Most Popular
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="font-heading text-2xl font-bold text-foreground mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-foreground font-heading">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIdx) => (
                  <li key={featureIdx} className="flex items-center gap-3">
                    {feature.included ? (
                      <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center">
                        <X className="h-3 w-3 text-destructive" />
                      </div>
                    )}
                    <span
                      className={
                        feature.included
                          ? "text-foreground"
                          : "text-muted-foreground line-through"
                      }
                    >
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
