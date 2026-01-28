import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Computer Science, MIT",
    avatar: "SC",
    content: "UniVerse helped me connect with CS students from Stanford and CMU. We collaborated on a project that won a hackathon! The problem-solution feature is incredible.",
    rating: 5,
  },
  {
    name: "James Okonkwo",
    role: "Medicine, Oxford",
    avatar: "JO",
    content: "Finally, a platform where I can discuss medical cases with students globally. The moderation keeps discussions professional and valuable.",
    rating: 5,
  },
  {
    name: "Emma Rodriguez",
    role: "Business, Harvard",
    avatar: "ER",
    content: "The society chats feel like having study groups 24/7. I've learned more from peers here than some of my classes. Highly recommend!",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4">
            <Star className="w-4 h-4 fill-current" />
            Student Stories
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
            Loved by Students{" "}
            <span className="text-gradient">Worldwide</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Hear from students who have transformed their academic journey with UniVerse.
          </p>
        </div>
        
        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="bg-card rounded-2xl border border-border p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative"
            >
              {/* Quote Icon */}
              <Quote className="absolute top-6 right-6 w-10 h-10 text-primary/10" />
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />
                ))}
              </div>
              
              {/* Content */}
              <p className="text-foreground mb-6 leading-relaxed relative z-10">
                "{testimonial.content}"
              </p>
              
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center text-white font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
