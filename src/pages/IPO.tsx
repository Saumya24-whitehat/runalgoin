import { PageInfoButton } from "@/components/PageInfoButton";
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
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">IPO Timetable</h1>
          <PageInfoButton
            title="IPO Timetable"
            description="Calendar of Indian primary market activity — upcoming, ongoing, and recently listed IPOs with all subscription details."
            details={[
              { label: "Upcoming", text: "IPOs with an announced open date — plan your applications in advance" },
              { label: "Open", text: "Currently accepting bids from investors — subscription window active", color: "#10b981" },
              { label: "Closed / Listed", text: "Bidding done or already listed — review GMP, subscription and listing performance", color: "#3b82f6" },
              { label: "Price Band", text: "Range within which retail investors must bid; final issue price is set within this band" },
              { label: "How to use", text: "Check subscription levels across QIB / NII / Retail to gauge institutional demand before deciding to apply or track listing." },
            ]}
          />
        </div>
      </div>

      <iframe src="https://ioptimetble.lovable.app/" className="flex-1 w-full border-0" title="IPO Timetable" />
    </div>
  );
};

export default IPO;
