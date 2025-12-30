import { useState } from 'react';
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

  // Reset values when position changes
  useState(() => {
    if (position) {
      setLotsToExit(position.lots);
      setExitPrice(position.currentPrice);
    }
  });

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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lots">Lots to Exit</Label>
              <Input
                id="lots"
                type="number"
                min={1}
                max={position.lots}
                value={lotsToExit}
                onChange={(e) => setLotsToExit(Math.min(Math.max(1, parseInt(e.target.value) || 1), position.lots))}
              />
              <p className="text-xs text-muted-foreground">Max: {position.lots}</p>
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
