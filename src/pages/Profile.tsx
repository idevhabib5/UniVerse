import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Post, Community, Comment } from "@/types/community";
import Navbar from "@/components/landing/Navbar";
import PostCard from "@/components/post/PostCard";
import InfiniteScrollTrigger from "@/components/ui/infinite-scroll-trigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Users,
  Settings,
  ArrowBigUp,
  ArrowBigDown,
  Bookmark,
  MessageCircle
} from "lucide-react";
import StartChatButton from "@/components/chat/StartChatButton";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

interface ProfileData {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  degree: string | null;
  year_of_study: number | null;
  created_at: string;
}

interface JoinedCommunity extends Community {
  role: string;
  joined_at: string;
}

interface CommentWithPost extends Comment {
  post?: {
    id: string;
    title: string;
    community?: {
      slug: string;
      name: string;
    };
  };
}

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<CommentWithPost[]>([]);
  const [communities, setCommunities] = useState<JoinedCommunity[]>([]);
  const [userVotes, setUserVotes] = useState<Map<string, -1 | 1>>(new Map());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [hasMoreSaved, setHasMoreSaved] = useState(true);
  const [postsPage, setPostsPage] = useState(0);
  const [commentsPage, setCommentsPage] = useState(0);
  const [savedPage, setSavedPage] = useState(0);
  const [activeTab, setActiveTab] = useState("posts");

  // Determine which user to show - param or current user
  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchProfile();
      fetchPosts(0, true);
      fetchCommunities();
      if (isOwnProfile && user) {
        fetchSavedPostIds();
      }
    }
  }, [targetUserId, user]);

  useEffect(() => {
    if (activeTab === "comments" && comments.length === 0 && targetUserId) {
      fetchComments(0, true);
    }
    if (activeTab === "saved" && savedPosts.length === 0 && isOwnProfile && user) {
      fetchSavedPosts(0, true);
    }
  }, [activeTab, targetUserId, user]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .maybeSingle();

    if (data) {
      setProfile(data as ProfileData);
    }
    setLoading(false);
  };

  const fetchPosts = async (pageNum: number, isInitial: boolean) => {
    if (!isInitial) setLoadingPosts(true);

    const { data } = await supabase
      .from("posts")
      .select(`
        *, 
        profiles:user_id (full_name, username, avatar_url),
        community:community_id (name, slug)
      `)
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (data) {
      const transformed = data.map((p: any) => ({
        ...p,
        profiles: p.profiles || null,
        community: p.community || null,
      }));

      if (isInitial) {
        setPosts(transformed);
      } else {
        setPosts((prev) => [...prev, ...transformed]);
      }
      setHasMorePosts(data.length === PAGE_SIZE);
    }

    // Fetch user votes
    if (user && isInitial) {
      const postIds = data?.map((p: any) => p.id) || [];
      if (postIds.length > 0) {
        const { data: votesData } = await supabase
          .from("post_votes")
          .select("post_id, vote_type")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        if (votesData) {
          const votesMap = new Map<string, -1 | 1>(userVotes);
          votesData.forEach((v: any) => votesMap.set(v.post_id, v.vote_type as -1 | 1));
          setUserVotes(votesMap);
        }
      }
    }

    setLoadingPosts(false);
  };

  const fetchComments = async (pageNum: number, isInitial: boolean) => {
    if (!isInitial) setLoadingComments(true);

    const { data } = await supabase
      .from("comments")
      .select(`
        *,
        profiles:user_id (full_name, username, avatar_url),
        post:post_id (id, title, community:community_id (slug, name))
      `)
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (data) {
      const transformed = data.map((c: any) => ({
        ...c,
        profiles: c.profiles || null,
        post: c.post || null,
      }));

      if (isInitial) {
        setComments(transformed);
      } else {
        setComments((prev) => [...prev, ...transformed]);
      }
      setHasMoreComments(data.length === PAGE_SIZE);
    }

    setLoadingComments(false);
  };

  const fetchCommunities = async () => {
    const { data } = await supabase
      .from("community_members")
      .select(`
        role,
        joined_at,
        community:community_id (*)
      `)
      .eq("user_id", targetUserId)
      .order("joined_at", { ascending: false });

    if (data) {
      const transformed = data
        .filter((m: any) => m.community)
        .map((m: any) => ({
          ...m.community,
          role: m.role,
          joined_at: m.joined_at,
        }));
      setCommunities(transformed);
    }
  };

  const fetchSavedPostIds = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_posts")
      .select("post_id")
      .eq("user_id", user.id);

    if (data) {
      setSavedPostIds(new Set(data.map((s: any) => s.post_id)));
    }
  };

  const fetchSavedPosts = async (pageNum: number, isInitial: boolean) => {
    if (!user) return;
    if (!isInitial) setLoadingSaved(true);

    const { data: savedData } = await supabase
      .from("saved_posts")
      .select("post_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (savedData && savedData.length > 0) {
      const postIds = savedData.map((s: any) => s.post_id);
      
      const { data: postsData } = await supabase
        .from("posts")
        .select(`
          *, 
          profiles:user_id (full_name, username, avatar_url),
          community:community_id (name, slug)
        `)
        .in("id", postIds);

      if (postsData) {
        // Maintain the order from saved_posts
        const postsMap = new Map(postsData.map((p: any) => [p.id, p]));
        const orderedPosts = postIds
          .map((id: string) => postsMap.get(id))
          .filter(Boolean)
          .map((p: any) => ({
            ...p,
            profiles: p.profiles || null,
            community: p.community || null,
          }));

        if (isInitial) {
          setSavedPosts(orderedPosts);
        } else {
          setSavedPosts((prev) => [...prev, ...orderedPosts]);
        }
        setHasMoreSaved(savedData.length === PAGE_SIZE);

        // Fetch votes for these posts
        const { data: votesData } = await supabase
          .from("post_votes")
          .select("post_id, vote_type")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        if (votesData) {
          const votesMap = new Map<string, -1 | 1>(userVotes);
          votesData.forEach((v: any) => votesMap.set(v.post_id, v.vote_type as -1 | 1));
          setUserVotes(votesMap);
        }
      }
    } else {
      if (isInitial) setSavedPosts([]);
      setHasMoreSaved(false);
    }

    setLoadingSaved(false);
  };

  const loadMorePosts = useCallback(() => {
    if (!loadingPosts && hasMorePosts) {
      const nextPage = postsPage + 1;
      setPostsPage(nextPage);
      fetchPosts(nextPage, false);
    }
  }, [loadingPosts, hasMorePosts, postsPage]);

  const loadMoreComments = useCallback(() => {
    if (!loadingComments && hasMoreComments) {
      const nextPage = commentsPage + 1;
      setCommentsPage(nextPage);
      fetchComments(nextPage, false);
    }
  }, [loadingComments, hasMoreComments, commentsPage]);

  const loadMoreSaved = useCallback(() => {
    if (!loadingSaved && hasMoreSaved) {
      const nextPage = savedPage + 1;
      setSavedPage(nextPage);
      fetchSavedPosts(nextPage, false);
    }
  }, [loadingSaved, hasMoreSaved, savedPage]);

  const handleToggleSave = async (postId: string) => {
    if (!user) return;

    const isSaved = savedPostIds.has(postId);
    const newSavedIds = new Set(savedPostIds);

    if (isSaved) {
      newSavedIds.delete(postId);
      setSavedPostIds(newSavedIds);
      setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
      await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      newSavedIds.add(postId);
      setSavedPostIds(newSavedIds);
      await supabase.from("saved_posts").insert({ post_id: postId, user_id: user.id });
    }
  };

  const handleVote = async (postId: string, voteType: 1 | -1) => {
    if (!user) return;

    const currentVote = userVotes.get(postId);
    const newVotes = new Map(userVotes);

    if (currentVote === voteType) {
      newVotes.delete(postId);
    } else {
      newVotes.set(postId, voteType);
    }
    setUserVotes(newVotes);

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        let upvotes = post.upvotes;
        let downvotes = post.downvotes;

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

        return { ...post, upvotes, downvotes };
      })
    );

    if (currentVote === voteType) {
      await supabase.from("post_votes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else if (currentVote) {
      await supabase.from("post_votes").update({ vote_type: voteType }).eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_votes").insert({ post_id: postId, user_id: user.id, vote_type: voteType });
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-20 text-center">
          <h1 className="text-2xl font-bold">User not found</h1>
          <p className="text-muted-foreground mt-2">This user doesn't exist.</p>
          <Button className="mt-4" onClick={() => navigate("/communities")}>
            Back to Communities
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-14 pb-8">
        <div className="container mx-auto px-4">
          <div className="flex gap-6 max-w-5xl mx-auto">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Profile Header */}
              <Card className="mb-4">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                        {getInitials(profile.full_name || profile.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold">
                          {profile.full_name || profile.username || "Anonymous"}
                        </h1>
                        {isOwnProfile ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/settings")}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Edit Profile
                          </Button>
                        ) : user && (
                          <StartChatButton 
                            targetUserId={profile.id}
                            targetUserName={profile.full_name || profile.username || undefined}
                          />
                        )}
                      </div>
                      {profile.username && (
                        <p className="text-muted-foreground">u/{profile.username}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Joined {format(new Date(profile.created_at), "MMM yyyy")}
                        </span>
                        {profile.university && (
                          <span>{profile.university}</span>
                        )}
                        {profile.degree && (
                          <Badge variant="secondary">{profile.degree}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <FileText className="w-5 h-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold">{posts.length}</p>
                    <p className="text-xs text-muted-foreground">Posts</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <MessageSquare className="w-5 h-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold">{comments.length}</p>
                    <p className="text-xs text-muted-foreground">Comments</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="w-5 h-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold">{communities.length}</p>
                    <p className="text-xs text-muted-foreground">Communities</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <Card className="mb-4">
                  <CardContent className="p-2">
                    <TabsList className="bg-transparent w-full justify-start gap-1 h-auto p-0">
                      <TabsTrigger
                        value="posts"
                        className="gap-1.5 data-[state=active]:bg-secondary rounded-full px-4"
                      >
                        <FileText className="w-4 h-4" />
                        Posts
                      </TabsTrigger>
                      <TabsTrigger
                        value="comments"
                        className="gap-1.5 data-[state=active]:bg-secondary rounded-full px-4"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Comments
                      </TabsTrigger>
                      <TabsTrigger
                        value="communities"
                        className="gap-1.5 data-[state=active]:bg-secondary rounded-full px-4"
                      >
                        <Users className="w-4 h-4" />
                        Communities
                      </TabsTrigger>
                      {isOwnProfile && (
                        <TabsTrigger
                          value="saved"
                          className="gap-1.5 data-[state=active]:bg-secondary rounded-full px-4"
                        >
                          <Bookmark className="w-4 h-4" />
                          Saved
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </CardContent>
                </Card>

                <TabsContent value="posts" className="mt-0">
                  {posts.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No posts yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          userVote={userVotes.get(post.id) || null}
                          onVote={handleVote}
                          showCommunity
                          isSaved={savedPostIds.has(post.id)}
                          onToggleSave={handleToggleSave}
                        />
                      ))}
                      <InfiniteScrollTrigger
                        onTrigger={loadMorePosts}
                        loading={loadingPosts}
                        hasMore={hasMorePosts}
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="comments" className="mt-0">
                  {comments.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No comments yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <Card key={comment.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <span>Commented on</span>
                              {comment.post ? (
                                <Link
                                  to={`/c/${comment.post.community?.slug || "unknown"}/post/${comment.post.id}`}
                                  className="font-medium text-foreground hover:text-primary transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {comment.post.title}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">[deleted post]</span>
                              )}
                              <span>•</span>
                              <span>
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <ArrowBigUp className="w-4 h-4" />
                                {comment.upvotes}
                              </span>
                              <span className="flex items-center gap-1">
                                <ArrowBigDown className="w-4 h-4" />
                                {comment.downvotes}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <InfiniteScrollTrigger
                        onTrigger={loadMoreComments}
                        loading={loadingComments}
                        hasMore={hasMoreComments}
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="communities" className="mt-0">
                  {communities.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">Not a member of any community yet</p>
                        <Button className="mt-4" onClick={() => navigate("/communities")}>
                          Explore Communities
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {communities.map((community) => (
                        <Card
                          key={community.id}
                          className="cursor-pointer hover:border-muted-foreground/30 transition-colors"
                          onClick={() => navigate(`/c/${community.slug}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-lg font-bold text-primary">
                                  {community.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">c/{community.slug}</h3>
                                  {community.role !== "member" && (
                                    <Badge variant="outline" className="text-xs">
                                      {community.role}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {community.description || "No description"}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span>{community.member_count.toLocaleString()} members</span>
                                  <span>•</span>
                                  <span>
                                    Joined {formatDistanceToNow(new Date(community.joined_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {isOwnProfile && (
                  <TabsContent value="saved" className="mt-0">
                    {savedPosts.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground">No saved posts yet</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Save posts to find them easily later
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {savedPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            userVote={userVotes.get(post.id) || null}
                            onVote={handleVote}
                            showCommunity
                            isSaved={true}
                            onToggleSave={handleToggleSave}
                          />
                        ))}
                        <InfiniteScrollTrigger
                          onTrigger={loadMoreSaved}
                          loading={loadingSaved}
                          hasMore={hasMoreSaved}
                        />
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="w-72 hidden lg:block shrink-0 space-y-4">
              {/* Karma/Activity Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Activity Overview</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Posts</span>
                    <span className="font-medium">{posts.length}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Comments</span>
                    <span className="font-medium">{comments.length}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Communities</span>
                    <span className="font-medium">{communities.length}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Communities List */}
              {communities.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      {isOwnProfile ? "Your Communities" : "Communities"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {communities.slice(0, 5).map((community) => (
                      <Link
                        key={community.id}
                        to={`/c/${community.slug}`}
                        className="flex items-center gap-2 p-2 -mx-2 rounded-md hover:bg-secondary transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {community.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm truncate">c/{community.slug}</span>
                      </Link>
                    ))}
                    {communities.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setActiveTab("communities")}
                      >
                        View all {communities.length} communities
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
