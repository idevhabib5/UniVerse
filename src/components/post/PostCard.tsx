import { Post } from "@/types/community";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowBigUp, 
  ArrowBigDown, 
  MessageSquare, 
  Share2, 
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  MoreHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import PostModMenu from "@/components/moderation/PostModMenu";

const postTypeStyles = {
  discussion: "bg-secondary text-secondary-foreground",
  question: "bg-primary/10 text-primary",
  announcement: "bg-accent/10 text-accent",
  link: "bg-success/10 text-success",
};

interface PostCardProps {
  post: Post;
  userVote?: -1 | 1 | null;
  onVote?: (postId: string, voteType: 1 | -1) => void;
  showCommunity?: boolean;
  compact?: boolean;
  isModerator?: boolean;
  onModAction?: () => void;
  isSaved?: boolean;
  onToggleSave?: (postId: string) => void;
}

const PostCard = ({ post, userVote, onVote, showCommunity = false, compact = false, isModerator = false, onModAction, isSaved = false, onToggleSave }: PostCardProps) => {
  const navigate = useNavigate();
  const score = post.upvotes - post.downvotes;
  
  const handleVote = (e: React.MouseEvent, voteType: 1 | -1) => {
    e.stopPropagation();
    onVote?.(post.id, voteType);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card 
      className={cn(
        "group hover:border-muted-foreground/30 transition-colors cursor-pointer border-border",
        post.is_pinned && "border-primary/30 bg-primary/5"
      )}
      onClick={() => navigate(`/c/${post.community?.slug || 'unknown'}/post/${post.id}`)}
    >
      <CardContent className="p-0">
        <div className="flex">
          {/* Vote Column - Reddit style */}
          <div className="flex flex-col items-center py-2 px-2 bg-secondary/50 rounded-l-lg">
            <button
              className={cn(
                "vote-btn vote-btn-up",
                userVote === 1 && "text-primary"
              )}
              onClick={(e) => handleVote(e, 1)}
            >
              <ArrowBigUp className={cn("w-6 h-6", userVote === 1 && "fill-primary")} />
            </button>
            <span className={cn(
              "text-xs font-bold py-1 tabular-nums",
              score > 0 && "text-primary",
              score < 0 && "text-accent",
              score === 0 && "text-muted-foreground"
            )}>
              {score}
            </span>
            <button
              className={cn(
                "vote-btn vote-btn-down",
                userVote === -1 && "text-accent"
              )}
              onClick={(e) => handleVote(e, -1)}
            >
              <ArrowBigDown className={cn("w-6 h-6", userVote === -1 && "fill-accent")} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 py-2 px-3 min-w-0">
            {/* Meta info */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 flex-wrap">
              {showCommunity && post.community && (
                <>
                  <span className="font-semibold text-foreground hover:underline">
                    c/{post.community.slug}
                  </span>
                  <span>•</span>
                </>
              )}
              <span>Posted by</span>
              <span className="hover:underline">
                u/{post.profiles?.username || post.profiles?.full_name || "user"}
              </span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              {post.is_pinned && (
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                  Pinned
                </Badge>
              )}
            </div>

            {/* Title */}
            <h3 className={cn(
              "font-medium text-foreground mb-1 group-hover:text-primary transition-colors leading-snug",
              compact ? "text-sm line-clamp-1" : "text-base"
            )}>
              {post.title}
            </h3>

            {/* Content Preview */}
            {!compact && post.content && (
              <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                {post.content}
              </p>
            )}

            {/* Link Preview */}
            {post.post_type === 'link' && post.link_url && (
              <a 
                href={post.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline mb-2"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                {new URL(post.link_url).hostname}
              </a>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 -ml-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs text-muted-foreground hover:bg-secondary"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                {post.comment_count} Comments
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs text-muted-foreground hover:bg-secondary"
                onClick={(e) => e.stopPropagation()}
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-7 px-2 text-xs hover:bg-secondary",
                  isSaved ? "text-primary" : "text-muted-foreground"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave?.(post.id);
                }}
              >
                {isSaved ? (
                  <BookmarkCheck className="w-4 h-4 mr-1 fill-primary" />
                ) : (
                  <Bookmark className="w-4 h-4 mr-1" />
                )}
                {isSaved ? "Saved" : "Save"}
              </Button>
              {isModerator && (
                <PostModMenu 
                  post={post} 
                  communityId={post.community_id} 
                  onUpdate={onModAction || (() => {})} 
                />
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:bg-secondary ml-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;
