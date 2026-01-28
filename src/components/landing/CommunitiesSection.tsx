import { Button } from "@/components/ui/button";
import { Users, ArrowRight, BookOpen, Code, Briefcase, Beaker, Scale, Palette, Gamepad2, Rocket } from "lucide-react";

const societies = [
  { name: "Computer Science", members: "12.4K", icon: Code, color: "from-blue-500 to-cyan-500" },
  { name: "Medicine & Health", members: "8.2K", icon: Beaker, color: "from-emerald-500 to-teal-500" },
  { name: "Business & Finance", members: "9.1K", icon: Briefcase, color: "from-amber-500 to-orange-500" },
  { name: "Law & Politics", members: "5.8K", icon: Scale, color: "from-purple-500 to-pink-500" },
  { name: "Art & Design", members: "6.3K", icon: Palette, color: "from-pink-500 to-rose-500" },
  { name: "AI & Machine Learning", members: "7.9K", icon: Rocket, color: "from-indigo-500 to-purple-500" },
  { name: "Gaming & Esports", members: "4.5K", icon: Gamepad2, color: "from-red-500 to-orange-500" },
  { name: "Research & Academia", members: "3.2K", icon: BookOpen, color: "from-teal-500 to-emerald-500" },
];

const CommunitiesSection = () => {
  return (
    <section id="communities" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent font-medium text-sm mb-4">
            <Users className="w-4 h-4" />
            Thriving Communities
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
            Find Your{" "}
            <span className="text-gradient">Tribe</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Join societies based on your degree, interests, or academic goals. Connect with like-minded students across universities.
          </p>
        </div>
        
        {/* Societies Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {societies.map((society, index) => (
            <div
              key={society.name}
              className="group relative bg-card rounded-2xl border border-border p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden"
            >
              {/* Gradient Overlay on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${society.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
              
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${society.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <society.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {society.name}
                </h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{society.members} members</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* CTA */}
        <div className="text-center">
          <Button variant="outline" size="lg" className="group">
            Explore All Societies
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CommunitiesSection;
