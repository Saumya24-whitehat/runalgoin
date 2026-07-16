import { useEffect, useState } from "react";
import {
  Check,
  X,
  Crown,
  Zap,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Layers,
  LineChart,
  Sparkles,
  Shield,
  Clock,
  Settings,
  Gift,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { UserSubscriptionManager } from "@/components/admin/UserSubscriptionManager";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { AlternatePaymentModal } from "@/components/AlternatePaymentModal";
import { QrCode, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDeviceFingerprint } from "@/lib/deviceFingerprint";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ShieldAlert } from "lucide-react";

const features = [
  {
    category: "Option Chain & Analysis",
    icon: Layers,
    items: [
      { name: "Option Chain", free: true, pro: true, description: "Real-time option chain data" },
      { name: "Option Chain Analysis", free: false, pro: true, description: "Advanced strike analysis" },
      { name: "Option Heat Map", free: false, pro: true, description: "Visual OI distribution" },
      { name: "Option Builder", free: false, pro: true, description: "Multi-leg strategy builder" },
      { name: "Option Simulator", free: false, pro: true, description: "Simulate option scenarios" },
    ],
  },
  {
    category: "PCR & Sentiment",
    icon: PieChart,
    items: [
      { name: "PCR Analysis", free: true, pro: true, description: "Put-Call ratio analysis" },
      { name: "PCR All Strikes", free: true, pro: true, description: "Strike-wise PCR data" },
      { name: "PCR Long/Short", free: false, pro: true, description: "Long/Short buildup analysis" },
      { name: "ATM PCR Chart", free: false, pro: true, description: "ATM strike PCR tracking" },
    ],
  },
  {
    category: "Greeks & Analytics",
    icon: Activity,
    items: [
      { name: "Greeks Chart", free: false, pro: true, description: "Delta, Gamma, Theta, Vega" },
      { name: "Max Pain Analysis", free: false, pro: true, description: "Max pain calculation" },
      { name: "Premium Decay", free: false, pro: true, description: "Time decay analysis" },
      { name: "IV Skew", free: false, pro: true, description: "Implied volatility skew" },
    ],
  },
  {
    category: "Futures & Buildup",
    icon: TrendingUp,
    items: [
      { name: "Future Buildup", free: false, pro: true, description: "Long/Short buildup data" },
      { name: "Future Rollover", free: false, pro: true, description: "Rollover analysis" },
      { name: "Future Open High Low", free: false, pro: true, description: "OHL strategy signals" },
      { name: "OTR Analysis", free: false, pro: true, description: "Open-to-range analysis" },
    ],
  },
  {
    category: "Market Analysis",
    icon: BarChart3,
    items: [
      { name: "Market Breadth", free: false, pro: true, description: "Advance/Decline data" },
      { name: "Sector Analysis", free: false, pro: true, description: "Sector-wise performance" },
      { name: "Support & Resistance", free: false, pro: true, description: "Key levels identification" },
      { name: "Index Detail", free: false, pro: true, description: "Detailed index analytics" },
    ],
  },
  {
    category: "Screeners & Tools",
    icon: Target,
    items: [
      { name: "Stock Screeners", free: false, pro: true, description: "Custom stock filters" },
      { name: "Jackpot Scanner", free: false, pro: true, description: "High potential setups" },
      { name: "TOI Analysis", free: false, pro: true, description: "Total OI analysis" },
      { name: "FII/DII Data", free: false, pro: true, description: "Institutional activity" },
    ],
  },
];

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Get started with essential tools",
    highlight: false,
    badge: null,
    features: ["Option Chain data", "Basic PCR Analysis", "PCR All Strikes", "Limited refreshes"],
    limitations: ["No advanced analytics", "No screeners", "Basic support"],
    cta: "Get Started",
    ctaVariant: "outline" as const,
  },
  {
    name: "Pro Monthly",
    price: "₹150",
    period: "per month",
    description: "Everything you need for serious trading",
    highlight: true,
    badge: "Most Popular",
    features: [
      "All Free features",
      "Option Builder & Simulator",
      "Greeks & IV Analysis",
      "Future Buildup & Rollover",
      "Market Breadth & Sectors",
      "Advanced Screeners",
      "Max Pain & Premium Decay",
      "Real-time data refresh",
      "Priority support",
    ],
    limitations: [],
    cta: "Upgrade to Pro",
    ctaVariant: "default" as const,
  },
  {
    name: "Pro Yearly",
    price: "₹1,500",
    period: "per year",
    description: "Save with annual billing",
    highlight: false,
    badge: "Best Value",
    features: [
      "All Free features",
      "Option Builder & Simulator",
      "Greeks & IV Analysis",
      "Future Buildup & Rollover",
      "Market Breadth & Sectors",
      "Advanced Screeners",
      "Max Pain & Premium Decay",
      "Real-time data refresh",
      "Priority support",
    ],
    limitations: [],
    cta: "Upgrade to Pro",
    ctaVariant: "default" as const,
  },
  {
    name: "OptionWorld Club",
    price: "₹3,500",
    period: "per year",
    description: "Pro + private community, ideas & analyst chat",
    highlight: false,
    badge: "Club Exclusive",
    features: [
      "Everything in Pro (yearly)",
      "OptionWorld Club chat group",
      "Analyst support & Q&A",
      "Expert stock & option recommendations",
      "Trade ideas with entry / SL / target",
      "Discussions with active market participants",
      "Accelerated market learning",
    ],
    limitations: [],
    cta: "Join the Club",
    ctaVariant: "default" as const,
  },
];

