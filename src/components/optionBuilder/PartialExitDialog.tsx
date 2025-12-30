import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface PartialExitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (lotsToExit: number, exitPrice: number) => void;
  position: {
    strike: number;
    optType: string;
    action: string;
    lots: number;
    currentPrice: number;
    expiry: string;
  } | null;
}

const PartialExitDialog = ({ isOpen, onClose, onConfirm, position }: PartialExitDialogProps) => {
  const [lotsToExit, setLotsToExit] = useState(1);
  const [exitPrice, setExitPrice] = useState(0);

  // Reset values when position changes - using useEffect properly
  useEffect(() => {
    if (position && isOpen) {
      setLotsToExit(position.lots);
      setExitPrice(position.currentPrice);
    }
  }, [position, isOpen]);

  if (!position) return null;

  const handleConfirm = () => {
    if (lotsToExit > 0 && lotsToExit <= position.lots) {
      onConfirm(lotsToExit, exitPrice);
      onClose();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const handleLotsSliderChange = (value: number[]) => {
    setLotsToExit(value[0]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Exit Position</DialogTitle>
          <DialogDescription>
            {position.action} {position.strike} {position.optType} - {position.expiry}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="lots">Lots to Exit</Label>
                <span className="text-sm font-medium">{lotsToExit} / {position.lots}</span>
              </div>
              <Slider
                id="lots-slider"
                min={1}
                max={position.lots}
                step={1}
                value={[lotsToExit]}
                onValueChange={handleLotsSliderChange}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 lot</span>
                <span>{position.lots} lots (all)</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exitPrice">Exit Price</Label>
              <Input
                id="exitPrice"
                type="number"
                min={0}
                step={0.05}
                value={exitPrice}
                onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">LTP: ₹{position.currentPrice.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={lotsToExit < 1 || lotsToExit > position.lots}>
            Exit {lotsToExit} Lot{lotsToExit > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PartialExitDialog;
