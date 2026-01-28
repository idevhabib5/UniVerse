import { Button } from "@/components/ui/button";
import { ArrowRight, Users, MessageSquare, Trophy, Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-glow opacity-50" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              The Future of Student Collaboration
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
              Connect. Discuss.{" "}
              <span className="text-gradient">Solve Together.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8">
              UniVerse is the cross-university platform where students from different campuses collaborate, share knowledge, and solve problems together.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <Button variant="hero" size="lg" className="group">
                Join UniVerse Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg">
                Watch Demo
              </Button>
            </div>
            
            {/* Stats */}
            <div className="flex flex-wrap gap-8 justify-center lg:justify-start">
              <div className="text-center">
                <div className="text-3xl font-display font-bold text-foreground">50K+</div>
                <div className="text-sm text-muted-foreground">Active Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-display font-bold text-foreground">100+</div>
                <div className="text-sm text-muted-foreground">Universities</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-display font-bold text-foreground">10K+</div>
                <div className="text-sm text-muted-foreground">Problems Solved</div>
              </div>
            </div>
          </div>
          
          {/* Right Content - Hero Visual */}
          <div className="relative animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="relative z-10">
              {/* Main Chat Card */}
              <div className="bg-card rounded-2xl shadow-2xl border border-border p-6 mb-4 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">CS Society</div>
                    <div className="text-xs text-muted-foreground">234 members online</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex-shrink-0" />
                    <div className="bg-secondary rounded-xl rounded-tl-none p-3 text-sm">
                      Anyone knows how to optimize this recursive algorithm? 🤔
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="bg-primary text-primary-foreground rounded-xl rounded-tr-none p-3 text-sm">
                      Try using memoization! Here's an example...
                    </div>
                    <div className="w-8 h-8 rounded-full bg-success/20 flex-shrink-0" />
                  </div>
                </div>
              </div>
              
              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 bg-card rounded-xl shadow-lg border border-border p-4 transform -rotate-3 animate-float">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-sm">500+ Societies</span>
                </div>
              </div>
              
              <div className="absolute -bottom-2 -left-4 bg-card rounded-xl shadow-lg border border-border p-4 transform rotate-2 animate-float" style={{ animationDelay: "-2s" }}>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  <span className="font-semibold text-sm">Best Solution: +50 pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
