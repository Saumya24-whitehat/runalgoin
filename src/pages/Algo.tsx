import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";

const Algo = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TickerRibbon />
      <Navbar />
      <div className="flex-1">
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
