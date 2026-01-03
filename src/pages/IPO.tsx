import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
const IPO = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TickerRibbon />
      <Navbar />
      <div className="p-4 border-b border-border flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="text-lg font-semibold">IPO Timetable</h1>
      </div>

      <iframe src="https://ioptimetble.lovable.app/" className="flex-1 w-full border-0" title="IPO Timetable" />
    </div>
  );
};

export default IPO;
