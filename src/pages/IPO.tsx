import { PageInfoModal } from "@/components/PageInfoModal";
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
          <PageInfoModal
            title="IPO Timetable"
            subtitle="Indian primary market calendar"
            overview="Complete calendar of Indian primary market activity — upcoming, ongoing, and recently listed IPOs with subscription levels, price bands, and listing performance."
            legend={[
              { label: "Upcoming", text: "Announced open date — plan applications in advance", color: "#8b5cf6" },
              { label: "Open", text: "Currently accepting bids — subscription window active", color: "#10b981" },
              { label: "Closed / Listed", text: "Bidding done or listed — review GMP & listing gains", color: "#3b82f6" },
              { label: "Price Band", text: "Range within which retail must bid; final price set inside band", color: "#f59e0b" },
            ]}
            sections={[
              {
                heading: "Subscription Buckets",
                body: "QIB (institutions), NII (HNIs) and Retail bid separately. Heavy QIB oversubscription is the strongest predictor of a positive listing.",
              },
            ]}
            howToUse="Check subscription levels across QIB / NII / Retail before applying. Track listing performance to calibrate future application decisions."
            tips={[
              "QIB > 10x subscribed = strong institutional conviction, historically better listings.",
              "Retail-only oversubscription with weak QIB is often a red flag.",
              "GMP (grey-market premium) is indicative, not guaranteed — verify with subscription data.",
            ]}
          />
        </div>
      </div>

      <iframe src="https://ioptimetble.lovable.app/" className="flex-1 w-full border-0" title="IPO Timetable" />
    </div>
  );
};

export default IPO;
