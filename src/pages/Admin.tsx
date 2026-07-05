import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Crown,
  Shield,
  TrendingUp,
  Search,
  Loader2,
  Calendar,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { UserSubscriptionManager } from "@/components/admin/UserSubscriptionManager";
import { VideoManagement } from "@/components/admin/VideoManagement";
import { SupportTicketManagement } from "@/components/admin/SupportTicketManagement";
import { SpecialTradingDaysManagement } from "@/components/admin/SpecialTradingDaysManagement";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { UserPlus } from "lucide-react";

interface UserWithSubscription {
  user_id: string;
  email: string;
  name: string;
  plan_type: string;
  status: string;
  expires_at: string | null;
  created_at: string;
}

interface AdminStats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  expiringSoon: number;
  newThisMonth: number;
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    proUsers: 0,
    freeUsers: 0,
    expiringSoon: 0,
    newThisMonth: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkAdminAndFetchData();
    }
  }, [user]);

  const checkAdminAndFetchData = async () => {
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
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);

      // Fetch all users with their subscriptions
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, name, created_at");

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
          created_at: profile.created_at,
        };
      });

      setUsers(usersWithSubs);

      // Calculate stats
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const proUsers = usersWithSubs.filter(u => u.plan_type === "pro" || u.plan_type === "enterprise").length;
      const freeUsers = usersWithSubs.filter(u => u.plan_type === "free").length;
      const expiringSoon = usersWithSubs.filter(u => {
        if (!u.expires_at) return false;
        const expiry = new Date(u.expires_at);
        return expiry > now && expiry <= weekFromNow;
      }).length;
      const newThisMonth = usersWithSubs.filter(u => 
        new Date(u.created_at) >= monthStart
      ).length;

      setStats({
        totalUsers: usersWithSubs.length,
        proUsers,
        freeUsers,
        expiringSoon,
        newThisMonth,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === "all" || u.plan_type === filterPlan;
    return matchesSearch && matchesPlan;
  });

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
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const getExpiryStatus = (expiresAt: string | null, planType: string) => {
    if (planType === "free" || !expiresAt) return { text: "-", className: "text-muted-foreground" };
    
    const expiry = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) {
      return { text: "Expired", className: "text-destructive" };
    } else if (daysLeft <= 7) {
      return { text: `${daysLeft}d left`, className: "text-warning" };
    } else {
      return { text: format(expiry, "MMM d, yyyy"), className: "text-muted-foreground" };
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
          <Shield className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage users and subscriptions</p>
          </div>
          <Button onClick={() => setShowSubscriptionManager(true)} className="gap-2">
            <Users className="h-4 w-4" />
            Manage Subscriptions
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Pro Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{stats.proUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Free Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.freeUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-warning" />
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-warning">{stats.expiringSoon}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                New This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">{stats.newThisMonth}</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Users</span>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const expiryStatus = getExpiryStatus(u.expires_at, u.plan_type);
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
                          <span className={expiryStatus.className}>{expiryStatus.text}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(u.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Support Tickets */}
        <div className="mt-8">
          <SupportTicketManagement />
        </div>

        {/* Special Trading Days */}
        <div className="mt-8">
          <SpecialTradingDaysManagement />
        </div>

        {/* Video Management */}
        <div className="mt-8">
          <VideoManagement />
        </div>
      </main>

      <UserSubscriptionManager
        isOpen={showSubscriptionManager}
        onClose={() => {
          setShowSubscriptionManager(false);
          checkAdminAndFetchData(); // Refresh data after closing
        }}
      />
    </div>
  );
};

export default Admin;
