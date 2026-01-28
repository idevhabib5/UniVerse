import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
  Plus,
  Search,
  Clock,
  Eye,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Timer,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  solutions?: { count: number }[];
}

const difficultyColors = {
  easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  hard: "bg-orange-100 text-orange-700 border-orange-200",
  expert: "bg-red-100 text-red-700 border-red-200",
};

const statusIcons = {
  open: <AlertCircle className="w-4 h-4" />,
  in_progress: <Timer className="w-4 h-4" />,
  solved: <CheckCircle2 className="w-4 h-4" />,
};

const statusColors = {
  open: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-purple-100 text-purple-700 border-purple-200",
  solved: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const Problems = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("problems")
      .select(`
        *,
        profiles:user_id (full_name, username),
        solutions (count)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching problems:", error);
      setProblems([]);
    } else {
      // Transform data to match expected interface
      const transformed = (data || []).map((item: any) => ({
        ...item,
        profiles: item.profiles || null,
        solutions: item.solutions || []
      }));
      setProblems(transformed);
    }
    setLoading(false);
  };

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch =
      problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.subject.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDifficulty =
      difficultyFilter === "all" || problem.difficulty === difficultyFilter;

    const matchesStatus =
      statusFilter === "all" || problem.status === statusFilter;

    const matchesSubject =
      subjectFilter === "all" ||
      problem.subject.toLowerCase() === subjectFilter.toLowerCase();

    return matchesSearch && matchesDifficulty && matchesStatus && matchesSubject;
  });

  const subjects = [...new Set(problems.map((p) => p.subject))];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Problem Hub
              </h1>
              <p className="text-muted-foreground mt-2">
                Browse problems or post your own to get help from the community
              </p>
            </div>
            <Button
              variant="hero"
              onClick={() => {
                if (!user) {
                  navigate("/auth");
                } else {
                  navigate("/problems/new");
                }
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Post a Problem
            </Button>
          </div>

          {/* Filters */}
          <div className="bg-card rounded-xl border border-border p-4 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search problems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="solved">Solved</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject.toLowerCase()}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Problems List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No problems found
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || difficultyFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Be the first to post a problem!"}
              </p>
              {user && (
                <Button variant="hero" onClick={() => navigate("/problems/new")}>
                  <Plus className="w-5 h-5 mr-2" />
                  Post a Problem
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProblems.map((problem) => (
                <Card
                  key={problem.id}
                  className="hover:shadow-lg transition-all duration-300 hover:border-primary/20 cursor-pointer"
                  onClick={() => navigate(`/problems/${problem.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={statusColors[problem.status]}
                          >
                            {statusIcons[problem.status]}
                            <span className="ml-1 capitalize">{problem.status.replace("_", " ")}</span>
                          </Badge>
                          <Badge
                            variant="outline"
                            className={difficultyColors[problem.difficulty]}
                          >
                            {problem.difficulty}
                          </Badge>
                          <Badge variant="secondary">{problem.subject}</Badge>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-1">
                          {problem.title}
                        </h3>
                        
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                          {problem.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDistanceToNow(new Date(problem.created_at), { addSuffix: true })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {problem.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            {problem.solutions?.[0]?.count || 0} solutions
                          </span>
                          {problem.deadline && (
                            <span className="flex items-center gap-1 text-accent">
                              <Timer className="w-4 h-4" />
                              Due {formatDistanceToNow(new Date(problem.deadline), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="lg:text-right">
                        <p className="text-sm text-muted-foreground">
                          Posted by{" "}
                          <span className="font-medium text-foreground">
                            {problem.is_anonymous
                              ? "Anonymous"
                              : problem.profiles?.full_name || problem.profiles?.username || "User"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Problems;
