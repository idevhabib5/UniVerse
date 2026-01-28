import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Navbar from "@/components/landing/Navbar";
import { ArrowLeft, CalendarIcon, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const subjects = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Medicine",
  "Law",
  "Business",
  "Economics",
  "Engineering",
  "Psychology",
  "Philosophy",
  "Literature",
  "History",
  "Art & Design",
  "Music",
  "Other",
];

const problemSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters").max(200, "Title must be less than 200 characters"),
  description: z.string().min(50, "Description must be at least 50 characters").max(5000, "Description must be less than 5000 characters"),
  subject: z.string().min(1, "Please select a subject"),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
});

const NewProblem = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "expert">("medium");
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const addTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const validateForm = () => {
    const result = problemSchema.safeParse({
      title,
      description,
      subject,
      difficulty,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("problems")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        subject,
        difficulty,
        deadline: deadline?.toISOString() || null,
        tags,
        is_anonymous: isAnonymous,
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to post problem. Please try again.",
      });
      console.error("Error posting problem:", error);
    } else {
      toast({
        title: "Problem posted!",
        description: "Your problem has been posted successfully.",
      });
      navigate(`/problems/${data.id}`);
    }
    
    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate("/problems")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Problems
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-display">Post a Problem</CardTitle>
              <CardDescription>
                Describe your problem clearly to get the best solutions from the community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Problem Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., How to implement binary search in Python?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={errors.title ? "border-destructive" : ""}
                    maxLength={200}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{title.length}/200 characters</p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide as much detail as possible about your problem. Include what you've tried, error messages, and any relevant context..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={cn("min-h-[200px]", errors.description ? "border-destructive" : "")}
                    maxLength={5000}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{description.length}/5000 characters</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Subject */}
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger className={errors.subject ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.subject && (
                      <p className="text-sm text-destructive">{errors.subject}</p>
                    )}
                  </div>

                  {/* Difficulty */}
                  <div className="space-y-2">
                    <Label>Difficulty Level *</Label>
                    <Select value={difficulty} onValueChange={(v: "easy" | "medium" | "hard" | "expert") => setDifficulty(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Deadline */}
                <div className="space-y-2">
                  <Label>Deadline (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !deadline && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {deadline ? format(deadline, "PPP") : "Set a deadline"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={deadline}
                        onSelect={setDeadline}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {deadline && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeadline(undefined)}
                    >
                      Clear deadline
                    </Button>
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags (Optional, max 5)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag and press Enter"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={tags.length >= 5}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addTag}
                      disabled={tags.length >= 5}
                    >
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Anonymous Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div>
                    <Label htmlFor="anonymous" className="font-medium">
                      Post Anonymously
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Your name won't be shown with this problem
                    </p>
                  </div>
                  <Switch
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                  />
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    "Post Problem"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default NewProblem;
