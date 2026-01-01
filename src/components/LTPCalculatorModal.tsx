import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Copy, Check, Clock, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export interface KundaliSpotData {
  resistance: number;
  resistanceStrike2: number;
  support: number;
  supportStrike2: number;
  resistanceStatus?: string;
  supportStatus?: string;
  staticResistance?: number;
  staticSupport?: number;
  avgResistance?: number;
  avgSupport?: number;
}

interface LTPCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strikePrice: number;
  spotPrice: number;
  futurePrice?: number;
  callLTP: number;
  putLTP: number;
  callIV: number;
  putIV: number;
  callDelta?: number;
  putDelta?: number;
  atr?: number;
  expiry: string;
  kundaliData?: KundaliSpotData;
}

type TabType = "spot" | "future" | "ltp";

const LTPCalculatorModal = ({
  open,
  onOpenChange,
  strikePrice,
  spotPrice,
  futurePrice = 0,
  callLTP,
  putLTP,
  callIV,
  putIV,
  callDelta = 0.5,
  putDelta = -0.5,
  atr = 50,
  kundaliData,
}: LTPCalculatorModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("spot");
  const [staticTime, setStaticTime] = useState("09:30");
  const [targetPrice, setTargetPrice] = useState("");
  const [targetMode, setTargetMode] = useState<"spot" | "ce" | "pe">("ce");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Use Kundali data for resistance/support if available
  const resistanceData = {
    staticLevel:
      kundaliData?.staticResistance?.toFixed(2) ||
      kundaliData?.resistance?.toFixed(2) ||
      (spotPrice * 1.002).toFixed(2),
    average:
      kundaliData?.avgResistance?.toFixed(2) ||
      kundaliData?.resistanceStrike2?.toFixed(2) ||
      (spotPrice * 1.003).toFixed(2),
    current: kundaliData?.resistance?.toFixed(2) || (spotPrice * 1.001).toFixed(2),
    status: kundaliData?.resistanceStatus || "Breaker Inactive",
  };

  const supportData = {
    staticLevel:
      kundaliData?.staticSupport?.toFixed(2) || kundaliData?.support?.toFixed(2) || (spotPrice * 0.998).toFixed(2),
    average:
      kundaliData?.avgSupport?.toFixed(2) || kundaliData?.supportStrike2?.toFixed(2) || (spotPrice * 0.997).toFixed(2),
    current: kundaliData?.support?.toFixed(2) || (spotPrice * 0.999).toFixed(2),
    status: kundaliData?.supportStatus || "Breaker Active",
  };

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedField(null), 1500);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const CopyButton = ({ text, fieldId }: { text: string; fieldId: string }) => (
    <button onClick={() => copyToClipboard(text, fieldId)} className="p-1 hover:bg-white/10 rounded transition-colors">
      {copiedField === fieldId ? (
        <Check className="h-4 w-4 text-green-400" />
      ) : (
        <Copy className="h-4 w-4 text-slate-400 hover:text-white" />
      )}
    </button>
  );

  const adjustTime = (increment: boolean) => {
    const [hours, minutes] = staticTime.split(":").map(Number);
    let totalMinutes = hours * 60 + minutes;
    totalMinutes += increment ? 15 : -15;
    if (totalMinutes < 555) totalMinutes = 555; // 9:15 AM
    if (totalMinutes > 930) totalMinutes = 930; // 3:30 PM
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    setStaticTime(`${newHours.toString().padStart(2, "0")}:${newMins.toString().padStart(2, "0")}`);
  };

  const formatTimeDisplay = (time: string) => {
    const [hours] = time.split(":").map(Number);
    return hours >= 12 ? "PM" : "AM";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[960px] w-full p-0 bg-slate-800 border-slate-700 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-5">
          {/* Tab Navigation */}
          <div className="flex gap-0 mb-5 bg-amber-50 rounded-lg p-2 overflow-hidden">
            {[{ id: "ltp", label: "LTP Calculator" }].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex-1 py-3 px-5 text-lg font-semibold rounded-md transition-all ${
                  activeTab === tab.id ? "bg-orange-500 text-white" : "text-slate-700 hover:bg-orange-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Time Settings */}
          <div className="flex items-center gap-3 p-4 bg-slate-700 rounded-md mb-5">
            <span className="text-slate-300">Set Static Level Time:</span>
            <Input
              type="time"
              value={staticTime}
              onChange={(e) => setStaticTime(e.target.value)}
              className="w-28 bg-slate-800 border-slate-600 text-white"
            />
            <span className="text-white font-medium">{formatTimeDisplay(staticTime)}</span>
            <button className="p-1 text-slate-400 hover:text-white">
              <Clock className="h-5 w-5" />
            </button>
            <button className="p-1 text-green-400 hover:text-green-300">
              <Check className="h-5 w-5" />
            </button>
            <button className="p-1 text-red-400 hover:text-red-300">
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col ml-2">
              <button onClick={() => adjustTime(true)} className="text-slate-400 hover:text-white">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button onClick={() => adjustTime(false)} className="text-slate-400 hover:text-white">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* SPOT Tab Content */}
          {activeTab === "spot" && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="flex items-center justify-between bg-slate-700 border border-slate-600 rounded-md p-4">
                  <span className="text-slate-100">Reversal For : {strikePrice.toLocaleString()}</span>
                  <CopyButton text={strikePrice.toString()} fieldId="reversal-spot" />
                </div>
                <div className="flex items-center justify-between bg-slate-700 border border-slate-600 rounded-md p-4">
                  <span className="text-slate-100">Spot Price : {spotPrice.toLocaleString()}</span>
                  <CopyButton text={spotPrice.toString()} fieldId="spot-price" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Resistance Column */}
                <div className="rounded-md overflow-hidden">
                  <div className="bg-red-700 text-white text-center py-4 text-lg font-semibold">Resistance</div>
                  <div className="bg-black/30 text-slate-100 text-center py-3 border-b border-white/10">
                    Status : {resistanceData.status}
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>9:30 AM : {resistanceData.staticLevel}</span>
                    <CopyButton text={resistanceData.staticLevel} fieldId="res-static" />
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>Average : {resistanceData.average}</span>
                    <CopyButton text={resistanceData.average} fieldId="res-avg" />
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4">
                    <span>Current : {resistanceData.current}</span>
                    <CopyButton text={resistanceData.current} fieldId="res-current" />
                  </div>
                </div>

                {/* Support Column */}
                <div className="rounded-md overflow-hidden">
                  <div className="bg-green-700 text-white text-center py-4 text-lg font-semibold">Support</div>
                  <div className="bg-black/30 text-slate-100 text-center py-3 border-b border-white/10">
                    Status : {supportData.status}
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>9:30 AM : {supportData.staticLevel}</span>
                    <CopyButton text={supportData.staticLevel} fieldId="sup-static" />
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>Average : {supportData.average}</span>
                    <CopyButton text={supportData.average} fieldId="sup-avg" />
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4">
                    <span>Current : {supportData.current}</span>
                    <CopyButton text={supportData.current} fieldId="sup-current" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* FUTURE Tab Content */}
          {activeTab === "future" && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="flex items-center justify-between bg-slate-700 border border-slate-600 rounded-md p-4">
                  <span className="text-slate-100">Reversal For : {strikePrice.toLocaleString()}</span>
                  <CopyButton text={strikePrice.toString()} fieldId="reversal-future" />
                </div>
                <div className="flex items-center justify-between bg-slate-700 border border-slate-600 rounded-md p-4">
                  <span className="text-slate-100">
                    Future 1 Price : {(futurePrice || spotPrice * 1.0005).toFixed(2)}
                  </span>
                  <CopyButton text={(futurePrice || spotPrice * 1.0005).toFixed(2)} fieldId="future-price" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Resistance Column */}
                <div className="rounded-md overflow-hidden">
                  <div className="bg-red-700 text-white text-center py-4 text-lg font-semibold">Resistance</div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>9:30 AM : {(parseFloat(resistanceData.staticLevel) + 6).toFixed(2)}</span>
                    <CopyButton text={(parseFloat(resistanceData.staticLevel) + 6).toFixed(2)} fieldId="fres-static" />
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>Average : {(parseFloat(resistanceData.average) + 14).toFixed(2)}</span>
                    <CopyButton text={(parseFloat(resistanceData.average) + 14).toFixed(2)} fieldId="fres-avg" />
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4">
                    <span>Current : {(parseFloat(resistanceData.current) + 14).toFixed(2)}</span>
                    <CopyButton text={(parseFloat(resistanceData.current) + 14).toFixed(2)} fieldId="fres-current" />
                  </div>
                </div>

                {/* Support Column */}
                <div className="rounded-md overflow-hidden">
                  <div className="bg-green-700 text-white text-center py-4 text-lg font-semibold">Support</div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>9:30 AM : {(parseFloat(supportData.staticLevel) + 6).toFixed(2)}</span>
                    <CopyButton text={(parseFloat(supportData.staticLevel) + 6).toFixed(2)} fieldId="fsup-static" />
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>Average : {(parseFloat(supportData.average) + 14).toFixed(2)}</span>
                    <CopyButton text={(parseFloat(supportData.average) + 14).toFixed(2)} fieldId="fsup-avg" />
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4">
                    <span>Current : {(parseFloat(supportData.current) + 14).toFixed(2)}</span>
                    <CopyButton text={(parseFloat(supportData.current) + 14).toFixed(2)} fieldId="fsup-current" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* LTP Calculator Tab Content */}
          {activeTab === "ltp" && (
            <>
              <div className="flex justify-center mb-5">
                <div className="bg-slate-700 border border-slate-600 rounded-md p-4 px-8">
                  <span className="text-slate-100">Option : {strikePrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="flex items-center justify-between bg-slate-700 border border-slate-600 rounded-md p-4">
                  <span className="text-slate-100">Spot Price : {spotPrice.toLocaleString()}</span>
                  <CopyButton text={spotPrice.toString()} fieldId="ltp-spot" />
                </div>
                <div className="flex items-center justify-between bg-slate-700 border border-slate-600 rounded-md p-4">
                  <span className="text-slate-100">
                    Future 1 Price : {(futurePrice || spotPrice * 1.0005).toFixed(2)}
                  </span>
                  <CopyButton text={(futurePrice || spotPrice * 1.0005).toFixed(2)} fieldId="ltp-future" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* CALL Column */}
                <div className="rounded-md overflow-hidden">
                  <div className="bg-red-700 text-white text-center py-4 text-lg font-semibold">CALL</div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>IV : {callIV?.toFixed(2) || "0.01"}</span>
                    <CopyButton text={callIV?.toFixed(2) || "0.01"} fieldId="call-iv" />
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>Ltp : {callLTP?.toFixed(2) || "0"}</span>
                    <CopyButton text={callLTP?.toFixed(2) || "0"} fieldId="call-ltp" />
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>Delta : {callDelta?.toFixed(4) || "0"}</span>
                    <CopyButton text={callDelta?.toFixed(4) || "0"} fieldId="call-delta" />
                  </div>
                  <div className="flex items-center justify-between bg-emerald-900/50 text-emerald-300 py-3 px-4 border-b border-white/10">
                    <span>SL Buy : {(callLTP - Math.abs(atr * callDelta)).toFixed(2)}</span>
                    <CopyButton text={(callLTP - Math.abs(atr * callDelta)).toFixed(2)} fieldId="call-sl-buy" />
                  </div>
                  <div className="flex items-center justify-between bg-red-900/50 text-red-300 py-3 px-4">
                    <span>SL Sell : {(callLTP + Math.abs(atr * callDelta)).toFixed(2)}</span>
                    <CopyButton text={(callLTP + Math.abs(atr * callDelta)).toFixed(2)} fieldId="call-sl-sell" />
                  </div>
                </div>

                {/* PUT Column */}
                <div className="rounded-md overflow-hidden">
                  <div className="bg-green-700 text-white text-center py-4 text-lg font-semibold">PUT</div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>IV : {putIV?.toFixed(2) || "0"}</span>
                    <CopyButton text={putIV?.toFixed(2) || "0"} fieldId="put-iv" />
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>Ltp : {putLTP?.toFixed(2) || "0"}</span>
                    <CopyButton text={putLTP?.toFixed(2) || "0"} fieldId="put-ltp" />
                  </div>
                  <div className="flex items-center justify-between bg-black/30 text-slate-100 py-3 px-4 border-b border-white/10">
                    <span>Delta : {putDelta?.toFixed(4) || "0"}</span>
                    <CopyButton text={putDelta?.toFixed(4) || "0"} fieldId="put-delta" />
                  </div>
                  <div className="flex items-center justify-between bg-emerald-900/50 text-emerald-300 py-3 px-4 border-b border-white/10">
                    <span>SL Buy : {(putLTP - Math.abs(atr * putDelta)).toFixed(2)}</span>
                    <CopyButton text={(putLTP - Math.abs(atr * putDelta)).toFixed(2)} fieldId="put-sl-buy" />
                  </div>
                  <div className="flex items-center justify-between bg-red-900/50 text-red-300 py-3 px-4">
                    <span>SL Sell : {(putLTP + Math.abs(atr * putDelta)).toFixed(2)}</span>
                    <CopyButton text={(putLTP + Math.abs(atr * putDelta)).toFixed(2)} fieldId="put-sl-sell" />
                  </div>
                </div>
              </div>

              {/* Target Price Input */}
              <div className="mt-5 flex gap-4 items-center">
                <Input
                  type="text"
                  placeholder="Enter Target Price"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
                <div className="flex gap-2">
                  {[
                    { id: "spot", label: "Spot" },
                    { id: "ce", label: "CE" },
                    { id: "pe", label: "PE" },
                  ].map((mode) => (
                    <Button
                      key={mode.id}
                      variant={targetMode === mode.id ? "default" : "outline"}
                      onClick={() => setTargetMode(mode.id as "spot" | "ce" | "pe")}
                      className={
                        targetMode === mode.id
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600"
                      }
                    >
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LTPCalculatorModal;