// Razorpay is temporarily disabled until account verification completes.
// Keep the hook wired so we can flip this back to true without code changes.
const RAZORPAY_ENABLED = false;

export default function Plans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscription, loading: subLoading, isPro, isAdmin, refetch: refetchSub } = useSubscription();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const { startCheckout, loading: checkoutLoading } = useRazorpayCheckout();
  const [altModal, setAltModal] = useState<{
    open: boolean;
    method: "upi" | "paypal";
    plan: "monthly" | "yearly" | "club";
  }>({ open: false, method: "upi", plan: "monthly" });
  const [trialUsed, setTrialUsed] = useState<boolean>(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [abuseModal, setAbuseModal] = useState<{ open: boolean; message: string }>({ open: false, message: "" });

  useEffect(() => {
    if (!user) {
      setTrialUsed(false);
      return;
    }
    supabase
      .from("subscriptions")
      .select("trial_used")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setTrialUsed(!!data?.trial_used));
  }, [user]);

  const planKey = (planName: string): "monthly" | "yearly" | "club" | null =>
    planName === "Pro Monthly"
      ? "monthly"
      : planName === "Pro Yearly"
      ? "yearly"
      : planName === "OptionWorld Club"
      ? "club"
      : null;

  const handlePlanAction = (planName: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const key = planKey(planName);
    if (!key) return;
    // Club is a superset of Pro — don't block if user is Pro but not Club yet.
    if (key === "club" && subscription?.plan_type !== "club" && subscription?.plan_type !== "enterprise") {
      startCheckout("club");
      return;
    }
    if (planName === "Pro Monthly" && !isPro) startCheckout("monthly");
    else if (planName === "Pro Yearly" && !isPro) startCheckout("yearly");
  };

  const startFreeTrial = async () => {
    if (!user) {
      navigate("/auth?redirect=/plans");
      return;
    }
    setTrialLoading(true);
    try {
      const fingerprint = await getDeviceFingerprint();
      const { data, error } = await supabase.functions.invoke("start-free-trial", {
        body: { fingerprint },
      });

      // Try to extract a server-provided error message even on non-2xx.
      let serverError: string | null = (data as any)?.error ?? null;
      if (!serverError && error) {
        const ctx: any = (error as any).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            serverError = body?.error ?? null;
          } catch (_) {
            /* ignore */
          }
        }
      }

      if (serverError || error) {
        const msg = serverError || error?.message || "Failed to start trial";
        const isAbuse =
          /already\s*(been\s*)?used|already\s*claimed|device|network|one\s*free\s*trial/i.test(msg);
        if (isAbuse) {
          setAbuseModal({ open: true, message: msg });
          setTrialUsed(true);
        } else {
          toast.error(msg);
        }
        return;
      }

      toast.success("Your 15-day Pro trial is now active!");
      setTrialUsed(true);
      await refetchSub();
    } catch (e: any) {
      toast.error(e.message || "Could not start trial");
    } finally {
      setTrialLoading(false);
    }
  };

  const openAlt = (planName: string, method: "upi" | "paypal") => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const p = planKey(planName);
    if (!p) return;
    setAltModal({ open: true, method, plan: p });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Plans & Pricing — OptionWorld"
        description="OptionWorld subscription plans and pricing. Choose Free, Pro, or Business plan to unlock advanced options analytics for Indian NSE markets."
        path="/plans"
      />
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <main>
        {/* Admin Panel */}
        {isAdmin && (
          <div className="container mx-auto px-4 pt-6">
            <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">Admin Access</p>
                  <p className="text-sm text-muted-foreground">Manage user subscriptions</p>
                </div>
              </div>
              <Button onClick={() => setShowAdminPanel(true)} className="gap-2">
                <Settings className="h-4 w-4" />
                Manage Users
              </Button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />

          <div className="container relative mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                Simple & Transparent Pricing
              </Badge>
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                Choose Your
                <span className="text-primary block mt-2">Trading Edge</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Unlock powerful analytics tools designed for serious options traders. Start free and upgrade when you're
                ready.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={`relative rounded-3xl p-8 transition-all duration-300 ${
                    plan.highlight
                      ? "bg-gradient-to-b from-primary/10 to-card border-2 border-primary shadow-2xl shadow-primary/10 scale-105"
                      : "bg-card border border-border hover:border-primary/50"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold shadow-lg">
                        <Crown className="h-4 w-4" />
                        {plan.badge}
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-8 pt-4">
                    <h3 className="font-heading text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-5xl font-bold text-foreground font-heading">{plan.price}</span>
                      <span className="text-muted-foreground text-lg">/{plan.period}</span>
                    </div>
                    <p className="text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                          <Check className="h-4 w-4 text-success" />
                        </div>
                        <span className="text-foreground">{feature}</span>
                      </div>
                    ))}
                    {plan.limitations.map((limitation, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                          <X className="h-4 w-4 text-destructive" />
                        </div>
                        <span className="text-muted-foreground">{limitation}</span>
                      </div>
                    ))}
                  </div>

                  {(() => {
                    const isProPlan = plan.name === "Pro Monthly" || plan.name === "Pro Yearly";
                    const isClubPlan = plan.name === "OptionWorld Club";
                    const isPaidPlan = isProPlan || isClubPlan;
                    const currentPlanType = subscription?.plan_type;
                    const alreadyOnThis =
                      (isClubPlan && (currentPlanType === "club" || currentPlanType === "enterprise")) ||
                      (isProPlan && isPro && !(currentPlanType === "club" || currentPlanType === "enterprise"));
                    // Hide the main CTA for paid plans while Razorpay is disabled — users pay via UPI/PayPal instead.
                    if (isPaidPlan && !RAZORPAY_ENABLED && !alreadyOnThis) return null;
                    return (
                      <Button
                        variant={plan.ctaVariant}
                        size="lg"
                        onClick={() => handlePlanAction(plan.name)}
                        disabled={(isPaidPlan && (alreadyOnThis || checkoutLoading)) || (plan.name === "Free" && !isPro)}
                        className={`w-full text-lg py-6 ${
                          plan.highlight
                            ? "bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all"
                            : ""
                        } ${alreadyOnThis ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {plan.highlight && <Zap className="h-5 w-5 mr-2" />}
                        {alreadyOnThis ? (
                          <>
                            <Check className="h-5 w-5 mr-2" />
                            Current Plan
                          </>
                        ) : plan.name === "Free" && !isPro ? (
                          "Current Plan"
                        ) : (
                          plan.cta
                        )}
                      </Button>
                    );
                  })()}

                  {(() => {
                    const isProPlan = plan.name === "Pro Monthly" || plan.name === "Pro Yearly";
                    const isClubPlan = plan.name === "OptionWorld Club";
                    const currentPlanType = subscription?.plan_type;
                    const alreadyOnClub = currentPlanType === "club" || currentPlanType === "enterprise";
                    if (!(isProPlan || isClubPlan)) return null;
                    if (isProPlan && isPro) return null;
                    if (isClubPlan && alreadyOnClub) return null;
                    return (
                      <div className="mt-3 space-y-2">
                        {RAZORPAY_ENABLED && (
                          <div className="flex items-center gap-2">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-xs text-muted-foreground">or pay via</span>
                            <div className="h-px flex-1 bg-border" />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" onClick={() => openAlt(plan.name, "upi")} className="gap-1.5">
                            <QrCode className="h-4 w-4" />
                            UPI QR
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openAlt(plan.name, "paypal")} className="gap-1.5">
                            <Wallet className="h-4 w-4" />
                            PayPal
                          </Button>
                        </div>

                        {isProPlan && !trialUsed && (
                          <>
                            <div className="flex items-center gap-2 pt-1">
                              <div className="h-px flex-1 bg-border" />
                              <span className="text-xs text-muted-foreground">or try free</span>
                              <div className="h-px flex-1 bg-border" />
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={startFreeTrial}
                              disabled={trialLoading}
                              className="w-full gap-1.5"
                            >
                              <Gift className="h-4 w-4" />
                              {trialLoading ? "Activating…" : "Start 15-day Free Trial"}
                            </Button>
                          </>
                        )}
                        {isProPlan && trialUsed && !isPro && (
                          <p className="text-xs text-muted-foreground text-center pt-1">
                            Free trial already used on this account
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* Features Comparison */}
        <section className="py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
                Complete Feature Comparison
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you get with each plan at a glance
              </p>
            </div>

            <div className="max-w-6xl mx-auto space-y-8">
              {features.map((category, catIdx) => (
                <div key={catIdx} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="bg-muted/50 px-6 py-4 flex items-center gap-3 border-b border-border">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <category.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">{category.category}</h3>
                  </div>

                  <div className="divide-y divide-border">
                    {category.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-8 ml-4">
                          <div className="w-20 text-center">
                            {item.free ? (
                              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-success/20">
                                <Check className="h-5 w-5 text-success" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                                <X className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">Free</p>
                          </div>
                          <div className="w-20 text-center">
                            {item.pro ? (
                              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/20">
                                <Check className="h-5 w-5 text-primary" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                                <X className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">Pro</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">Secure Payments</h3>
                <p className="text-sm text-muted-foreground">256-bit SSL encryption for all transactions</p>
              </div>
              <div className="text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">Instant Access</h3>
                <p className="text-sm text-muted-foreground">Get immediate access to all Pro features</p>
              </div>
              <div className="text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <LineChart className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">Real-time Data</h3>
                <p className="text-sm text-muted-foreground">Live market data with auto-refresh</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-heading text-3xl font-bold text-foreground mb-4">Ready to Level Up Your Trading?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of traders who are already using our advanced analytics tools
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-lg px-8 py-6"
                onClick={startFreeTrial}
                disabled={trialLoading || isPro || trialUsed}
              >
                <Zap className="h-5 w-5 mr-2" />
                {isPro
                  ? "Pro Active"
                  : trialUsed
                  ? "Trial Already Used"
                  : trialLoading
                  ? "Activating…"
                  : "Start 15-day Free Trial"}
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6" onClick={() => navigate("/dashboard")}>
                View Demo
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Admin Panel Modal */}
      <UserSubscriptionManager isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} />
      <AlternatePaymentModal
        open={altModal.open}
        onOpenChange={(o) => setAltModal((prev) => ({ ...prev, open: o }))}
        method={altModal.method}
        plan={altModal.plan}
      />

      <Dialog open={abuseModal.open} onOpenChange={(o) => setAbuseModal((p) => ({ ...p, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">Free trial not available</DialogTitle>
            <DialogDescription className="text-center pt-2">
              {abuseModal.message ||
                "A free trial has already been claimed from this device or network."}
              <span className="mt-3 block text-sm">
                OptionWorld allows <strong>one free trial per person</strong>. Creating multiple
                accounts to reuse the trial is against our terms of use and is automatically
                blocked. If you believe this is a mistake, please contact support.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setAbuseModal({ open: false, message: "" })}>
              Close
            </Button>
            <Button
              onClick={() => {
                setAbuseModal({ open: false, message: "" });
                navigate("/support");
              }}
            >
              Contact support
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
