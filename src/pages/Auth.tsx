import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, ArrowLeft, Loader2, Eye, EyeOff, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import PasswordStrengthIndicator, { isPasswordStrong } from "@/components/auth/PasswordStrengthIndicator";
import { supabase } from "@/integrations/supabase/client";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordLoginSchema = z.string().min(6, "Password must be at least 6 characters");
const passwordSignupSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character");

type AuthView = "login" | "signup" | "forgot" | "reset";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isRecovery = searchParams.get("type") === "recovery";
  
  const [view, setView] = useState<AuthView>(isRecovery ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  
  const { signIn, signUp, user, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && view !== "reset") {
      navigate("/problems");
    }
  }, [user, navigate, view]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string } = {};
    
    if (view !== "reset") {
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        newErrors.email = emailResult.error.errors[0].message;
      }
    }
    
    if (view === "login" || view === "signup" || view === "reset") {
      const passwordSchema = view === "login" ? passwordLoginSchema : passwordSignupSchema;
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
      
      if ((view === "signup" || view === "reset") && !isPasswordStrong(password)) {
        newErrors.password = "Password does not meet all strength requirements";
      }
      
      if ((view === "signup" || view === "reset") && password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      if (view === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Sign in failed",
            description: error.message === "Invalid login credentials" 
              ? "Invalid email or password. Please try again." 
              : error.message,
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You've successfully signed in.",
          });
        }
      } else if (view === "signup") {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            variant: "destructive",
            title: "Sign up failed",
            description: error.message.includes("already registered")
              ? "This email is already registered. Please sign in instead."
              : error.message,
          });
        } else {
          toast({
            title: "Welcome to UniVerse!",
            description: "Your account has been created successfully.",
          });
        }
      } else if (view === "forgot") {
        const { error } = await resetPassword(email);
        if (error) {
          toast({
            variant: "destructive",
            title: "Reset failed",
            description: error.message,
          });
        } else {
          setResetEmailSent(true);
        }
      } else if (view === "reset") {
        const { error } = await updatePassword(password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Password update failed",
            description: error.message,
          });
        } else {
          toast({
            title: "Password updated!",
            description: "Your password has been changed successfully.",
          });
          setView("login");
          setPassword("");
          setConfirmPassword("");
          navigate("/auth");
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setErrors({});
    setPassword("");
    setConfirmPassword("");
    setResetEmailSent(false);
  };

  const getTitle = () => {
    switch (view) {
      case "login": return "Welcome Back";
      case "signup": return "Create Account";
      case "forgot": return "Reset Password";
      case "reset": return "Set New Password";
    }
  };

  const getDescription = () => {
    switch (view) {
      case "login": return "Sign in to continue to UniVerse";
      case "signup": return "Join the student community today";
      case "forgot": return "Enter your email to receive a reset link";
      case "reset": return "Create a new secure password";
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-glow opacity-30" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Card className="border-border shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-hero flex items-center justify-center shadow-lg">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-display">
              {getTitle()}
            </CardTitle>
            <CardDescription>
              {getDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {view === "forgot" && resetEmailSent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Check your email</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
                <Button
                  variant="outline"
                  onClick={() => switchView("login")}
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {view === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                )}
                
                {view !== "reset" && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@university.edu"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: undefined });
                      }}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                )}
                
                {(view === "login" || view === "signup" || view === "reset") && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">{view === "reset" ? "New Password" : "Password"}</Label>
                      {view === "login" && (
                        <button
                          type="button"
                          onClick={() => switchView("forgot")}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors({ ...errors, password: undefined });
                        }}
                        className={errors.password ? "border-destructive pr-10" : "pr-10"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                    {(view === "signup" || view === "reset") && <PasswordStrengthIndicator password={password} />}
                  </div>
                )}
                
                {(view === "signup" || view === "reset") && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                        }}
                        className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                    {confirmPassword && password === confirmPassword && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        ✓ Passwords match
                      </p>
                    )}
                  </div>
                )}
                
                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {view === "login" && "Signing in..."}
                      {view === "signup" && "Creating account..."}
                      {view === "forgot" && "Sending reset link..."}
                      {view === "reset" && "Updating password..."}
                    </>
                  ) : (
                    <>
                      {view === "login" && "Sign In"}
                      {view === "signup" && "Create Account"}
                      {view === "forgot" && (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Reset Link
                        </>
                      )}
                      {view === "reset" && "Update Password"}
                    </>
                  )}
                </Button>
                
                {(view === "login" || view === "signup") && (
                  <>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    
                    <GoogleSignInButton />
                  </>
                )}
              </form>
            )}
            
            <div className="mt-6 text-center space-y-2">
              {view === "login" && (
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchView("signup")}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </p>
              )}
              {view === "signup" && (
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchView("login")}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              )}
              {view === "forgot" && !resetEmailSent && (
                <p className="text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => switchView("login")}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              )}
              {view === "reset" && (
                <p className="text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => switchView("login")}
                    className="text-primary hover:underline font-medium"
                  >
                    Back to Sign In
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
