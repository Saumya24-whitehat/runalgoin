import { PageInfoModal } from "@/components/PageInfoModal";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";

const Algo = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>
      <Navbar />
      <div className="flex-1">
        <div className="border-b bg-card px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Algorithmic Trading</h1>
            <PageInfoModal
              title="Algorithmic Trading"
              subtitle="Deploy rule-based strategies on your broker account"
              overview="Launches the OptionWorld automated trading platform where predefined or custom strategies run automatically against your live broker account with risk limits and monitoring."
              legend={[
                { label: "Strategy Deployment", text: "Push predefined or custom strategies to run during market hours", color: "#3b82f6" },
                { label: "Broker Integration", text: "Order placement & position tracking via broker API", color: "#8b5cf6" },
                { label: "Monitoring", text: "Live P&L, order status and strategy health in one dashboard", color: "#10b981" },
                { label: "Risk Controls", text: "Max loss, position size, per-trade limits — enforced automatically", color: "#ef4444" },
              ]}
              sections={[
                {
                  heading: "Deployment Discipline",
                  body: "Every strategy should survive Simulator backtests across 20+ historical sessions before live deployment. Deploy small, scale only after live edge is confirmed.",
                },
              ]}
              howToUse="Test in Option Simulator first → deploy in Algo with strict risk limits → monitor for a week → scale gradually once live edge is confirmed."
              tips={[
                "Start with 1 lot regardless of backtest confidence — live slippage always differs.",
                "Set daily loss caps at the account level, not just per-strategy.",
                "Kill switches beat perfect logic — always have a manual override ready.",
              ]}
            />
          </div>
        </div>
        <iframe
          src="http://runalgo.in"
          className="w-full h-[calc(100vh-64px)] border-0"
          title="OptionWorld"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default Algo;
