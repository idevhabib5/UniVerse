import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CommunityBan } from "@/types/community";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Ban, 
  ScrollText, 
  Users, 
  Loader2,
  UserX,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import CommunityRulesEditor from "./CommunityRulesEditor";

interface ModeratorPanelProps {
  communityId: string;
  children: React.ReactNode;
}

const ModeratorPanel = ({ communityId, children }: ModeratorPanelProps) => {
  const [open, setOpen] = useState(false);
  const [bans, setBans] = useState<CommunityBan[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchBans();
    }
  }, [open, communityId]);

  const fetchBans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("community_bans")
      .select(`
        *,
        profiles!community_bans_user_id_fkey (full_name, username, avatar_url)
      `)
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });

    if (data) {
      setBans(data as CommunityBan[]);
    }
    setLoading(false);
  };

  const handleUnban = async (banId: string, username: string) => {
    const { error } = await supabase
      .from("community_bans")
      .delete()
      .eq("id", banId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User unbanned", description: `${username} can now rejoin the community` });
      fetchBans();
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Mod Tools
          </SheetTitle>
          <SheetDescription>
            Manage community rules, bans, and moderation settings
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <CommunityRulesEditor communityId={communityId}>
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <ScrollText className="w-5 h-5" />
                <span className="text-sm">Edit Rules</span>
              </Button>
            </CommunityRulesEditor>
            <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2" disabled>
              <Users className="w-5 h-5" />
              <span className="text-sm">Manage Mods</span>
            </Button>
          </div>

          {/* Banned Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Ban className="w-4 h-4" />
                Banned Users ({bans.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : bans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No banned users
                </p>
              ) : (
                <div className="space-y-3">
                  {bans.map((ban) => {
                    const expired = isExpired(ban.expires_at);
                    return (
                      <div 
                        key={ban.id} 
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          expired ? 'bg-muted/50 opacity-60' : 'bg-card'
                        }`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={ban.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(ban.profiles?.username || ban.profiles?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            u/{ban.profiles?.username || ban.profiles?.full_name || "Unknown"}
                          </p>
                          {ban.reason && (
                            <p className="text-xs text-muted-foreground truncate">
                              {ban.reason}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {ban.expires_at ? (
                              <Badge variant={expired ? "secondary" : "outline"} className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {expired 
                                  ? "Expired" 
                                  : `Expires ${formatDistanceToNow(new Date(ban.expires_at), { addSuffix: true })}`
                                }
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Permanent
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUnban(
                            ban.id, 
                            ban.profiles?.username || ban.profiles?.full_name || "user"
                          )}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Unban
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ModeratorPanel;
