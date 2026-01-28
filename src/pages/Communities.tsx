import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Community, Post } from "@/types/community";
import Navbar from "@/components/landing/Navbar";
import CommunityCard from "@/components/community/CommunityCard";
import PostCard from "@/components/post/PostCard";
import CreateCommunityDialog from "@/components/community/CreateCommunityDialog";
import InfiniteScrollTrigger from "@/components/ui/infinite-scroll-trigger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Search, 
  Loader2, 
  TrendingUp, 
  Clock,
  Flame,
  Users,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";

const PAGE_SIZE = 10;

const Communities = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<"hot" | "new" | "top">("hot");
  const [userVotes, setUserVotes] = useState<Map<string, -1 | 1>>(new Map());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    fetchInitialData();
  }, [user, sortBy]);

  const fetchInitialData = async () => {
    setLoading(true);
    setPage(0);
    setPosts([]);
    setHasMore(true);

    // Fetch communities
    const { data: communitiesData } = await supabase
      .from("communities")
      .select("*")
      .order("member_count", { ascending: false })
      .limit(5);

    if (communitiesData) {
      setCommunities(communitiesData as Community[]);
    }

    // Fetch initial posts
    await fetchPosts(0, true);

    // Fetch user votes and saved posts
    if (user) {
      const { data: votesData } = await supabase
        .from("post_votes")
        .select("post_id, vote_type")
        .eq("user_id", user.id);

      if (votesData) {
        const votesMap = new Map<string, -1 | 1>();
        votesData.forEach((v: any) => votesMap.set(v.post_id, v.vote_type as -1 | 1));
        setUserVotes(votesMap);
      }

      const { data: savedData } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", user.id);

      if (savedData) {
        setSavedPostIds(new Set(savedData.map((s: any) => s.post_id)));
      }
    }

    setLoading(false);
  };

  const fetchPosts = async (pageNum: number, isInitial: boolean) => {
    if (!isInitial) {
      setLoadingMore(true);
    }

    let query = supabase
      .from("posts")
      .select(`
        *, 
        profiles:user_id (full_name, username, avatar_url),
        community:community_id (name, slug)
      `)
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    // Apply sorting
    if (sortBy === "new") {
      query = query.order("created_at", { ascending: false });
    } else if (sortBy === "top") {
      query = query.order("upvotes", { ascending: false });
    } else {
      // Hot: combination of recency and votes
      query = query.order("created_at", { ascending: false });
    }

    const { data: postsData, error } = await query;

    if (postsData) {
      const transformed = postsData.map((p: any) => ({
        ...p,
        profiles: p.profiles || null,
        community: p.community || null
      }));

      if (isInitial) {
        setPosts(transformed);
      } else {
        setPosts((prev) => [...prev, ...transformed]);
      }

      setHasMore(postsData.length === PAGE_SIZE);
    }

    setLoadingMore(false);
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage, false);
    }
  }, [loadingMore, hasMore, page]);

  const handleVote = async (postId: string, voteType: 1 | -1) => {
    if (!user) return;

    const currentVote = userVotes.get(postId);

    // Optimistic update
    const newVotes = new Map(userVotes);
    if (currentVote === voteType) {
      newVotes.delete(postId);
    } else {
      newVotes.set(postId, voteType);
    }
    setUserVotes(newVotes);

    // Update posts optimistically
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        let upvotes = post.upvotes;
        let downvotes = post.downvotes;

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

        return { ...post, upvotes, downvotes };
      })
    );

    // Persist to database
    if (currentVote === voteType) {
      await supabase.from("post_votes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else if (currentVote) {
      await supabase.from("post_votes").update({ vote_type: voteType }).eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_votes").insert({ post_id: postId, user_id: user.id, vote_type: voteType });
    }
  };

  const handleToggleSave = async (postId: string) => {
    if (!user) return;

    const isSaved = savedPostIds.has(postId);
    const newSavedIds = new Set(savedPostIds);

    if (isSaved) {
      newSavedIds.delete(postId);
      await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      newSavedIds.add(postId);
      await supabase.from("saved_posts").insert({ post_id: postId, user_id: user.id });
    }

    setSavedPostIds(newSavedIds);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as "hot" | "new" | "top");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-14 pb-8">
        <div className="container mx-auto px-4">
          <div className="flex gap-6 max-w-6xl mx-auto">
            {/* Main Feed */}
            <div className="flex-1 min-w-0">
              {/* Create Post Bar */}
              <Card className="mb-4">
                <CardContent className="p-2 flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <Input 
                    placeholder="Create Post"
                    className="bg-secondary border-0 cursor-pointer hover:bg-muted transition-colors"
                    readOnly
                  />
                </CardContent>
              </Card>

              {/* Sort Tabs */}
              <Tabs value={sortBy} onValueChange={handleSortChange} className="mb-4">
                <Card>
                  <CardContent className="p-2">
                    <TabsList className="bg-transparent w-full justify-start gap-1 h-auto p-0">
                      <TabsTrigger 
                        value="hot" 
                        className="gap-1.5 data-[state=active]:bg-secondary rounded-full px-4"
                      >
                        <Flame className="w-4 h-4" />
                        Hot
                      </TabsTrigger>
                      <TabsTrigger 
                        value="new" 
                        className="gap-1.5 data-[state=active]:bg-secondary rounded-full px-4"
                      >
                        <Clock className="w-4 h-4" />
                        New
                      </TabsTrigger>
                      <TabsTrigger 
                        value="top" 
                        className="gap-1.5 data-[state=active]:bg-secondary rounded-full px-4"
                      >
                        <TrendingUp className="w-4 h-4" />
                        Top
                      </TabsTrigger>
                    </TabsList>
                  </CardContent>
                </Card>
              </Tabs>

              {/* Posts Feed */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : posts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
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
                    onTrigger={loadMore}
                    loading={loadingMore}
                    hasMore={hasMore}
                  />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="w-80 hidden lg:block shrink-0 space-y-4">
              {/* Top Communities */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Top Communities
                    <Link to="/communities" className="text-xs text-primary hover:underline">
                      See all
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {communities.map((community, index) => (
                    <Link 
                      key={community.id} 
                      to={`/c/${community.slug}`}
                      className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-secondary transition-colors group"
                    >
                      <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {community.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          c/{community.slug}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {community.member_count.toLocaleString()} members
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </CardContent>
              </Card>

              {/* Create Community */}
              {user && (
                <Card>
                  <CardContent className="p-4">
                    <CreateCommunityDialog>
                      <Button className="w-full" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Community
                      </Button>
                    </CreateCommunityDialog>
                  </CardContent>
                </Card>
              )}

              {/* Footer Links */}
              <div className="text-xs text-muted-foreground space-y-2 px-2">
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  <a href="#" className="hover:underline">About</a>
                  <a href="#" className="hover:underline">Help</a>
                  <a href="#" className="hover:underline">Terms</a>
                  <a href="#" className="hover:underline">Privacy</a>
                </div>
                <p>UniVerse © 2024. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Communities;
