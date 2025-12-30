import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Position } from "@/services/optionBuilderApi";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export interface TriggerCondition {
  trigger: "profitPercent" | "profitAmount" | "lossPercent" | "lossAmount" | "priceLevel";
  value: number;
}

export interface ExitAction {
  type: "exitAll" | "exitPartial" | "exitAndReenter" | "sizeUp";
  lotsToExit?: number;
  strikeDiff?: number;
  additionalLots?: number;
}

export interface AdjustmentRule {
  id: string;
  mainPositionIndex: number;
  linkedPositionIndices: number[];
  triggers: TriggerCondition[];
  exitAction: ExitAction;
  isActive: boolean;
  applyToNewPositions: boolean;
}

interface AdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positions: Position[];
  adjustmentRules: AdjustmentRule[];
  onSaveRules: (rules: AdjustmentRule[]) => void;
}

const AdjustmentModal = ({
  open,
  onOpenChange,
  positions,
  adjustmentRules,
  onSaveRules,
}: AdjustmentModalProps) => {
  const [selectedMainIndex, setSelectedMainIndex] = useState<number | null>(null);
  const [linkedIndices, setLinkedIndices] = useState<number[]>([]);
  const [groups, setGroups] = useState<AdjustmentRule[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setGroups([...adjustmentRules]);
      setSelectedMainIndex(null);
      setLinkedIndices([]);
    }
  }, [open, adjustmentRules]);

  const activePositions = positions.filter((p) => p.exitPrice === undefined);

  const handleSelectMainPosition = (index: number) => {
    setSelectedMainIndex(index);
    // Reset linked positions when main changes
    setLinkedIndices([]);
  };

  const handleToggleLinkedPosition = (index: number) => {
    setLinkedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleCreateGroup = () => {
    if (selectedMainIndex === null) {
      toast.error("Please select a main position first");
      return;
    }

    const newGroup: AdjustmentRule = {
      id: `group_${Date.now()}`,
      mainPositionIndex: selectedMainIndex,
      linkedPositionIndices: linkedIndices,
      triggers: [{ trigger: "profitPercent", value: 50 }],
      exitAction: { type: "exitAll" },
      isActive: true,
      applyToNewPositions: true,
    };

    setGroups((prev) => [...prev, newGroup]);
    setSelectedMainIndex(null);
    setLinkedIndices([]);
    toast.success("Adjustment group created");
  };

  const handleRemoveGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleAddTrigger = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, triggers: [...g.triggers, { trigger: "profitPercent", value: 50 }] }
          : g
      )
    );
  };

  const handleRemoveTrigger = (groupId: string, triggerIndex: number) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, triggers: g.triggers.filter((_, i) => i !== triggerIndex) }
          : g
      )
    );
  };

  const handleUpdateTrigger = (
    groupId: string,
    triggerIndex: number,
    field: "trigger" | "value",
    value: string | number
  ) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              triggers: g.triggers.map((t, i) =>
                i === triggerIndex ? { ...t, [field]: value } : t
              ),
            }
          : g
      )
    );
  };

  const handleUpdateExitAction = (groupId: string, actionType: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              exitAction: {
                type: actionType as ExitAction["type"],
                lotsToExit: 1,
                strikeDiff: 0,
                additionalLots: 1,
              },
            }
          : g
      )
    );
  };

  const handleUpdateExitActionParam = (groupId: string, param: string, value: number) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, exitAction: { ...g.exitAction, [param]: value } }
          : g
      )
    );
  };

  const handleConfirm = () => {
    if (groups.length === 0) {
      toast.error("Please create at least one adjustment group");
      return;
    }
    onSaveRules(groups);
    onOpenChange(false);
    toast.success(`${groups.length} adjustment rule(s) configured`);
  };

  const getPositionLabel = (index: number) => {
    const pos = positions[index];
    if (!pos) return "";
    return `${pos.action} ${pos.lots}L @ ${pos.strike}${pos.optType}`;
  };

  const getPositionPnL = (index: number) => {
    const pos = positions[index];
    if (!pos) return { amount: 0, percent: 0 };
    const amount =
      (pos.currentPrice - pos.entryPrice) *
      pos.lots *
      pos.lotSize *
      (pos.action === "Buy" ? 1 : -1);
    const percent =
      ((pos.currentPrice - pos.entryPrice) * (pos.action === "Buy" ? 1 : -1) / pos.entryPrice) *
      100;
    return { amount, percent };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Position Adjustment</DialogTitle>
          <DialogDescription>Configure automatic adjustments for your positions based on triggers</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main Position Selection */}
          <div className="border border-primary/50 rounded-lg p-4 bg-card">
            <h4 className="text-primary font-semibold mb-2 text-center">
              Select Main Position (Trigger Position)
            </h4>
            <p className="text-xs text-muted-foreground text-center mb-4">
              This position's P&L will be monitored for adjustment triggers
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {positions.map((pos, index) => {
                if (pos.exitPrice !== undefined) return null;
                const pnl = getPositionPnL(index);
                const isSelected = selectedMainIndex === index;

                return (
                  <div
                    key={index}
                    onClick={() => handleSelectMainPosition(index)}
                    className={`border-2 p-3 rounded cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => handleSelectMainPosition(index)}
                        className="accent-primary"
                      />
                      <span className="font-semibold text-sm">
                        {pos.action} {pos.strike}{pos.optType}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Entry:</span>
                        <span>₹{pos.entryPrice.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current:</span>
                        <span>₹{pos.currentPrice.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lots:</span>
                        <span>{pos.lots}</span>
                      </div>
                    </div>
                    <div
                      className={`mt-2 p-1 rounded text-center text-xs font-semibold ${
                        pnl.percent >= 0
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {pnl.percent >= 0 ? "+" : ""}{pnl.percent.toFixed(2)}% (₹{pnl.amount.toFixed(0)})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Linked Positions Selection */}
          {selectedMainIndex !== null && (
            <div className="border border-border rounded-lg p-4 bg-card">
              <h4 className="text-foreground font-semibold mb-2 text-center">
                Select Linked Positions (Optional)
              </h4>
              <p className="text-xs text-muted-foreground text-center mb-4">
                These positions will exit/adjust together with the main position
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                {positions.map((pos, index) => {
                  if (pos.exitPrice !== undefined || index === selectedMainIndex) return null;
                  const pnl = getPositionPnL(index);
                  const isLinked = linkedIndices.includes(index);

                  return (
                    <div
                      key={index}
                      onClick={() => handleToggleLinkedPosition(index)}
                      className={`border p-3 rounded cursor-pointer transition-all ${
                        isLinked
                          ? "border-green-500 bg-green-500/10"
                          : "border-border hover:border-green-500/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox checked={isLinked} className="accent-green-500" />
                        <span className="font-semibold text-sm">
                          {pos.action} {pos.strike}{pos.optType}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Entry:</span>
                          <span>₹{pos.entryPrice.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lots:</span>
                          <span>{pos.lots}</span>
                        </div>
                      </div>
                      <div
                        className={`mt-2 p-1 rounded text-center text-xs font-semibold ${
                          pnl.percent >= 0
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {pnl.percent >= 0 ? "+" : ""}{pnl.percent.toFixed(2)}%
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center">
                <Button onClick={handleCreateGroup} className="bg-green-600 hover:bg-green-700">
                  Create Group Adjustment →
                </Button>
              </div>
            </div>
          )}

          {/* Adjustment Groups */}
          {groups.length > 0 && (
            <div className="border-t border-dashed border-border pt-4">
              <h4 className="text-foreground font-semibold mb-4">Adjustment Groups</h4>

              <div className="space-y-4">
                {groups.map((group) => {
                  const mainPos = positions[group.mainPositionIndex];
                  if (!mainPos) return null;

                  return (
                    <div
                      key={group.id}
                      className={`border-2 p-4 rounded-lg ${
                        group.linkedPositionIndices.length > 0
                          ? "border-primary"
                          : "border-green-500"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span
                            className={`font-semibold ${
                              group.linkedPositionIndices.length > 0
                                ? "text-primary"
                                : "text-green-500"
                            }`}
                          >
                            {group.linkedPositionIndices.length > 0 ? "Group" : "Single Position"}
                          </span>
                          <div className="text-sm text-muted-foreground mt-1">
                            <strong>Position:</strong> {getPositionLabel(group.mainPositionIndex)}
                          </div>
                          {group.linkedPositionIndices.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              <strong>Linked:</strong>{" "}
                              {group.linkedPositionIndices.map((i) => getPositionLabel(i)).join(" + ")}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveGroup(group.id)}
                        >
                          Remove
                        </Button>
                      </div>

                      {/* Trigger Conditions */}
                      <div className="bg-muted/50 p-3 rounded mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-semibold">
                            Trigger Conditions (ANY match will trigger):
                          </label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddTrigger(group.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Trigger
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {group.triggers.map((trigger, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Select
                                value={trigger.trigger}
                                onValueChange={(v) =>
                                  handleUpdateTrigger(group.id, idx, "trigger", v)
                                }
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="profitPercent">Profit %</SelectItem>
                                  <SelectItem value="profitAmount">Profit Amount ₹</SelectItem>
                                  <SelectItem value="lossPercent">Loss %</SelectItem>
                                  <SelectItem value="lossAmount">Loss Amount ₹</SelectItem>
                                  <SelectItem value="priceLevel">Price Level ₹</SelectItem>
                                </SelectContent>
                              </Select>

                              <span className="text-muted-foreground">≥</span>

                              <Input
                                type="number"
                                value={trigger.value}
                                onChange={(e) =>
                                  handleUpdateTrigger(
                                    group.id,
                                    idx,
                                    "value",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-24"
                              />

                              {group.triggers.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveTrigger(group.id, idx)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Exit Action */}
                      <div className="bg-muted/50 p-3 rounded">
                        <label className="text-sm font-semibold mb-2 block">Exit Action:</label>

                        <div className="flex items-center gap-4">
                          <Select
                            value={group.exitAction.type}
                            onValueChange={(v) => handleUpdateExitAction(group.id, v)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="exitAll">Exit All Positions</SelectItem>
                              <SelectItem value="exitPartial">Exit Partial Lots</SelectItem>
                              <SelectItem value="exitAndReenter">Exit & Reenter at Strike Diff</SelectItem>
                              <SelectItem value="sizeUp">Size Up</SelectItem>
                            </SelectContent>
                          </Select>

                          {group.exitAction.type === "exitPartial" && (
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-muted-foreground">Lots:</label>
                              <Input
                                type="number"
                                min={1}
                                value={group.exitAction.lotsToExit || 1}
                                onChange={(e) =>
                                  handleUpdateExitActionParam(
                                    group.id,
                                    "lotsToExit",
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-20"
                              />
                            </div>
                          )}

                          {group.exitAction.type === "exitAndReenter" && (
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-muted-foreground">Strike Diff:</label>
                              <Input
                                type="number"
                                value={group.exitAction.strikeDiff || 0}
                                onChange={(e) =>
                                  handleUpdateExitActionParam(
                                    group.id,
                                    "strikeDiff",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-24"
                              />
                            </div>
                          )}

                          {group.exitAction.type === "sizeUp" && (
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-muted-foreground">Add Lots:</label>
                              <Input
                                type="number"
                                min={1}
                                value={group.exitAction.additionalLots || 1}
                                onChange={(e) =>
                                  handleUpdateExitActionParam(
                                    group.id,
                                    "additionalLots",
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-20"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Apply Adjustments</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdjustmentModal;
