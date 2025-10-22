import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Bot, Mail, Phone, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [authMode, setAuthMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleAuth = () => {
    setLoading(true);
    // Simulate Google auth
    setTimeout(() => {
      toast({
        title: "Success!",
        description: "Signed in with Google successfully",
      });
      navigate("/dashboard");
    }, 1500);
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    
    setTimeout(() => {
      toast({
        title: "Success!",
        description: "Signed in successfully",
      });
      navigate("/dashboard");
    }, 1500);
  };

  const handlePhoneAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    
    setTimeout(() => {
      toast({
        title: "OTP Sent!",
        description: "Check your phone for verification code",
      });
      // In real app, would navigate to OTP verification page
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-6">
      <div className="w-full max-w-md animate-scale-in">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
        </Button>

        <Card className="p-8 shadow-2xl border-2">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-2xl bg-primary/10">
                <Bot className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome to BizAssistAI</h1>
            <p className="text-muted-foreground">Sign in to access your dashboard</p>
          </div>

          {/* Google Sign In */}
          <Button
            onClick={handleGoogleAuth}
            variant="outline"
            className="w-full mb-6 h-12"
            disabled={loading}
          >
            <svg className="mr-2 w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Auth Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={authMode === "email" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setAuthMode("email")}
            >
              <Mail className="mr-2 w-4 h-4" /> Email
            </Button>
            <Button
              type="button"
              variant={authMode === "phone" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setAuthMode("phone")}
            >
              <Phone className="mr-2 w-4 h-4" /> Phone
            </Button>
          </div>

          {/* Email Form */}
          {authMode === "email" && (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-2"
                />
              </div>
              <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                {loading ? "Signing in..." : "Continue with Email"}
              </Button>
            </form>
          )}

          {/* Phone Form */}
          {authMode === "phone" && (
            <form onSubmit={handlePhoneAuth} className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="mt-2"
                />
              </div>
              <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
