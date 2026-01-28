import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import AuthLoadingSkeleton from "@/components/auth/AuthLoadingSkeleton";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Problems from "./pages/Problems";
import NewProblem from "./pages/NewProblem";
import ProblemDetail from "./pages/ProblemDetail";
import Communities from "./pages/Communities";
import CommunityDetail from "./pages/CommunityDetail";
import PostDetail from "./pages/PostDetail";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return <AuthLoadingSkeleton />;
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:userId" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/communities" element={<Communities />} />
      <Route path="/c/:slug" element={<CommunityDetail />} />
      <Route path="/c/:slug/post/:postId" element={<PostDetail />} />
      <Route path="/problems" element={<Problems />} />
      <Route path="/problems/new" element={<NewProblem />} />
      <Route path="/problems/:id" element={<ProblemDetail />} />
      {/* Secret admin route - only known to super admins */}
      <Route path="/ctrl-x9k7m2-admin" element={<SuperAdminDashboard />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
