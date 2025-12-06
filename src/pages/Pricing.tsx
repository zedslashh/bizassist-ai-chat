import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Bot, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PLANS = [
  {
    name: "Website Widget",
    price: "$9.99",
    period: "/month",
    description: "Add AI chat to your website with a floating widget",
    features: [
      "Embeddable chat widget",
      "Custom branding",
      "English & Tamil support",
      "Unlimited conversations",
      "Document-based responses",
      "Real-time analytics",
    ],
    type: "widget" as const,
  },
  {
    name: "Landing Page",
    price: "$9.99",
    period: "/month",
    description: "Full-page AI chat experience for your customers",
    features: [
      "Dedicated chat page",
      "Custom branding",
      "English & Tamil support",
      "Unlimited conversations",
      "Document-based responses",
      "Real-time analytics",
    ],
    type: "landing" as const,
    popular: true,
  },
  {
    name: "Telegram Bot",
    price: "$15.00",
    period: "/month",
    description: "AI assistant integrated with Telegram messenger",
    features: [
      "Telegram integration",
      "24/7 availability",
      "English & Tamil support",
      "Unlimited messages",
      "Document-based responses",
      "Real-time analytics",
    ],
    type: "telegram" as const,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planType: "widget" | "telegram" | "landing") => {
    setLoadingPlan(planType);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to subscribe",
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { integrationType: planType },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
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

      {/* Pricing Section */}
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your business needs. All plans include unlimited conversations and multilingual support.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan, index) => (
              <Card
                key={plan.type}
                className={`p-8 relative animate-slide-up ${
                  plan.popular ? "border-primary shadow-glow" : ""
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.type)}
                  className={`w-full ${plan.popular ? "gradient-primary" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                  disabled={loadingPlan === plan.type}
                >
                  {loadingPlan === plan.type ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Subscribe Now"
                  )}
                </Button>
              </Card>
            ))}
          </div>
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

export default Pricing;