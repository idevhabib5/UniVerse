import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-hero opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.3)_100%)]" />
      
      {/* Floating Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-float" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl animate-float" style={{ animationDelay: "-3s" }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white font-medium text-sm mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            Join 50,000+ Students Today
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white mb-6">
            Ready to Transform Your Academic Journey?
          </h2>
          
          <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
            Connect with students from top universities worldwide. Share knowledge, solve problems together, and build lasting connections.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="glass" size="xl" className="group bg-white text-primary hover:bg-white/90">
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="glass" size="xl">
              Schedule a Demo
            </Button>
          </div>
          
          <p className="text-white/60 text-sm mt-6">
            No credit card required • Free forever for students
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
