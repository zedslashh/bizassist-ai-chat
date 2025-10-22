import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, BarChart3, Globe, Zap, Shield, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold text-gradient">BizAssistAI</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")} className="gradient-primary">
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 gradient-hero">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered Business Assistant</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Transform Your Customer Support with{" "}
              <span className="text-gradient">Intelligent AI</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Build multilingual AI assistants for your business in minutes. Automate responses, analyze conversations, and delight your customers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="gradient-primary text-lg px-8 shadow-glow animate-pulse-glow"
              >
                Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose BizAssistAI?</h2>
            <p className="text-xl text-muted-foreground">Everything you need to power your customer support</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<MessageSquare className="w-10 h-10" />}
              title="Multilingual Support"
              description="Communicate with customers in English, Tamil, and more languages seamlessly."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-10 h-10" />}
              title="Real-time Analytics"
              description="Track conversations, response times, and customer satisfaction instantly."
            />
            <FeatureCard 
              icon={<Globe className="w-10 h-10" />}
              title="Easy Integration"
              description="Add AI chat to your website with a simple widget or landing page."
            />
            <FeatureCard 
              icon={<Zap className="w-10 h-10" />}
              title="Instant Setup"
              description="Get started in minutes with our intuitive document upload system."
            />
            <FeatureCard 
              icon={<Shield className="w-10 h-10" />}
              title="Secure & Private"
              description="Your data is encrypted and stored securely with enterprise-grade protection."
            />
            <FeatureCard 
              icon={<Bot className="w-10 h-10" />}
              title="Smart AI"
              description="Powered by advanced AI that learns from your documents and improves over time."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Support?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of businesses using BizAssistAI to deliver exceptional customer experiences
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="gradient-primary text-lg px-8 shadow-glow"
          >
            Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold">BizAssistAI</span>
            </div>
            <p className="text-muted-foreground">© 2025 BizAssistAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-slide-up">
    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

export default Index;
