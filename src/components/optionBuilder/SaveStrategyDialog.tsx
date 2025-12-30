import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Position } from "@/services/optionBuilderApi";

interface SaveStrategyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, type: string) => void;
  positions: Position[];
  existingName?: string;
}

const STRATEGY_TYPES = [
  "Bullish",
  "Bearish",
  "Neutral",
  "Volatility",
  "Income",
  "Hedging",
  "Custom",
];

const SaveStrategyDialog = ({
  isOpen,
  onClose,
  onSave,
  positions,
  existingName = "",
}: SaveStrategyDialogProps) => {
  const [name, setName] = useState(existingName);
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Custom");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), description.trim(), type);
    onClose();
    // Reset form
    setName("");
    setDescription("");
    setType("Custom");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  // Generate a summary of positions
  const positionSummary = positions.filter((p) => p.enabled && !p.exitPrice);
  const buyCount = positionSummary.filter((p) => p.action === "Buy").length;
  const sellCount = positionSummary.filter((p) => p.action === "Sell").length;
  const ceCount = positionSummary.filter((p) => p.optType === "CE").length;
  const peCount = positionSummary.filter((p) => p.optType === "PE").length;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Save Strategy</DialogTitle>
          <DialogDescription>
            Save your current positions as a strategy
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Strategy Name</Label>
            <Input
              id="name"
              placeholder="My Iron Condor"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Strategy Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STRATEGY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of your strategy..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Position Summary */}
          <div className="p-3 bg-muted rounded-lg">
            <Label className="text-xs text-muted-foreground">Position Summary</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <div>
                <span className="text-emerald-500">{buyCount} Buy</span>
                {" / "}
                <span className="text-red-500">{sellCount} Sell</span>
              </div>
              <div>
                <span className="text-emerald-500">{ceCount} CE</span>
                {" / "}
                <span className="text-red-500">{peCount} PE</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save Strategy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveStrategyDialog;
