import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Community, Post, CommunityMember, CommunityRule } from "@/types/community";
import Navbar from "@/components/landing/Navbar";
import PostCard from "@/components/post/PostCard";
import CreatePostDialog from "@/components/post/CreatePostDialog";
import ChatRoom from "@/components/chat/ChatRoom";
import ModeratorPanel from "@/components/moderation/ModeratorPanel";
import CommunitySettings from "@/components/community/CommunitySettings";
import InfiniteScrollTrigger from "@/components/ui/infinite-scroll-trigger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  MessageCircle, 
  FileText, 
  Loader2, 
  Plus, 
  LogOut,
  Calendar,
  Flame,
  Clock,
  TrendingUp,
  Globe,
  BookOpen,
  Sparkles,
  Gamepad2,
  Code,
  Palette,
  Shield,
  Settings
} from "lucide-react";

const PAGE_SIZE = 10;

const communityTypeIcons = {
  general: Globe,
  study_help: BookOpen,
  interest: Sparkles,
  gaming: Gamepad2,
  tech: Code,
  creative: Palette,
};

const CommunityDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [membership, setMembership] = useState<CommunityMember | null>(null);
  const [rules, setRules] = useState<CommunityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [userVotes, setUserVotes] = useState<Map<string, -1 | 1>>(new Map());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isModerator = membership?.role === 'owner' || membership?.role === 'moderator';

  useEffect(() => {
    if (slug) {
      fetchCommunity();
    }
  }, [slug, user]);

  const fetchCommunity = async () => {
    setPage(0);
    setHasMore(true);

    const { data: communityData } = await supabase
      .from("communities")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!communityData) {
      navigate("/communities");
      return;
    }

    setCommunity(communityData as Community);

    // Fetch initial posts
    await fetchPostsForCommunity(communityData.id, 0, true, communityData);

    // Check membership
    if (user) {
      const { data: memberData } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", communityData.id)
        .eq("user_id", user.id)
        .maybeSingle();

      setMembership(memberData as CommunityMember | null);

      // Fetch user votes and saved posts
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

    // Fetch community rules
    const { data: rulesData } = await supabase
      .from("community_rules")
      .select("*")
      .eq("community_id", communityData.id)
      .order("rule_number", { ascending: true });

    if (rulesData) {
      setRules(rulesData as CommunityRule[]);
    }

    setLoading(false);
  };

  const fetchPostsForCommunity = async (
    communityId: string, 
    pageNum: number, 
    isInitial: boolean,
    communityInfo?: { name: string; slug: string }
  ) => {
    if (!isInitial) {
      setLoadingMore(true);
    }

    const { data: postsData } = await supabase
      .from("posts")
      .select(`*, profiles:user_id (full_name, username, avatar_url)`)
      .eq("community_id", communityId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (postsData) {
      const comm = communityInfo || community;
      const transformed = postsData.map((p: any) => ({
        ...p,
        profiles: p.profiles || null,
        community: comm ? { name: comm.name, slug: comm.slug } : null
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

  const handleJoin = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const { error } = await supabase.from("community_members").insert({
      community_id: community!.id,
      user_id: user.id,
      role: "member",
    });

    if (!error) {
      toast({ title: "Joined!", description: `Welcome to c/${slug}` });
      fetchCommunity();
    }
  };

  const handleLeave = async () => {
    if (!user || !membership) return;

    await supabase
      .from("community_members")
      .delete()
      .eq("community_id", community!.id)
      .eq("user_id", user.id);

    toast({ title: "Left community" });
    setMembership(null);
    fetchCommunity();
  };

  const handleVote = async (postId: string, voteType: 1 | -1) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const currentVote = userVotes.get(postId);

    if (currentVote === voteType) {
      await supabase.from("post_votes").delete().eq("post_id", postId).eq("user_id", user.id);
      setUserVotes((prev) => { const next = new Map(prev); next.delete(postId); return next; });
    } else if (currentVote) {
      await supabase.from("post_votes").update({ vote_type: voteType }).eq("post_id", postId).eq("user_id", user.id);
      setUserVotes((prev) => new Map(prev).set(postId, voteType));
    } else {
      await supabase.from("post_votes").insert({ post_id: postId, user_id: user.id, vote_type: voteType });
      setUserVotes((prev) => new Map(prev).set(postId, voteType));
    }

    fetchCommunity();
  };

  const handleToggleSave = async (postId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

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

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && community) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPostsForCommunity(community.id, nextPage, false);
    }
  }, [loadingMore, hasMore, page, community]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!community) return null;

  const Icon = communityTypeIcons[community.community_type] || Globe;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-12">
        {/* Banner */}
        <div 
          className="h-24 sm:h-32 bg-primary relative mt-0"
          style={community.banner_url ? {
            backgroundImage: `url(${community.banner_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        >
          {!community.banner_url && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/80 dark:from-primary dark:via-primary/95 dark:to-primary/90" />
          )}
        </div>

        <div className="container mx-auto px-4">
          <div className="flex gap-6 max-w-6xl mx-auto">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Community Header Card */}
              <Card className="-mt-4 mb-4 relative z-10">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-card border-4 border-card -mt-10 flex items-center justify-center shadow-lg relative z-20">
                      {community.icon_url ? (
                        <img 
                          src={community.icon_url} 
                          alt={community.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Icon className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h1 className="text-2xl font-bold text-foreground">
                            {community.name}
                          </h1>
                          <p className="text-sm text-muted-foreground">c/{community.slug}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {isModerator && (
                            <>
                              <CommunitySettings community={community} onUpdate={fetchCommunity}>
                                <Button variant="outline" size="icon">
                                  <Settings className="w-4 h-4" />
                                </Button>
                              </CommunitySettings>
                              <ModeratorPanel communityId={community.id}>
                                <Button variant="outline" size="icon">
                                  <Shield className="w-4 h-4" />
                                </Button>
                              </ModeratorPanel>
                            </>
                          )}
                          {membership ? (
                            <>
                              <CreatePostDialog 
                                communityId={community.id} 
                                communitySlug={community.slug}
                                onPostCreated={fetchCommunity}
                              >
                                <Button>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Create Post
                                </Button>
                              </CreatePostDialog>
                              {membership.role !== 'owner' && (
                                <Button variant="outline" onClick={handleLeave}>
                                  Joined
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button onClick={handleJoin}>
                              Join
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="posts">
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
                        value="chat" 
                        className="gap-1.5 data-[state=active]:bg-secondary rounded-full px-4"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Chat
                      </TabsTrigger>
                    </TabsList>
                  </CardContent>
                </Card>

                <TabsContent value="posts" className="mt-0 space-y-3">
                  {posts.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No posts yet. Be the first!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          userVote={userVotes.get(post.id) || null}
                          onVote={handleVote}
                          isModerator={isModerator}
                          onModAction={fetchCommunity}
                          isSaved={savedPostIds.has(post.id)}
                          onToggleSave={handleToggleSave}
                        />
                      ))}
                      <InfiniteScrollTrigger
                        onTrigger={loadMore}
                        loading={loadingMore}
                        hasMore={hasMore}
                      />
                    </>
                  )}
                </TabsContent>

                <TabsContent value="chat" className="mt-0">
                  {membership ? (
                    <ChatRoom communityId={community.id} className="h-[500px]" />
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">Join the community to access chat</p>
                        <Button onClick={handleJoin}>Join Community</Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="w-80 hidden lg:block shrink-0 space-y-4 pt-8">
              {/* About Community */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">About Community</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {community.description && (
                    <p className="text-sm text-muted-foreground">
                      {community.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Created {new Date(community.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-center">
                      <div>
                        <p className="font-bold text-lg">{community.member_count.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Members</p>
                      </div>
                      <div>
                        <p className="font-bold text-lg">{posts.length}</p>
                        <p className="text-xs text-muted-foreground">Posts</p>
                      </div>
                    </div>
                  </div>
                  {membership && (
                    <CreatePostDialog 
                      communityId={community.id} 
                      communitySlug={community.slug}
                      onPostCreated={fetchCommunity}
                    >
                      <Button className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Post
                      </Button>
                    </CreatePostDialog>
                  )}
                </CardContent>
              </Card>

              {/* Rules */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Community Rules</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {rules.length > 0 ? (
                    <ol className="text-sm text-muted-foreground space-y-2">
                      {rules.map((rule) => (
                        <li key={rule.id} className="flex gap-2">
                          <span className="font-semibold text-foreground shrink-0">{rule.rule_number}.</span>
                          <div>
                            <span className="text-foreground">{rule.title}</span>
                            {rule.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">No rules set yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CommunityDetail;
