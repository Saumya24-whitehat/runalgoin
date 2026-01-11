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
import { Input } from "@/components/ui/input";
import { Crown, Search, Users, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

  const updateUserPlan = async (userId: string, newPlan: string) => {
    setUpdating(userId);
    try {
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
            expires_at: newPlan === "free" ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase.from("subscriptions").insert({
          user_id: userId,
          plan_type: newPlan,
          status: "active",
          expires_at: newPlan === "free" ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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
                expires_at:
                  newPlan === "free"
                    ? null
                    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              }
            : u
        )
      );

      toast.success(`User upgraded to ${newPlan.toUpperCase()} plan`);
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Failed to update user plan");
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
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
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
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
                    <TableCell className="text-muted-foreground text-sm">
                      {u.expires_at
                        ? new Date(u.expires_at).toLocaleDateString()
                        : "-"}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
