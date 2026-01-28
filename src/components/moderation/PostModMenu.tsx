import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Post } from "@/types/community";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Pin, 
  PinOff, 
  Trash2, 
  Shield,
  Ban
} from "lucide-react";
import BanUserDialog from "./BanUserDialog";

interface PostModMenuProps {
  post: Post;
  communityId: string;
  onUpdate: () => void;
}

const PostModMenu = ({ post, communityId, onUpdate }: PostModMenuProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePin = async () => {
    setIsLoading(true);
    const { error } = await supabase
      .from("posts")
      .update({ is_pinned: !post.is_pinned })
      .eq("id", post.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: post.is_pinned ? "Post unpinned" : "Post pinned" });
      onUpdate();
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Post removed" });
      onUpdate();
    }
    setIsLoading(false);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-primary hover:bg-primary/10"
            onClick={(e) => e.stopPropagation()}
          >
            <Shield className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={handlePin} disabled={isLoading}>
            {post.is_pinned ? (
              <>
                <PinOff className="w-4 h-4 mr-2" />
                Unpin Post
              </>
            ) : (
              <>
                <Pin className="w-4 h-4 mr-2" />
                Pin Post
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowBanDialog(true)}
            disabled={isLoading}
          >
            <Ban className="w-4 h-4 mr-2" />
            Ban User
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
            disabled={isLoading}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The post and all its comments will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BanUserDialog
        open={showBanDialog}
        onOpenChange={setShowBanDialog}
        userId={post.user_id}
        username={post.profiles?.username || post.profiles?.full_name || "user"}
        communityId={communityId}
        onBanned={onUpdate}
      />
    </>
  );
};

export default PostModMenu;
