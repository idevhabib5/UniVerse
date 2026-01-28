import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  MessageSquare, 
  FileQuestion, 
  Lightbulb, 
  Building2, 
  TrendingUp,
  Shield,
  AlertTriangle,
  Search,
  Ban,
  Trash2,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Edit,
  Lock,
  Globe,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface AdminStats {
  total_users: number;
  total_communities: number;
  total_posts: number;
  total_problems: number;
  total_solutions: number;
  total_comments: number;
  users_today: number;
  posts_today: number;
  communities_by_type: { type: string; count: number }[] | null;
  recent_users: { id: string; full_name: string | null; username: string | null; created_at: string }[] | null;
  top_communities: { id: string; name: string; member_count: number; slug: string }[] | null;
}

interface ManagedUser {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  degree: string | null;
  created_at: string;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
}

interface ManagedCommunity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  member_count: number;
  community_type: string;
  is_private: boolean;
  created_at: string;
  created_by: string | null;
  creator_name: string | null;
  creator_username: string | null;
  post_count: number;
}

interface UsersResponse {
  users: ManagedUser[] | null;
  total_count: number;
  page: number;
  page_size: number;
}

interface CommunitiesResponse {
  communities: ManagedCommunity[] | null;
  total_count: number;
  page: number;
  page_size: number;
}

const COMMUNITY_TYPES = ["general", "study_help", "interest", "gaming", "tech", "creative"];

const SuperAdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Stats state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // User management state
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Community management state
  const [communities, setCommunities] = useState<ManagedCommunity[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [communitySearchQuery, setCommunitySearchQuery] = useState("");
  const [communityCurrentPage, setCommunityCurrentPage] = useState(1);
  const [totalCommunities, setTotalCommunities] = useState(0);
  
  const pageSize = 15;
  
  // User dialog states
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<string>("permanent");
  
  // Community dialog states
  const [editCommunityDialogOpen, setEditCommunityDialogOpen] = useState(false);
  const [deleteCommunityDialogOpen, setDeleteCommunityDialogOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<ManagedCommunity | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    checkAuthorization();
  }, [user, authLoading, navigate]);

  const checkAuthorization = async () => {
    if (!user) return;

    const { data, error } = await supabase.rpc("is_super_admin", { _user_id: user.id });
    
    if (error || !data) {
      setError("Access denied. You don't have permission to view this page.");
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    setIsAuthorized(true);
    fetchStats();
    fetchUsers();
    fetchCommunities();
  };

  const fetchStats = async () => {
    const { data, error } = await supabase.rpc("get_admin_stats");
    
    if (error) {
      console.error("Stats error:", error);
    } else {
      setStats(data as unknown as AdminStats);
    }
    setLoading(false);
  };

  const fetchUsers = async (page = 1, search = "") => {
    setUsersLoading(true);
    
    const { data, error } = await supabase.rpc("admin_get_users", {
      page_number: page,
      page_size: pageSize,
      search_query: search || null
    });
    
    if (error) {
      console.error("Users fetch error:", error);
    } else {
      const response = data as unknown as UsersResponse;
      setUsers(response.users || []);
      setTotalUsers(response.total_count);
      setUserCurrentPage(response.page);
    }
    setUsersLoading(false);
  };

  const fetchCommunities = async (page = 1, search = "") => {
    setCommunitiesLoading(true);
    
    const { data, error } = await supabase.rpc("admin_get_communities", {
      page_number: page,
      page_size: pageSize,
      search_query: search || null
    });
    
    if (error) {
      console.error("Communities fetch error:", error);
    } else {
      const response = data as unknown as CommunitiesResponse;
      setCommunities(response.communities || []);
      setTotalCommunities(response.total_count);
      setCommunityCurrentPage(response.page);
    }
    setCommunitiesLoading(false);
  };

  const handleUserSearch = () => {
    setUserCurrentPage(1);
    fetchUsers(1, userSearchQuery);
  };

  const handleCommunitySearch = () => {
    setCommunityCurrentPage(1);
    fetchCommunities(1, communitySearchQuery);
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    const durationDays = banDuration === "permanent" ? null : parseInt(banDuration);
    
    const { error } = await supabase.rpc("admin_ban_user", {
      target_user_id: selectedUser.id,
      ban_reason: banReason || null,
      ban_duration_days: durationDays
    });
    
    if (error) {
      toast({ variant: "destructive", title: "Ban failed", description: error.message });
    } else {
      toast({ title: "User banned", description: `${selectedUser.full_name || "User"} has been banned.` });
      fetchUsers(userCurrentPage, userSearchQuery);
      fetchStats();
    }
    
    setActionLoading(false);
    setBanDialogOpen(false);
    setSelectedUser(null);
    setBanReason("");
    setBanDuration("permanent");
  };

  const handleUnbanUser = async (targetUser: ManagedUser) => {
    setActionLoading(true);
    
    const { error } = await supabase.rpc("admin_unban_user", { target_user_id: targetUser.id });
    
    if (error) {
      toast({ variant: "destructive", title: "Unban failed", description: error.message });
    } else {
      toast({ title: "User unbanned", description: `${targetUser.full_name || "User"} has been unbanned.` });
      fetchUsers(userCurrentPage, userSearchQuery);
    }
    
    setActionLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    
    const { error } = await supabase.rpc("admin_delete_user", { target_user_id: selectedUser.id });
    
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    } else {
      toast({ title: "User deleted", description: `${selectedUser.full_name || "User"} has been deleted.` });
      fetchUsers(userCurrentPage, userSearchQuery);
      fetchStats();
    }
    
    setActionLoading(false);
    setDeleteUserDialogOpen(false);
    setSelectedUser(null);
  };

  const openEditCommunityDialog = (community: ManagedCommunity) => {
    setSelectedCommunity(community);
    setEditName(community.name);
    setEditDescription(community.description || "");
    setEditType(community.community_type);
    setEditIsPrivate(community.is_private);
    setEditCommunityDialogOpen(true);
  };

  const handleUpdateCommunity = async () => {
    if (!selectedCommunity) return;
    
    setActionLoading(true);
    
    const { error } = await supabase.rpc("admin_update_community", {
      target_community_id: selectedCommunity.id,
      new_name: editName !== selectedCommunity.name ? editName : null,
      new_description: editDescription !== selectedCommunity.description ? editDescription : null,
      new_community_type: editType !== selectedCommunity.community_type ? editType as "general" | "study_help" | "interest" | "gaming" | "tech" | "creative" : null,
      new_is_private: editIsPrivate !== selectedCommunity.is_private ? editIsPrivate : null
    });
    
    if (error) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } else {
      toast({ title: "Community updated", description: `${editName} has been updated.` });
      fetchCommunities(communityCurrentPage, communitySearchQuery);
      fetchStats();
    }
    
    setActionLoading(false);
    setEditCommunityDialogOpen(false);
    setSelectedCommunity(null);
  };

  const handleDeleteCommunity = async () => {
    if (!selectedCommunity) return;
    
    setActionLoading(true);
    
    const { error } = await supabase.rpc("admin_delete_community", { target_community_id: selectedCommunity.id });
    
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    } else {
      toast({ title: "Community deleted", description: `${selectedCommunity.name} has been deleted.` });
      fetchCommunities(communityCurrentPage, communitySearchQuery);
      fetchStats();
    }
    
    setActionLoading(false);
    setDeleteCommunityDialogOpen(false);
    setSelectedCommunity(null);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const userTotalPages = Math.ceil(totalUsers / pageSize);
  const communityTotalPages = Math.ceil(totalCommunities / pageSize);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">{error || "You don't have permission to access this page."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    { title: "Total Users", value: stats?.total_users || 0, icon: Users, color: "text-blue-500", today: stats?.users_today },
    { title: "Communities", value: stats?.total_communities || 0, icon: Building2, color: "text-green-500" },
    { title: "Posts", value: stats?.total_posts || 0, icon: MessageSquare, color: "text-purple-500", today: stats?.posts_today },
    { title: "Problems", value: stats?.total_problems || 0, icon: FileQuestion, color: "text-orange-500" },
    { title: "Solutions", value: stats?.total_solutions || 0, icon: Lightbulb, color: "text-yellow-500" },
    { title: "Comments", value: stats?.total_comments || 0, icon: TrendingUp, color: "text-pink-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Platform management</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="communities">Communities</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {statCards.map((stat) => (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value.toLocaleString()}</div>
                    {stat.today !== undefined && stat.today > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="text-green-500">+{stat.today}</span> today
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Recent Users</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.recent_users && stats.recent_users.length > 0 ? (
                    <div className="space-y-3">
                      {stats.recent_users.slice(0, 5).map((u) => (
                        <div key={u.id} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{getInitials(u.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.full_name || "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-muted-foreground text-center py-4">No users yet</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Top Communities</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.top_communities && stats.top_communities.length > 0 ? (
                    <div className="space-y-3">
                      {stats.top_communities.map((community) => (
                        <div key={community.id} className="flex items-center justify-between">
                          <span className="font-medium truncate">{community.name}</span>
                          <Badge variant="secondary">{community.member_count} members</Badge>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-muted-foreground text-center py-4">No communities yet</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />User Management</CardTitle>
                    <CardDescription>{totalUsers} total users</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Search users..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleUserSearch()} className="pl-9" />
                    </div>
                    <Button variant="outline" size="icon" onClick={handleUserSearch}><Search className="w-4 h-4" /></Button>
                    <Button variant="outline" size="icon" onClick={() => fetchUsers(userCurrentPage, userSearchQuery)}><RefreshCw className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : users.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead className="hidden md:table-cell">University</TableHead>
                            <TableHead className="hidden sm:table-cell">Joined</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={u.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">{getInitials(u.full_name || u.username)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{u.full_name || "Unnamed"}</p>
                                    {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-muted-foreground">{u.university || "—"}</TableCell>
                              <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{format(new Date(u.created_at), "MMM d, yyyy")}</TableCell>
                              <TableCell>
                                {u.is_banned ? (
                                  <Badge variant="destructive" className="gap-1"><Ban className="w-3 h-3" />Banned</Badge>
                                ) : (
                                  <Badge variant="secondary" className="gap-1"><UserCheck className="w-3 h-3" />Active</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {u.is_banned ? (
                                    <Button variant="ghost" size="sm" onClick={() => handleUnbanUser(u)} disabled={actionLoading}><UserCheck className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Unban</span></Button>
                                  ) : (
                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(u); setBanDialogOpen(true); }}><Ban className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Ban</span></Button>
                                  )}
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setSelectedUser(u); setDeleteUserDialogOpen(true); }}><Trash2 className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Delete</span></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {userTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">Page {userCurrentPage} of {userTotalPages}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => fetchUsers(userCurrentPage - 1, userSearchQuery)} disabled={userCurrentPage <= 1}><ChevronLeft className="w-4 h-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => fetchUsers(userCurrentPage + 1, userSearchQuery)} disabled={userCurrentPage >= userTotalPages}><ChevronRight className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserX className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No users found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communities Tab */}
          <TabsContent value="communities" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Community Management</CardTitle>
                    <CardDescription>{totalCommunities} total communities</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Search communities..." value={communitySearchQuery} onChange={(e) => setCommunitySearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCommunitySearch()} className="pl-9" />
                    </div>
                    <Button variant="outline" size="icon" onClick={handleCommunitySearch}><Search className="w-4 h-4" /></Button>
                    <Button variant="outline" size="icon" onClick={() => fetchCommunities(communityCurrentPage, communitySearchQuery)}><RefreshCw className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {communitiesLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : communities.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Community</TableHead>
                            <TableHead className="hidden md:table-cell">Type</TableHead>
                            <TableHead className="hidden sm:table-cell">Members</TableHead>
                            <TableHead className="hidden lg:table-cell">Posts</TableHead>
                            <TableHead>Visibility</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {communities.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={c.icon_url || undefined} />
                                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{c.name}</p>
                                    <p className="text-xs text-muted-foreground">/{c.slug}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="outline" className="capitalize">{c.community_type.replace("_", " ")}</Badge>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">{c.member_count}</TableCell>
                              <TableCell className="hidden lg:table-cell">{c.post_count}</TableCell>
                              <TableCell>
                                {c.is_private ? (
                                  <Badge variant="secondary" className="gap-1"><Lock className="w-3 h-3" />Private</Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1"><Globe className="w-3 h-3" />Public</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={`/c/${c.slug}`} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => openEditCommunityDialog(c)}><Edit className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Edit</span></Button>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setSelectedCommunity(c); setDeleteCommunityDialogOpen(true); }}><Trash2 className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Delete</span></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {communityTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">Page {communityCurrentPage} of {communityTotalPages}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => fetchCommunities(communityCurrentPage - 1, communitySearchQuery)} disabled={communityCurrentPage <= 1}><ChevronLeft className="w-4 h-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => fetchCommunities(communityCurrentPage + 1, communitySearchQuery)} disabled={communityCurrentPage >= communityTotalPages}><ChevronRight className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No communities found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ban className="w-5 h-5 text-destructive" />Ban User</DialogTitle>
            <DialogDescription>Ban {selectedUser?.full_name || selectedUser?.username || "this user"} from the platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ban Duration</Label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea placeholder="Enter reason for the ban..." value={banReason} onChange={(e) => setBanReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBanUser} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-destructive" />Delete User</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete {selectedUser?.full_name || "this user"}? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Community Dialog */}
      <Dialog open={editCommunityDialogOpen} onOpenChange={setEditCommunityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5" />Edit Community</DialogTitle>
            <DialogDescription>Update community details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMUNITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">{type.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Private Community</Label>
              <Switch checked={editIsPrivate} onCheckedChange={setEditIsPrivate} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCommunityDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateCommunity} disabled={actionLoading || !editName.trim()}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Community Dialog */}
      <AlertDialog open={deleteCommunityDialogOpen} onOpenChange={setDeleteCommunityDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-destructive" />Delete Community</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{selectedCommunity?.name}"? This will remove all posts, members, and data. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCommunity} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Community
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuperAdminDashboard;
