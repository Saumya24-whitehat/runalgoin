import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Position } from "@/services/optionBuilderApi";
import { toast } from "sonner";
import { Plus, Trash2, BarChart3 } from "lucide-react";

export interface TriggerCondition {
  trigger: "profitPercent" | "profitAmount" | "lossPercent" | "lossAmount" | "priceLevel";
  value: number;
}

export interface ComparativeTrigger {
  comparePositionIndex: number;
  metric: "currentPrice" | "IV" | "delta" | "pnlAmount" | "pnlPercent";
  operator: "mainMinusCompare" | "compareMinusMain" | "ratio";
  condition: "greaterThan" | "lessThan";
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
  comparativeTriggers: ComparativeTrigger[];
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

  useEffect(() => {
    if (open) {
      setGroups([...adjustmentRules]);
      setSelectedMainIndex(null);
      setLinkedIndices([]);
    }
  }, [open, adjustmentRules]);

  const handleSelectMainPosition = (index: number) => {
    setSelectedMainIndex(index);
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
      comparativeTriggers: [],
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

  // Standard trigger handlers
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

  // Comparative trigger handlers
  const handleAddComparativeTrigger = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        // Default compare position: first active position that isn't the main
        const defaultCompare = positions.findIndex(
          (p, i) => i !== g.mainPositionIndex && p.exitPrice === undefined
        );
        return {
          ...g,
          comparativeTriggers: [
            ...g.comparativeTriggers,
            {
              comparePositionIndex: defaultCompare >= 0 ? defaultCompare : 0,
              metric: "currentPrice",
              operator: "mainMinusCompare",
              condition: "greaterThan",
              value: 50,
            },
          ],
        };
      })
    );
  };

  const handleRemoveComparativeTrigger = (groupId: string, idx: number) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, comparativeTriggers: g.comparativeTriggers.filter((_, i) => i !== idx) }
          : g
      )
    );
  };

  const handleUpdateComparativeTrigger = (
    groupId: string,
    idx: number,
    field: keyof ComparativeTrigger,
    value: string | number
  ) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              comparativeTriggers: g.comparativeTriggers.map((ct, i) =>
                i === idx ? { ...ct, [field]: field === "value" || field === "comparePositionIndex" ? Number(value) : value } : ct
              ),
            }
          : g
      )
    );
  };

  // Exit action handlers
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

  const getMetricValue = (pos: Position, metric: ComparativeTrigger["metric"]): number => {
    switch (metric) {
      case "currentPrice": return pos.currentPrice;
      case "IV": return pos.IV || 0;
      case "delta": return pos.delta || 0;
      case "pnlAmount":
        return (pos.currentPrice - pos.entryPrice) * pos.lots * pos.lotSize * (pos.action === "Buy" ? 1 : -1);
      case "pnlPercent":
        return ((pos.currentPrice - pos.entryPrice) * (pos.action === "Buy" ? 1 : -1) / pos.entryPrice) * 100;
      default: return 0;
    }
  };

  const metricLabels: Record<ComparativeTrigger["metric"], string> = {
    currentPrice: "Current Price",
    IV: "IV",
    delta: "Delta",
    pnlAmount: "P&L Amount",
    pnlPercent: "P&L %",
  };

  const operatorLabels: Record<ComparativeTrigger["operator"], string> = {
    mainMinusCompare: "Main - Compare",
    compareMinusMain: "Compare - Main",
    ratio: "Main / Compare",
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

                      {/* Standard Trigger Conditions */}
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

                      {/* Comparative Triggers */}
                      <ComparativeTriggersSection
                        group={group}
                        positions={positions}
                        getMetricValue={getMetricValue}
                        metricLabels={metricLabels}
                        operatorLabels={operatorLabels}
                        onAdd={handleAddComparativeTrigger}
                        onRemove={handleRemoveComparativeTrigger}
                        onUpdate={handleUpdateComparativeTrigger}
                        getPositionLabel={getPositionLabel}
                      />

                      {/* Exit Action */}
                      <div className="bg-muted/50 p-3 rounded">
                        <label className="text-sm font-semibold mb-2 block">Exit Action:</label>

                        <div className="flex items-center gap-4 flex-wrap">
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
                                value={group.exitAction.strikeDiff ?? 0}
                                onChange={(e) =>
                                  handleUpdateExitActionParam(
                                    group.id,
                                    "strikeDiff",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-24"
                              />
                              <span className="text-xs text-muted-foreground">
                                (e.g. +100 or -100)
                              </span>
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

// Extracted comparative triggers section
interface ComparativeTriggersSectionProps {
  group: AdjustmentRule;
  positions: Position[];
  getMetricValue: (pos: Position, metric: ComparativeTrigger["metric"]) => number;
  metricLabels: Record<ComparativeTrigger["metric"], string>;
  operatorLabels: Record<ComparativeTrigger["operator"], string>;
  onAdd: (groupId: string) => void;
  onRemove: (groupId: string, idx: number) => void;
  onUpdate: (groupId: string, idx: number, field: keyof ComparativeTrigger, value: string | number) => void;
  getPositionLabel: (index: number) => string;
}

const ComparativeTriggersSection = ({
  group,
  positions,
  getMetricValue,
  metricLabels,
  operatorLabels,
  onAdd,
  onRemove,
  onUpdate,
  getPositionLabel,
}: ComparativeTriggersSectionProps) => {
  const mainPos = positions[group.mainPositionIndex];

  return (
    <div className="bg-muted/50 p-3 rounded mb-4 border border-accent/30">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent-foreground" />
          <label className="text-sm font-semibold">Compare Metrics Between Positions</label>
        </div>
        <Button variant="outline" size="sm" onClick={() => onAdd(group.id)}>
          <Plus className="h-3 w-3 mr-1" /> Add Comparison
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Compare the main position with any other position
      </p>

      <div className="space-y-4">
        {group.comparativeTriggers.map((ct, idx) => {
          const comparePos = positions[ct.comparePositionIndex];
          const mainVal = mainPos ? getMetricValue(mainPos, ct.metric) : 0;
          const compareVal = comparePos ? getMetricValue(comparePos, ct.metric) : 0;

          let result = 0;
          if (ct.operator === "mainMinusCompare") result = mainVal - compareVal;
          else if (ct.operator === "compareMinusMain") result = compareVal - mainVal;
          else if (ct.operator === "ratio") result = compareVal !== 0 ? mainVal / compareVal : 0;

          const conditionMet =
            ct.condition === "greaterThan" ? result > ct.value : result < ct.value;

          return (
            <div key={idx} className="border border-border rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {/* Position to compare */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Position to Compare With:</label>
                  <Select
                    value={String(ct.comparePositionIndex)}
                    onValueChange={(v) => onUpdate(group.id, idx, "comparePositionIndex", v)}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((pos, pIdx) => {
                        if (pos.exitPrice !== undefined || pIdx === group.mainPositionIndex) return null;
                        return (
                          <SelectItem key={pIdx} value={String(pIdx)}>
                            {pos.action} {pos.lots}L @ {pos.strike}{pos.optType}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Metric */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Metric to Compare:</label>
                  <Select
                    value={ct.metric}
                    onValueChange={(v) => onUpdate(group.id, idx, "metric", v)}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="currentPrice">Current Price</SelectItem>
                      <SelectItem value="IV">IV</SelectItem>
                      <SelectItem value="delta">Delta</SelectItem>
                      <SelectItem value="pnlAmount">P&L Amount</SelectItem>
                      <SelectItem value="pnlPercent">P&L %</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Operator */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Operator:</label>
                  <Select
                    value={ct.operator}
                    onValueChange={(v) => onUpdate(group.id, idx, "operator", v)}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mainMinusCompare">Main - Compare</SelectItem>
                      <SelectItem value="compareMinusMain">Compare - Main</SelectItem>
                      <SelectItem value="ratio">Main / Compare</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Condition + Value */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Condition:</label>
                    <Select
                      value={ct.condition}
                      onValueChange={(v) => onUpdate(group.id, idx, "condition", v)}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="greaterThan">Greater than</SelectItem>
                        <SelectItem value="lessThan">Less than</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-muted-foreground mb-1 block">Value:</label>
                    <Input
                      type="number"
                      value={ct.value}
                      onChange={(e) => onUpdate(group.id, idx, "value", parseFloat(e.target.value) || 0)}
                      className="text-xs"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={() => onRemove(group.id, idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Live Comparison Preview */}
              {mainPos && comparePos && (
                <div className="border border-border/50 rounded p-3 bg-background/50">
                  <label className="text-xs text-muted-foreground mb-2 block">Live Comparison:</label>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs font-semibold text-primary">Main Position</div>
                      <div className="text-lg font-bold">{mainVal.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">
                        {ct.operator === "mainMinusCompare" ? "−" : ct.operator === "compareMinusMain" ? "−" : "÷"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-accent-foreground">Compare Position</div>
                      <div className="text-lg font-bold">{compareVal.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-8 mt-2 pt-2 border-t border-border/50">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Result</div>
                      <div className={`text-sm font-bold ${conditionMet ? "text-green-400" : "text-foreground"}`}>
                        {result.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Condition</div>
                      <div className={`text-sm font-bold ${conditionMet ? "text-green-400" : "text-red-400"}`}>
                        {ct.condition === "greaterThan" ? ">" : "<"} {ct.value}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdjustmentModal;
