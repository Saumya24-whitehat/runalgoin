import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface CustomStrategyLeg {
  action: "Buy" | "Sell";
  lots: number;
  optType: "CE" | "PE";
  strikeMethod: "atm_offset" | "ltp" | "delta";
  strikeOffset: number; // strike diff from ATM
  targetLtp: number;
  targetDelta: number;
}

export interface CustomStrategyDefinition {
  name: string;
  category: "bullish" | "bearish" | "neutral" | "others";
  legs: CustomStrategyLeg[];
}

interface CreateCustomStrategyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateStrategy: (strategy: CustomStrategyDefinition) => void;
}

const DEFAULT_LEG: CustomStrategyLeg = {
  action: "Buy",
  lots: 1,
  optType: "CE",
  strikeMethod: "atm_offset",
  strikeOffset: 0,
  targetLtp: 100,
  targetDelta: 0.5,
};

const categoryConfig = {
  bullish: { icon: TrendingUp, label: "Bullish", color: "text-green-500" },
  bearish: { icon: TrendingDown, label: "Bearish", color: "text-red-500" },
  neutral: { icon: Minus, label: "Neutral", color: "text-yellow-500" },
  others: { icon: MoreHorizontal, label: "Others", color: "text-blue-500" },
};

const CreateCustomStrategyModal = ({ open, onOpenChange, onCreateStrategy }: CreateCustomStrategyModalProps) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"bullish" | "bearish" | "neutral" | "others">("bullish");
  const [legs, setLegs] = useState<CustomStrategyLeg[]>([{ ...DEFAULT_LEG }]);

  const addLeg = () => {
    setLegs((prev) => [...prev, { ...DEFAULT_LEG }]);
  };

  const removeLeg = (index: number) => {
    setLegs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLeg = (index: number, updates: Partial<CustomStrategyLeg>) => {
    setLegs((prev) => prev.map((leg, i) => (i === index ? { ...leg, ...updates } : leg)));
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    if (legs.length === 0) return;
    onCreateStrategy({ name: name.trim(), category, legs });
    // Reset
    setName("");
    setCategory("bullish");
    setLegs([{ ...DEFAULT_LEG }]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Strategy</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Strategy Name */}
          <div className="space-y-1.5">
            <Label>Strategy Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Bull Spread" />
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Strategy Type</Label>
            <RadioGroup
              value={category}
              onValueChange={(v) => setCategory(v as typeof category)}
              className="flex gap-3 flex-wrap"
            >
              {(Object.entries(categoryConfig) as [keyof typeof categoryConfig, (typeof categoryConfig)[keyof typeof categoryConfig]][]).map(
                ([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                        category === key ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <RadioGroupItem value={key} className="sr-only" />
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className="text-sm font-medium">{config.label}</span>
                    </label>
                  );
                }
              )}
            </RadioGroup>
          </div>

          {/* Position Legs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Positions</Label>
              <Button variant="outline" size="sm" onClick={addLeg}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Leg
              </Button>
            </div>

            {legs.map((leg, index) => (
              <Card key={index}>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Leg {index + 1}</span>
                    {legs.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeLeg(index)} className="h-6 w-6 p-0">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {/* Row 1: Action, Lots, Option Type */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Action</Label>
                      <Select value={leg.action} onValueChange={(v) => updateLeg(index, { action: v as "Buy" | "Sell" })}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Buy">Buy</SelectItem>
                          <SelectItem value="Sell">Sell</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Lots</Label>
                      <Input
                        type="number"
                        min={1}
                        value={leg.lots}
                        onChange={(e) => updateLeg(index, { lots: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={leg.optType} onValueChange={(v) => updateLeg(index, { optType: v as "CE" | "PE" })}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CE">CE (Call)</SelectItem>
                          <SelectItem value="PE">PE (Put)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 2: Strike Selection Method + Value */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Strike By</Label>
                      <Select
                        value={leg.strikeMethod}
                        onValueChange={(v) => updateLeg(index, { strikeMethod: v as CustomStrategyLeg["strikeMethod"] })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="atm_offset">ATM Offset (Strike Diff)</SelectItem>
                          <SelectItem value="ltp">Closest to LTP</SelectItem>
                          <SelectItem value="delta">Closest to Delta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      {leg.strikeMethod === "atm_offset" && (
                        <>
                          <Label className="text-xs">Offset (× strike diff)</Label>
                          <Input
                            type="number"
                            value={leg.strikeOffset}
                            onChange={(e) => updateLeg(index, { strikeOffset: parseInt(e.target.value) || 0 })}
                            className="h-8 text-xs"
                            placeholder="e.g. -2, 0, 4"
                          />
                        </>
                      )}
                      {leg.strikeMethod === "ltp" && (
                        <>
                          <Label className="text-xs">Target LTP (₹)</Label>
                          <Input
                            type="number"
                            value={leg.targetLtp}
                            onChange={(e) => updateLeg(index, { targetLtp: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs"
                            placeholder="e.g. 100"
                          />
                        </>
                      )}
                      {leg.strikeMethod === "delta" && (
                        <>
                          <Label className="text-xs">Target Delta</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min={-1}
                            max={1}
                            value={leg.targetDelta}
                            onChange={(e) => updateLeg(index, { targetDelta: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs"
                            placeholder="e.g. 0.3"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Create Button */}
          <Button onClick={handleCreate} disabled={!name.trim() || legs.length === 0} className="w-full">
            Create Strategy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCustomStrategyModal;
