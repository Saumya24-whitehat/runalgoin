import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Search, Users, Shield, Loader2, CalendarIcon, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface UserWithSubscription {
  user_id: string;
  email: string;
  name: string;
  plan_type: string;
  status: string;
  expires_at: string | null;
}

interface UserSubscriptionManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserSubscriptionManager({ isOpen, onClose }: UserSubscriptionManagerProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [useCustomDate, setUseCustomDate] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      checkAdminAndFetchUsers();
    }
  }, [isOpen, user]);

  const checkAdminAndFetchUsers = async () => {
    if (!user) return;

    try {
      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabase.rpc(
        "has_role",
        { _user_id: user.id, _role: "admin" }
      );

      if (adminError || !adminCheck) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Fetch all users with their subscriptions
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, name");

      if (profilesError) throw profilesError;

      // Fetch all subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*");

      if (subsError) throw subsError;

      // Map users with their subscriptions
      const usersWithSubs: UserWithSubscription[] = (profiles || []).map((profile) => {
        const sub = subscriptions?.find((s) => s.user_id === profile.user_id);
        return {
          user_id: profile.user_id,
          email: profile.email,
          name: profile.name,
          plan_type: sub?.plan_type || "free",
          status: sub?.status || "active",
          expires_at: sub?.expires_at || null,
        };
      });

      setUsers(usersWithSubs);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const updateUserPlan = async (userId: string, newPlan: string, customExpiryDays?: number) => {
    setUpdating(userId);
    try {
      const expiryDays = customExpiryDays ?? 365;
      const newExpiry = newPlan === "free" 
        ? null 
        : new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

      // Check if subscription exists
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        // Update existing subscription
        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan_type: newPlan,
            status: "active",
            expires_at: newExpiry,
          })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase.from("subscriptions").insert({
          user_id: userId,
          plan_type: newPlan,
          status: "active",
          expires_at: newExpiry,
        });

        if (error) throw error;
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId
            ? {
                ...u,
                plan_type: newPlan,
                status: "active",
                expires_at: newExpiry,
              }
            : u
        )
      );

      toast.success(`User upgraded to ${newPlan.toUpperCase()} plan${customExpiryDays ? ` for ${customExpiryDays} days` : ""}`);
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Failed to update user plan");
    } finally {
      setUpdating(null);
    }
  };

  const extendSubscription = async (userId: string, days: number) => {
    setUpdating(userId);
    try {
      const userSub = users.find(u => u.user_id === userId);
      if (!userSub) throw new Error("User not found");

      let newExpiry: string;
      
      if (useCustomDate && customEndDate) {
        // Use the custom date directly
        newExpiry = customEndDate.toISOString();
      } else {
        // Calculate new expiry based on days
        const currentExpiry = userSub.expires_at ? new Date(userSub.expires_at) : new Date();
        const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
        newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      const { error } = await supabase
        .from("subscriptions")
        .update({
          expires_at: newExpiry,
          status: "active",
        })
        .eq("user_id", userId);

      if (error) throw error;

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId
            ? { ...u, expires_at: newExpiry, status: "active" }
            : u
        )
      );

      const message = useCustomDate && customEndDate 
        ? `Set expiry to ${format(customEndDate, "PPP")}`
        : `Extended subscription by ${days} days`;
      toast.success(message);
      setShowExtendDialog(false);
      setSelectedUser(null);
      setUseCustomDate(false);
      setCustomEndDate(undefined);
    } catch (error) {
      console.error("Error extending subscription:", error);
      toast.error("Failed to extend subscription");
    } finally {
      setUpdating(null);
    }
  };

  const setExactDate = async (userId: string, date: Date) => {
    setUpdating(userId);
    try {
      const newExpiry = date.toISOString();

      const { error } = await supabase
        .from("subscriptions")
        .update({
          expires_at: newExpiry,
          status: "active",
        })
        .eq("user_id", userId);

      if (error) throw error;

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId
            ? { ...u, expires_at: newExpiry, status: "active" }
            : u
        )
      );

      toast.success(`Set expiry to ${format(date, "PPP")}`);
      setShowExtendDialog(false);
      setSelectedUser(null);
      setUseCustomDate(false);
      setCustomEndDate(undefined);
    } catch (error) {
      console.error("Error setting expiry date:", error);
      toast.error("Failed to set expiry date");
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "pro":
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30">
            <Crown className="h-3 w-3 mr-1" />
            Pro
          </Badge>
        );
      case "enterprise":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
            <Shield className="h-3 w-3 mr-1" />
            Enterprise
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            Free
          </Badge>
        );
    }
  };

  const getExpiryStatus = (expiresAt: string | null) => {
    if (!expiresAt) return { text: "-", isExpiringSoon: false, isExpired: false };
    
    const expiry = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      text: expiry.toLocaleDateString(),
      daysLeft,
      isExpiringSoon: daysLeft > 0 && daysLeft <= 7,
      isExpired: daysLeft <= 0,
    };
  };

  if (!isAdmin) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Access Denied</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            You don't have permission to access this feature.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              User Subscription Manager
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="text-sm">
              {filteredUsers.length} users
            </Badge>
          </div>

          <div className="flex-1 overflow-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Current Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Change Plan</TableHead>
                    <TableHead>Extend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const expiryStatus = getExpiryStatus(u.expires_at);
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{u.name}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getPlanBadge(u.plan_type)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={u.status === "active" ? "default" : "destructive"}
                            className={u.status === "active" ? "bg-success/20 text-success border-success/30" : ""}
                          >
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className={`text-sm ${expiryStatus.isExpired ? "text-destructive" : expiryStatus.isExpiringSoon ? "text-warning" : "text-muted-foreground"}`}>
                              {expiryStatus.text}
                            </span>
                            {expiryStatus.daysLeft !== undefined && expiryStatus.daysLeft > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {expiryStatus.daysLeft} days left
                              </span>
                            )}
                            {expiryStatus.isExpired && (
                              <span className="text-xs text-destructive">Expired</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.plan_type}
                            onValueChange={(value) => updateUserPlan(u.user_id, value)}
                            disabled={updating === u.user_id}
                          >
                            <SelectTrigger className="w-32">
                              {updating === u.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {u.plan_type !== "free" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(u);
                                setShowExtendDialog(true);
                                // Set initial custom date to current expiry or 30 days from now
                                if (u.expires_at) {
                                  setCustomEndDate(new Date(u.expires_at));
                                } else {
                                  setCustomEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
                                }
                              }}
                              disabled={updating === u.user_id}
                              className="gap-1"
                            >
                              <CalendarIcon className="h-3 w-3" />
                              Extend
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={(open) => {
        setShowExtendDialog(open);
        if (!open) {
          setUseCustomDate(false);
          setCustomEndDate(undefined);
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Extend Subscription</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedUser.name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                {selectedUser.expires_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current expiry: {format(new Date(selectedUser.expires_at), "PPP")}
                  </p>
                )}
              </div>

              {/* Toggle between extend days and pick date */}
              <div className="flex gap-2">
                <Button
                  variant={!useCustomDate ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setUseCustomDate(false)}
                >
                  Extend Days
                </Button>
                <Button
                  variant={useCustomDate ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setUseCustomDate(true)}
                >
                  Pick Date
                </Button>
              </div>

              {!useCustomDate ? (
                <>
                  <div className="space-y-2">
                    <Label>Adjust by (days)</Label>
                    <p className="text-xs text-muted-foreground">
                      Positive to extend, negative to shorten.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setExtendDays(extendDays - 30)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={extendDays}
                        onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                        className="text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setExtendDays(extendDays + 30)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setExtendDays(-30)}>
                      -30d
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setExtendDays(-7)}>
                      -7d
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setExtendDays(30)}>
                      +30d
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setExtendDays(90)}>
                      +90d
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setExtendDays(365)}>
                      +1y
                    </Button>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => extendSubscription(selectedUser.user_id, extendDays)}
                    disabled={updating === selectedUser.user_id || extendDays === 0}
                  >
                    {updating === selectedUser.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {extendDays >= 0 ? `Extend by ${extendDays} days` : `Shorten by ${Math.abs(extendDays)} days`}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Set End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !customEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customEndDate ? format(customEndDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customEndDate}
                          onSelect={setCustomEndDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => customEndDate && setExactDate(selectedUser.user_id, customEndDate)}
                    disabled={updating === selectedUser.user_id || !customEndDate}
                  >
                    {updating === selectedUser.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Set End Date
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
