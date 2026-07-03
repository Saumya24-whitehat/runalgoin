import { PageInfoButton } from "@/components/PageInfoButton";
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
            <PageInfoButton
              title="Algorithmic Trading"
              description="Launches the RunAlgo automated trading platform where you can deploy and monitor rule-based strategies against your live broker account."
              details={[
                { label: "Strategy Deployment", text: "Push predefined or custom strategies to run automatically during market hours", color: "#3b82f6" },
                { label: "Broker Integration", text: "Connects to supported brokers via API for order placement and position tracking" },
                { label: "Monitoring", text: "Live P&L, order status, and strategy health from a single dashboard", color: "#10b981" },
                { label: "How to use", text: "Test strategies in the Option Simulator first, then deploy in Algo with strict risk limits (max loss, position size) before scaling." },
              ]}
            />
          </div>
        </div>
        <iframe
          src="http://runalgo.in"
          className="w-full h-[calc(100vh-64px)] border-0"
          title="RunAlgo"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default Algo;
