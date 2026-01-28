import { UserPlus, Search, MessageCircle, Trophy } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Profile",
    description: "Sign up with your university email. Add your degree, interests, and customize your profile.",
  },
  {
    number: "02",
    icon: Search,
    title: "Join Societies",
    description: "Browse degree-based and interest-based communities. Join as many as you like!",
  },
  {
    number: "03",
    icon: MessageCircle,
    title: "Start Collaborating",
    description: "Post questions, share resources, or just chat. Real-time messaging keeps everyone connected.",
  },
  {
    number: "04",
    icon: Trophy,
    title: "Earn Recognition",
    description: "Your best solutions get marked and appreciated. Build your reputation across universities.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success font-medium text-sm mb-4">
            Simple & Intuitive
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
            Get Started in{" "}
            <span className="text-gradient">Minutes</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            No complicated setup. Just sign up and start connecting with students across universities.
          </p>
        </div>
        
        {/* Steps */}
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="relative group"
              >
                {/* Connector Line */}
                {index < steps.length - 1 && index % 2 === 0 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border" />
                )}
                
                <div className="bg-card rounded-2xl border border-border p-8 hover:shadow-xl hover:border-primary/20 transition-all duration-300 h-full">
                  {/* Number Badge */}
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-5xl font-display font-bold text-primary/20 group-hover:text-primary/40 transition-colors">
                      {step.number}
                    </span>
                    <div className="w-14 h-14 rounded-xl bg-gradient-hero flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-display font-semibold mb-3 text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
