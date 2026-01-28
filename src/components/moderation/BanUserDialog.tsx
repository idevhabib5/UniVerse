import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ban, Loader2 } from "lucide-react";

interface BanUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  communityId: string;
  onBanned?: () => void;
}

const BanUserDialog = ({ 
  open, 
  onOpenChange, 
  userId, 
  username, 
  communityId,
  onBanned 
}: BanUserDialogProps) => {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("permanent");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleBan = async () => {
    if (!user) return;

    setIsLoading(true);
    
    let expiresAt: string | null = null;
    if (duration !== "permanent") {
      const days = parseInt(duration);
      const date = new Date();
      date.setDate(date.getDate() + days);
      expiresAt = date.toISOString();
    }

    // First, remove user from community
    await supabase
      .from("community_members")
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", userId);

    // Then add to bans
    const { error } = await supabase.from("community_bans").insert({
      community_id: communityId,
      user_id: userId,
      banned_by: user.id,
      reason: reason || null,
      expires_at: expiresAt,
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "User is already banned", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ 
        title: "User banned", 
        description: `${username} has been banned from this community`
      });
      onBanned?.();
      onOpenChange(false);
      setReason("");
      setDuration("permanent");
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-destructive" />
            Ban User
          </DialogTitle>
          <DialogDescription>
            Ban <span className="font-semibold">u/{username}</span> from this community.
            They will be removed and prevented from rejoining.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Ban Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why is this user being banned?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This will be visible to other moderators
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleBan}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Ban className="w-4 h-4 mr-2" />
            )}
            Ban User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BanUserDialog;
