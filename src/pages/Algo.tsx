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
            <PageInfoButton title="Algorithmic Trading" description="Launches the RunAlgo automated trading platform where you can deploy and monitor algorithmic strategies." />
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
