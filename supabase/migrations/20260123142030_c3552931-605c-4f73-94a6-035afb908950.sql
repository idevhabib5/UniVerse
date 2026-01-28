-- Create enum for difficulty levels
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard', 'expert');

-- Create enum for problem status
CREATE TYPE public.problem_status AS ENUM ('open', 'in_progress', 'solved');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  university TEXT,
  degree TEXT,
  year_of_study INTEGER,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create problems table
CREATE TABLE public.problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  subject TEXT NOT NULL,
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  deadline TIMESTAMP WITH TIME ZONE,
  status problem_status NOT NULL DEFAULT 'open',
  tags TEXT[] DEFAULT '{}',
  is_anonymous BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create solutions table
CREATE TABLE public.solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_best_solution BOOLEAN DEFAULT FALSE,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create upvotes table for solutions
CREATE TABLE public.solution_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES public.solutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(solution_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_upvotes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Problems policies
CREATE POLICY "Problems are viewable by everyone"
ON public.problems FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create problems"
ON public.problems FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own problems"
ON public.problems FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own problems"
ON public.problems FOR DELETE
USING (auth.uid() = user_id);

-- Solutions policies
CREATE POLICY "Solutions are viewable by everyone"
ON public.solutions FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create solutions"
ON public.solutions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own solutions"
ON public.solutions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own solutions"
ON public.solutions FOR DELETE
USING (auth.uid() = user_id);

-- Solution upvotes policies
CREATE POLICY "Upvotes are viewable by everyone"
ON public.solution_upvotes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can upvote"
ON public.solution_upvotes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own upvotes"
ON public.solution_upvotes FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_problems_updated_at
  BEFORE UPDATE ON public.problems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solutions_updated_at
  BEFORE UPDATE ON public.solutions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to increment solution upvotes
CREATE OR REPLACE FUNCTION public.increment_solution_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.solutions SET upvotes = upvotes + 1 WHERE id = NEW.solution_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement solution upvotes
CREATE OR REPLACE FUNCTION public.decrement_solution_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.solutions SET upvotes = upvotes - 1 WHERE id = OLD.solution_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for upvote count
CREATE TRIGGER on_solution_upvote
  AFTER INSERT ON public.solution_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_solution_upvotes();

CREATE TRIGGER on_solution_downvote
  AFTER DELETE ON public.solution_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_solution_upvotes();

-- Create indexes for better performance
CREATE INDEX idx_problems_user_id ON public.problems(user_id);
CREATE INDEX idx_problems_status ON public.problems(status);
CREATE INDEX idx_problems_subject ON public.problems(subject);
CREATE INDEX idx_problems_difficulty ON public.problems(difficulty);
CREATE INDEX idx_problems_created_at ON public.problems(created_at DESC);
CREATE INDEX idx_solutions_problem_id ON public.solutions(problem_id);
CREATE INDEX idx_solutions_user_id ON public.solutions(user_id);