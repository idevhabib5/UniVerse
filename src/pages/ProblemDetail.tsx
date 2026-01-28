import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
  ArrowLeft,
  Clock,
  Eye,
  Timer,
  ThumbsUp,
  CheckCircle2,
  AlertCircle,
  Crown,
  Loader2,
  Send,
  User,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Problem {
  id: string;
  title: string;
  description: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard" | "expert";
  status: "open" | "in_progress" | "solved";
  deadline: string | null;
  tags: string[];
  views: number;
  created_at: string;
  is_anonymous: boolean;
  user_id: string;
  profiles?: {
    full_name: string | null;
    username: string | null;
  } | null;
}

interface Solution {
  id: string;
  content: string;
  is_best_solution: boolean;
  upvotes: number;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
    username: string | null;
  } | null;
}

const difficultyColors = {
  easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  hard: "bg-orange-100 text-orange-700 border-orange-200",
  expert: "bg-red-100 text-red-700 border-red-200",
};

const statusColors = {
  open: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-purple-100 text-purple-700 border-purple-200",
  solved: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const ProblemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSolution, setNewSolution] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchProblem();
      fetchSolutions();
      if (user) {
        fetchUserUpvotes();
      }
      incrementViews();
    }
  }, [id, user]);

  const fetchProblem = async () => {
    const { data, error } = await supabase
      .from("problems")
      .select(`
        *,
        profiles:user_id (full_name, username)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      console.error("Error fetching problem:", error);
      navigate("/problems");
    } else {
      const transformed: Problem = {
        ...data,
        profiles: data.profiles || null
      };
      setProblem(transformed);
    }
    setLoading(false);
  };

  const fetchSolutions = async () => {
    const { data, error } = await supabase
      .from("solutions")
      .select(`
        *,
        profiles:user_id (full_name, username)
      `)
      .eq("problem_id", id)
      .order("is_best_solution", { ascending: false })
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: true });

    if (!error) {
      const transformed = (data || []).map((item: any) => ({
        ...item,
        profiles: item.profiles || null
      }));
      setSolutions(transformed);
    }
  };

  const fetchUserUpvotes = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("solution_upvotes")
      .select("solution_id")
      .eq("user_id", user.id);

    if (data) {
      setUserUpvotes(new Set(data.map((u) => u.solution_id)));
    }
  };

  const incrementViews = async () => {
    // Simple view increment - no RPC needed
    if (!id) return;
    await supabase
      .from("problems")
      .update({ views: (problem?.views || 0) + 1 })
      .eq("id", id);
  };

  const handleSubmitSolution = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (!newSolution.trim() || newSolution.trim().length < 20) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Solution must be at least 20 characters long.",
      });
      return;
    }
    
    setSubmitting(true);
    
    const { error } = await supabase
      .from("solutions")
      .insert({
        problem_id: id,
        user_id: user.id,
        content: newSolution.trim(),
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit solution. Please try again.",
      });
    } else {
      toast({
        title: "Solution submitted!",
        description: "Your solution has been posted.",
      });
      setNewSolution("");
      fetchSolutions();
      
      // Update problem status to in_progress if it was open
      if (problem?.status === "open") {
        await supabase
          .from("problems")
          .update({ status: "in_progress" })
          .eq("id", id);
        fetchProblem();
      }
    }
    
    setSubmitting(false);
  };

  const handleUpvote = async (solutionId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    const hasUpvoted = userUpvotes.has(solutionId);
    
    if (hasUpvoted) {
      // Remove upvote
      await supabase
        .from("solution_upvotes")
        .delete()
        .eq("solution_id", solutionId)
        .eq("user_id", user.id);
      
      setUserUpvotes((prev) => {
        const next = new Set(prev);
        next.delete(solutionId);
        return next;
      });
    } else {
      // Add upvote
      await supabase
        .from("solution_upvotes")
        .insert({ solution_id: solutionId, user_id: user.id });
      
      setUserUpvotes((prev) => new Set(prev).add(solutionId));
    }
    
    fetchSolutions();
  };

  const handleMarkBestSolution = async (solutionId: string) => {
    if (!user || user.id !== problem?.user_id) return;
    
    // Unmark all solutions first
    await supabase
      .from("solutions")
      .update({ is_best_solution: false })
      .eq("problem_id", id);
    
    // Mark this solution as best
    await supabase
      .from("solutions")
      .update({ is_best_solution: true })
      .eq("id", solutionId);
    
    // Update problem status to solved
    await supabase
      .from("problems")
      .update({ status: "solved" })
      .eq("id", id);
    
    toast({
      title: "Best solution marked!",
      description: "This problem has been marked as solved.",
    });
    
    fetchProblem();
    fetchSolutions();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!problem) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate("/problems")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Problems
          </Button>

          {/* Problem Card */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge
                  variant="outline"
                  className={statusColors[problem.status]}
                >
                  {problem.status === "solved" ? (
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mr-1" />
                  )}
                  <span className="capitalize">{problem.status.replace("_", " ")}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className={difficultyColors[problem.difficulty]}
                >
                  {problem.difficulty}
                </Badge>
                <Badge variant="secondary">{problem.subject}</Badge>
              </div>
              
              <CardTitle className="text-2xl md:text-3xl font-display">
                {problem.title}
              </CardTitle>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-4">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {problem.is_anonymous
                    ? "Anonymous"
                    : problem.profiles?.full_name || problem.profiles?.username || "User"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDistanceToNow(new Date(problem.created_at), { addSuffix: true })}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {problem.views} views
                </span>
                {problem.deadline && (
                  <span className="flex items-center gap-1 text-accent">
                    <Timer className="w-4 h-4" />
                    Due {format(new Date(problem.deadline), "PPP")}
                  </span>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                {problem.description}
              </div>
              
              {problem.tags && problem.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {problem.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Solutions Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-semibold">
                Solutions ({solutions.length})
              </h2>
            </div>

            {/* New Solution Form */}
            {problem.status !== "solved" && (
              <Card>
                <CardContent className="pt-6">
                  <Textarea
                    placeholder="Share your solution... Include code, explanations, and any resources that might help."
                    value={newSolution}
                    onChange={(e) => setNewSolution(e.target.value)}
                    className="min-h-[150px] mb-4"
                    maxLength={10000}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      {newSolution.length}/10000 characters
                    </p>
                    <Button
                      variant="hero"
                      onClick={handleSubmitSolution}
                      disabled={submitting || !newSolution.trim()}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Solution
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Solutions List */}
            {solutions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No solutions yet. Be the first to help!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {solutions.map((solution) => (
                  <Card
                    key={solution.id}
                    className={solution.is_best_solution ? "border-success ring-1 ring-success" : ""}
                  >
                    <CardContent className="pt-6">
                      {solution.is_best_solution && (
                        <div className="flex items-center gap-2 text-success font-medium mb-4">
                          <Crown className="w-5 h-5" />
                          Best Solution
                        </div>
                      )}
                      
                      <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap mb-4">
                        {solution.content}
                      </div>
                      
                      <Separator className="my-4" />
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            by{" "}
                            <span className="font-medium text-foreground">
                              {solution.profiles?.full_name || solution.profiles?.username || "User"}
                            </span>
                          </span>
                          <span>
                            {formatDistanceToNow(new Date(solution.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant={userUpvotes.has(solution.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleUpvote(solution.id)}
                          >
                            <ThumbsUp className="w-4 h-4 mr-1" />
                            {solution.upvotes}
                          </Button>
                          
                          {user?.id === problem.user_id && problem.status !== "solved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkBestSolution(solution.id)}
                              className="text-success hover:text-success"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Mark as Best
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProblemDetail;
