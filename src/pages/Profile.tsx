import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useAllSavedStrategies, SavedStrategy } from "@/hooks/useSavedStrategies";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  User,
  Crown,
  Shield,
  Calendar,
  Mail,
  Clock,
  BookmarkIcon,
  Trash2,
  ExternalLink,
  Loader2,
  TrendingUp,
  TrendingDown,
  Pencil,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Position, formatIndianNumber } from "@/services/optionBuilderApi";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading, isPro, isEnterprise, isAdmin } = useSubscription();
  const { strategies: allStrategies, loading: strategiesLoading, deleteStrategy, updateStrategy } = useAllSavedStrategies();
  const navigate = useNavigate();

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<SavedStrategy | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleDeleteStrategy = async (id: string) => {
    if (!confirm("Are you sure you want to delete this strategy?")) return;
    await deleteStrategy(id);
  };

  const handleEditStrategy = (strategy: SavedStrategy) => {
    setEditingStrategy(strategy);
    setEditName(strategy.name);
    setEditDescription(strategy.description);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingStrategy) return;
    await updateStrategy(editingStrategy.id, editName, editDescription);
    setEditDialogOpen(false);
    setEditingStrategy(null);
  };

  const handleLoadStrategy = (strategy: SavedStrategy) => {
    // Store strategy data in sessionStorage for the target page to load
    sessionStorage.setItem("loadStrategy", JSON.stringify(strategy));
    
    if (strategy.source === "builder") {
      navigate("/option-builder");
    } else {
      navigate("/option-simulator");
    }
  };

  const calculatePnL = (positions: Position[]): number => {
    return positions
      .filter((p) => p.enabled)
      .reduce((total, p) => {
        if (p.exitPrice !== undefined) {
          return (
            total +
            (p.exitPrice - p.entryPrice) *
              p.lots *
              p.lotSize *
              (p.action === "Buy" ? 1 : -1)
          );
        }
        return (
          total +
          (p.currentPrice - p.entryPrice) *
            p.lots *
            p.lotSize *
            (p.action === "Buy" ? 1 : -1)
        );
      }, 0);
  };

  const getPlanBadge = () => {
    if (isEnterprise) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-lg px-4 py-1">
          <Shield className="h-4 w-4 mr-2" />
          Enterprise
        </Badge>
      );
    }
    if (isPro) {
      return (
        <Badge className="bg-primary/20 text-primary border-primary/30 text-lg px-4 py-1">
          <Crown className="h-4 w-4 mr-2" />
          Pro
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-lg px-4 py-1">
        Free
      </Badge>
    );
  };

  const getDaysRemaining = () => {
    if (!subscription?.expires_at) return null;
    const expiry = new Date(subscription.expires_at);
    const days = differenceInDays(expiry, new Date());
    return days;
  };

  const daysRemaining = getDaysRemaining();

  if (authLoading || subLoading || strategiesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const builderStrategies = allStrategies.filter((s) => s.source === "builder");
  const simulatorStrategies = allStrategies.filter((s) => s.source === "simulator");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {user?.user_metadata?.name || "User"}
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </p>
                {isAdmin && (
                  <Badge variant="outline" className="mt-2 border-primary text-primary">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
            </div>
            {isAdmin && (
              <Button onClick={() => navigate("/admin")} variant="outline" className="gap-2">
                <Shield className="h-4 w-4" />
                Admin Panel
              </Button>
            )}
          </div>

          {/* Subscription Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Subscription</span>
                {getPlanBadge()}
              </CardTitle>
              <CardDescription>Your current plan and subscription details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Plan Status</p>
                  <Badge
                    variant={subscription?.status === "active" ? "default" : "destructive"}
                    className={subscription?.status === "active" ? "bg-success/20 text-success border-success/30" : ""}
                  >
                    {subscription?.status || "active"}
                  </Badge>
                </div>

                {subscription?.expires_at && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Expires On</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(subscription.expires_at), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}

                {daysRemaining !== null && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Days Remaining</p>
                    <p className={`font-bold text-2xl ${daysRemaining <= 7 ? "text-warning" : daysRemaining <= 0 ? "text-destructive" : "text-foreground"}`}>
                      {daysRemaining > 0 ? daysRemaining : "Expired"}
                    </p>
                  </div>
                )}
              </div>

              {!isPro && (
                <div className="pt-4 border-t">
                  <Button onClick={() => navigate("/plans")} className="gap-2">
                    <Crown className="h-4 w-4" />
                    Upgrade to Pro
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Strategies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookmarkIcon className="h-5 w-5 text-primary" />
                Saved Strategies
              </CardTitle>
              <CardDescription>
                Your saved option strategies from Option Builder and Simulator
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allStrategies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookmarkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No saved strategies yet</p>
                  <p className="text-sm mt-1">
                    Create strategies in{" "}
                    <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/option-builder")}>
                      Option Builder
                    </Button>{" "}
                    or{" "}
                    <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/option-simulator")}>
                      Option Simulator
                    </Button>
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {allStrategies.map((strategy) => {
                      const pnl = calculatePnL(strategy.positions);
                      const isProfit = pnl >= 0;

                      return (
                        <div
                          key={`${strategy.source}-${strategy.id}`}
                          className="p-4 border rounded-lg hover:bg-muted/30 transition-colors group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium">{strategy.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {strategy.type}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {strategy.source === "builder" ? "Builder" : "Simulator"}
                                </Badge>
                              </div>
                              {strategy.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {strategy.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(strategy.createdAt), "MMM d, yyyy")}
                                </span>
                                <span>{strategy.symbol}</span>
                                <span>{strategy.positions.length} legs</span>
                                <span
                                  className={`font-medium flex items-center gap-1 ${
                                    isProfit ? "text-success" : "text-destructive"
                                  }`}
                                >
                                  {isProfit ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  {isProfit ? "+" : ""}₹{formatIndianNumber(Math.round(pnl))}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleLoadStrategy(strategy)}
                                className="gap-1"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Load
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditStrategy(strategy)}
                                className="gap-1"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteStrategy(strategy.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{builderStrategies.length}</p>
                  <p className="text-sm text-muted-foreground">Builder Strategies</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{simulatorStrategies.length}</p>
                  <p className="text-sm text-muted-foreground">Simulator Strategies</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-success">
                    {allStrategies.filter((s) => calculatePnL(s.positions) >= 0).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Profitable</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-destructive">
                    {allStrategies.filter((s) => calculatePnL(s.positions) < 0).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Loss-making</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Edit Strategy Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Strategy</DialogTitle>
            <DialogDescription>Update the name and description of your strategy.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Strategy name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;