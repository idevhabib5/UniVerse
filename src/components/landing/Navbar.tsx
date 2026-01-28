import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Menu, 
  X, 
  Search, 
  Plus,
  Home,
  Users,
  TrendingUp,
  LogIn,
  UserPlus,
  Sun,
  Moon,
  MessageCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import DirectMessageSheet from "@/components/chat/DirectMessageSheet";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, profile } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-12 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">U</span>
            </div>
            <span className="text-lg font-display font-bold text-foreground hidden sm:block">
              universe
            </span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search UniVerse"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary border-0 h-9 focus-visible:ring-1"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <Link to="/communities">
                <Home className="w-4 h-4" />
                <span className="hidden lg:inline">Home</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <Link to="/communities">
                <Users className="w-4 h-4" />
                <span className="hidden lg:inline">Communities</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden lg:inline">Popular</span>
            </Button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>

            {user ? (
              <>
                <NotificationDropdown />
                <DirectMessageSheet>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MessageCircle className="w-5 h-5" />
                  </Button>
                </DirectMessageSheet>
                <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9">
                  <Plus className="w-5 h-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 px-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {getInitials(profile?.full_name || profile?.username)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden lg:block text-sm font-medium max-w-[100px] truncate">
                        {profile?.username || profile?.full_name || "User"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth" className="gap-2">
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Log In</span>
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/auth" className="gap-2">
                    <UserPlus className="w-4 h-4 sm:hidden" />
                    <span className="hidden sm:inline">Sign Up</span>
                  </Link>
                </Button>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-3 border-t border-border animate-slide-up">
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search UniVerse"
                  className="pl-9 bg-secondary border-0"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button variant="ghost" className="justify-start" asChild>
                <Link to="/communities" onClick={() => setIsOpen(false)}>
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild>
                <Link to="/communities" onClick={() => setIsOpen(false)}>
                  <Users className="w-4 h-4 mr-2" />
                  Communities
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                Popular
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
