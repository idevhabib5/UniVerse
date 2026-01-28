import { 
  MessageSquare, 
  Users, 
  Lightbulb, 
  Bell, 
  Shield, 
  Zap,
  FileText,
  Code,
  Star
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Reddit-Style Discussions",
    description: "Post questions, share resources, and engage in threaded conversations with upvotes and nested replies.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Zap,
    title: "Real-Time Chat",
    description: "Discord-style chat rooms for instant messaging within societies. Share files, react with emojis, and stay connected.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: Users,
    title: "Cross-University Societies",
    description: "Join degree-based or interest-based communities that span multiple universities. CS, Medicine, AI, Startups & more.",
    color: "bg-success/10 text-success",
  },
  {
    icon: Lightbulb,
    title: "Problem & Solution Hub",
    description: "Post structured problems with deadlines. Get multiple solutions and mark the best one to help others.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: Code,
    title: "Code & LaTeX Support",
    description: "Syntax highlighting for code snippets and LaTeX support for mathematical equations and formulas.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Stay updated with replies, solutions, and announcements. Never miss important discussions.",
    color: "bg-amber-100 text-amber-600",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/50 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4">
            <Star className="w-4 h-4" />
            Powerful Features
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
            Everything You Need to{" "}
            <span className="text-gradient">Collaborate</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Combining the best of Reddit discussions and Discord chats, tailored specifically for university students.
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group bg-card rounded-2xl border border-border p-6 hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-3 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
