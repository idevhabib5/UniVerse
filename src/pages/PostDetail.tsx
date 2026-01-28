import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Post, Comment } from "@/types/community";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  ArrowBigUp, 
  ArrowBigDown, 
  MessageSquare, 
  Share2, 
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Loader2,
  Send,
  MoreHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const PostDetail = () => {
  const { slug, postId } = useParams<{ slug: string; postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [userVote, setUserVote] = useState<-1 | 1 | null>(null);
  const [commentVotes, setCommentVotes] = useState<Map<string, -1 | 1>>(new Map());
  const [isSaved, setIsSaved] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
      if (user) {
        fetchUserVote();
        fetchSavedStatus();
        fetchCommentVotes();
      }
    }
  }, [postId, user]);

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles:user_id (full_name, username, avatar_url),
        community:community_id (name, slug)
      `)
      .eq("id", postId)
      .maybeSingle();

    if (error || !data) {
      console.error("Error fetching post:", error);
      toast({
        variant: "destructive",
        title: "Post not found",
        description: "This post may have been deleted.",
      });
      const communitySlug = data?.community?.slug || slug;
      navigate(communitySlug ? `/c/${communitySlug}` : "/communities");
    } else {
      const transformed: Post = {
        ...data,
        profiles: data.profiles || null,
        community: data.community || null,
      };
      setPost(transformed);
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        profiles:user_id (full_name, username, avatar_url)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const transformed = data.map((c: any) => ({
        ...c,
        profiles: c.profiles || null,
        replies: [],
      }));

      // Build nested structure
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      transformed.forEach((comment) => {
        commentMap.set(comment.id, comment);
      });

      transformed.forEach((comment) => {
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            if (!parent.replies) parent.replies = [];
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    }
  };

  const fetchUserVote = async () => {
    if (!user || !postId) return;
    
    const { data } = await supabase
      .from("post_votes")
      .select("vote_type")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setUserVote(data.vote_type as -1 | 1);
    }
  };

  const fetchCommentVotes = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("comment_votes")
      .select("comment_id, vote_type")
      .eq("user_id", user.id);

    if (data) {
      const votesMap = new Map<string, -1 | 1>();
      data.forEach((v: any) => votesMap.set(v.comment_id, v.vote_type as -1 | 1));
      setCommentVotes(votesMap);
    }
  };

  const fetchSavedStatus = async () => {
    if (!user || !postId) return;
    
    const { data } = await supabase
      .from("saved_posts")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsSaved(!!data);
  };

  const handleVote = async (voteType: 1 | -1) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!post) return;

    const currentVote = userVote;
    const newVote = currentVote === voteType ? null : voteType;

    // Optimistic update
    setUserVote(newVote);
    setPost((prev) => {
      if (!prev) return prev;
      let upvotes = prev.upvotes;
      let downvotes = prev.downvotes;

      if (currentVote === voteType) {
        // Removing vote
        if (voteType === 1) upvotes--;
        else downvotes--;
      } else if (currentVote) {
        // Changing vote
        if (voteType === 1) {
          upvotes++;
          downvotes--;
        } else {
          upvotes--;
          downvotes++;
        }
      } else {
        // New vote
        if (voteType === 1) upvotes++;
        else downvotes++;
      }

      return { ...prev, upvotes, downvotes };
    });

    // Persist to database
    if (currentVote === voteType) {
      await supabase
        .from("post_votes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
    } else if (currentVote) {
      await supabase
        .from("post_votes")
        .update({ vote_type: voteType })
        .eq("post_id", postId)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("post_votes")
        .insert({ post_id: postId, user_id: user.id, vote_type: voteType });
    }
  };

  const handleCommentVote = async (commentId: string, voteType: 1 | -1) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const currentVote = commentVotes.get(commentId);
    const newVote = currentVote === voteType ? null : voteType;

    // Optimistic update
    const newVotes = new Map(commentVotes);
    if (newVote) {
      newVotes.set(commentId, newVote);
    } else {
      newVotes.delete(commentId);
    }
    setCommentVotes(newVotes);

    // Update comments optimistically
    const updateCommentVotes = (commentList: Comment[]): Comment[] => {
      return commentList.map((comment) => {
        if (comment.id === commentId) {
          let upvotes = comment.upvotes;
          let downvotes = comment.downvotes;

          if (currentVote === voteType) {
            if (voteType === 1) upvotes--;
            else downvotes--;
          } else if (currentVote) {
            if (voteType === 1) {
              upvotes++;
              downvotes--;
            } else {
              upvotes--;
              downvotes++;
            }
          } else {
            if (voteType === 1) upvotes++;
            else downvotes++;
          }

          return { ...comment, upvotes, downvotes };
        }
        if (comment.replies) {
          return { ...comment, replies: updateCommentVotes(comment.replies) };
        }
        return comment;
      });
    };

    setComments(updateCommentVotes(comments));

    // Persist to database
    if (currentVote === voteType) {
      await supabase
        .from("comment_votes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);
    } else if (currentVote) {
      await supabase
        .from("comment_votes")
        .update({ vote_type: voteType })
        .eq("comment_id", commentId)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("comment_votes")
        .insert({ comment_id: commentId, user_id: user.id, vote_type: voteType });
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!newComment.trim()) return;

    setSubmittingComment(true);

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: newComment.trim(),
      parent_id: replyingTo || null,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to post comment. Please try again.",
      });
    } else {
      toast({
        title: "Comment posted!",
        description: "Your comment has been added.",
      });
      setNewComment("");
      setReplyingTo(null);
      fetchComments();
      if (post) {
        fetchPost(); // Update comment count
      }
    }

    setSubmittingComment(false);
  };

  const handleToggleSave = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (isSaved) {
      await supabase
        .from("saved_posts")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      setIsSaved(false);
    } else {
      await supabase
        .from("saved_posts")
        .insert({ post_id: postId, user_id: user.id });
      setIsSaved(true);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderComment = (comment: Comment, depth = 0): JSX.Element => {
    const userVote = commentVotes.get(comment.id) || null;
    const score = comment.upvotes - comment.downvotes;

    return (
      <div key={comment.id} className={cn("space-y-2", depth > 0 && "ml-8 border-l-2 border-border pl-4")}>
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={comment.profiles?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(comment.profiles?.full_name || comment.profiles?.username)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span className="font-medium text-foreground">
                u/{comment.profiles?.username || comment.profiles?.full_name || "user"}
              </span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap mb-2">{comment.content}</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  className={cn(
                    "p-1 rounded hover:bg-muted transition-colors",
                    userVote === 1 && "text-primary"
                  )}
                  onClick={() => handleCommentVote(comment.id, 1)}
                >
                  <ArrowBigUp className={cn("w-4 h-4", userVote === 1 && "fill-primary")} />
                </button>
                <span className={cn(
                  "text-xs font-bold min-w-[20px] text-center",
                  score > 0 && "text-primary",
                  score < 0 && "text-accent"
                )}>
                  {score}
                </span>
                <button
                  className={cn(
                    "p-1 rounded hover:bg-muted transition-colors",
                    userVote === -1 && "text-accent"
                  )}
                  onClick={() => handleCommentVote(comment.id, -1)}
                >
                  <ArrowBigDown className={cn("w-4 h-4", userVote === -1 && "fill-accent")} />
                </button>
              </div>
              {depth < 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    setReplyingTo(comment.id);
                    setReplyContent("");
                  }}
                >
                  Reply
                </Button>
              )}
            </div>
            {replyingTo === comment.id && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!replyContent.trim()) return;
                      setSubmittingComment(true);
                      const { error } = await supabase.from("comments").insert({
                        post_id: postId,
                        user_id: user!.id,
                        content: replyContent.trim(),
                        parent_id: comment.id,
                      });
                      if (!error) {
                        setReplyContent("");
                        setReplyingTo(null);
                        fetchComments();
                        if (post) {
                          fetchPost();
                        }
                      } else {
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description: "Failed to post reply. Please try again.",
                        });
                      }
                      setSubmittingComment(false);
                    }}
                    disabled={!replyContent.trim() || submittingComment}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Reply
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-2 mt-2">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const score = post.upvotes - post.downvotes;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-12 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate(post.community ? `/c/${post.community.slug}` : "/communities")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {post.community ? post.community.name : "Communities"}
          </Button>

          {/* Post Card */}
          <Card className="mb-6">
            <CardContent className="p-0">
              <div className="flex">
                {/* Vote Column */}
                <div className="flex flex-col items-center py-4 px-3 bg-secondary/50 rounded-l-lg">
                  <button
                    className={cn(
                      "vote-btn vote-btn-up",
                      userVote === 1 && "text-primary"
                    )}
                    onClick={() => handleVote(1)}
                  >
                    <ArrowBigUp className={cn("w-6 h-6", userVote === 1 && "fill-primary")} />
                  </button>
                  <span className={cn(
                    "text-sm font-bold py-2 tabular-nums",
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
                    onClick={() => handleVote(-1)}
                  >
                    <ArrowBigDown className={cn("w-6 h-6", userVote === -1 && "fill-accent")} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 py-4 px-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    {post.community && (
                      <>
                        <Link
                          to={`/c/${post.community.slug}`}
                          className="font-semibold text-foreground hover:underline"
                        >
                          c/{post.community.slug}
                        </Link>
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

                  <h1 className="text-2xl font-bold text-foreground mb-3">{post.title}</h1>

                  {post.content && (
                    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap mb-4">
                      {post.content}
                    </div>
                  )}

                  {post.post_type === 'link' && post.link_url && (
                    <a 
                      href={post.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-accent hover:underline mb-4"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {new URL(post.link_url).hostname}
                    </a>
                  )}

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {post.comment_count} Comments
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("gap-2", isSaved && "text-primary")}
                      onClick={handleToggleSave}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-4 h-4 fill-primary" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                      {isSaved ? "Saved" : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comment Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Add a comment</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="What are your thoughts?"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px] mb-4"
                maxLength={10000}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {newComment.length}/10000 characters
                </p>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submittingComment}
                >
                  {submittingComment ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Comment
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {post.comment_count} {post.comment_count === 1 ? 'Comment' : 'Comments'}
            </h2>
            {comments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => renderComment(comment))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PostDetail;
