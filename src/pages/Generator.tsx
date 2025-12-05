import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, CheckCircle, MessageCircle, CreditCard } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import ChatWidget from "@/components/ChatWidget";
import { supabase } from "@/integrations/supabase/client";

// Pricing info for display
const PRICING = {
  widget: { name: "Website Widget", price: "$9.99/month" },
  telegram: { name: "Telegram Bot", price: "$15.00/month" },
  landing: { name: "Landing Page", price: "$9.99/month" },
};

const Generator = () => {
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [vertical, setVertical] = useState("");
  const [integration, setIntegration] = useState<"widget" | "telegram" | "landing">("widget");
  const [languages, setLanguages] = useState<string[]>(["english"]);
  const [files, setFiles] = useState<File[]>([]);
  const [telegramBotUsername, setTelegramBotUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const VERTICALS = ["supermarket", "travel", "finance", "beauty", "textile", "health"];

  // Handle successful payment redirect
  useEffect(() => {
    const successParam = searchParams.get("success");
    const typeParam = searchParams.get("type") as "widget" | "telegram" | "landing" | null;
    const orgParam = searchParams.get("org");

    if (successParam === "true" && typeParam && orgParam) {
      setSuccess(true);
      setIntegration(typeParam);
      setOrgName(decodeURIComponent(orgParam));
      toast({
        title: "Payment Successful!",
        description: "Your subscription is active. Complete the setup below.",
      });
    }

    if (searchParams.get("canceled") === "true") {
      toast({
        title: "Payment Canceled",
        description: "Your subscription was not activated.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  const toggleLanguage = (lang: string) => {
    setLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleCheckout = async () => {
    if (!orgName) {
      toast({
        title: "Missing Information",
        description: "Please enter your organization name first",
        variant: "destructive",
      });
      return;
    }

    setCheckoutLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to subscribe",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { integrationType: integration, orgName },
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
      setCheckoutLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgName || files.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in organization name and upload at least one file",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to create an assistant",
          variant: "destructive",
        });
        setLoading(false);
        navigate("/auth");
        return;
      }

      const formData = new FormData();
      formData.append("org_id", orgName);
      files.forEach(file => formData.append("files", file));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-documents`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload files");
      }

      setLoading(false);
      setSuccess(true);
      toast({
        title: "Success!",
        description: "Your AI assistant has been created successfully",
      });

      if (integration === "landing") {
        navigate("/chat", { state: { orgName, languages } });
      } else if (integration === "telegram") {
        toast({
          title: "Telegram Bot Configured",
          description: `Send /start ${orgName} to your bot to begin chatting!`,
        });
      }
    } catch (error) {
      console.error("Error creating assistant:", error);
      toast({
        title: "Error",
        description: "Failed to create assistant. Make sure the backend server is running.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOrgName("");
    setEmail("");
    setVertical("");
    setIntegration("widget");
    setLanguages(["english"]);
    setFiles([]);
    setTelegramBotUsername("");
    setSuccess(false);
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create AI Assistant</h1>
          <p className="text-muted-foreground">Configure your business assistant in a few simple steps</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name *</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Enter your organization name"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@example.com"
              />
            </div>

            {/* Vertical */}
            <div className="space-y-2">
              <Label htmlFor="vertical">Business Vertical</Label>
              <Select value={vertical} onValueChange={setVertical}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {VERTICALS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Integration Type with Pricing */}
            <div className="space-y-2">
              <Label>Integration Type</Label>
              <div className="grid grid-cols-3 gap-4">
                {(Object.keys(PRICING) as Array<keyof typeof PRICING>).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={integration === type ? "default" : "outline"}
                    onClick={() => setIntegration(type)}
                    className="flex flex-col h-auto py-3"
                  >
                    <span>{PRICING[type].name}</span>
                    <span className="text-xs opacity-75">{PRICING[type].price}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Telegram Bot Username */}
            {integration === "telegram" && (
              <div className="space-y-2">
                <Label htmlFor="telegramBot">Telegram Bot Username *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">@</span>
                  <Input
                    id="telegramBot"
                    value={telegramBotUsername}
                    onChange={(e) => setTelegramBotUsername(e.target.value.replace("@", ""))}
                    placeholder="your_bot_username"
                    required={integration === "telegram"}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary underline">@BotFather</a> on Telegram and enter the username here
                </p>
              </div>
            )}

            {/* Languages */}
            <div className="space-y-2">
              <Label>Supported Languages</Label>
              <div className="flex gap-4">
                {["english", "tamil"].map((lang) => (
                  <Button
                    key={lang}
                    type="button"
                    variant={languages.includes(lang) ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => toggleLanguage(lang)}
                  >
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="files">Upload FAQ Documents *</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="files"
                  multiple
                  accept=".pdf,.docx,.csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="files" className="cursor-pointer">
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, CSV, TXT (max 20MB each)</p>
                </label>
              </div>
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span>{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subscribe Button */}
            <div className="pt-4 border-t">
              <Button
                type="button"
                onClick={handleCheckout}
                className="w-full gradient-primary"
                disabled={checkoutLoading || !orgName}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Starting Checkout...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 w-4 h-4" />
                    Subscribe to {PRICING[integration].name} - {PRICING[integration].price}
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                You'll be redirected to Stripe to complete your subscription
              </p>
            </div>

            {/* Create Assistant Button - only show after successful payment */}
            {success && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={loading || files.length === 0}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                        Creating Assistant...
                      </>
                    ) : (
                      "Complete Setup - Upload Documents"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </form>

          {/* Chat Widget Preview */}
          {success && integration === "widget" && files.length > 0 && (
            <div className="mt-8 p-6 border-t">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-success/10">
                  <MessageCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold">Chat Widget Active</h3>
                  <p className="text-sm text-muted-foreground">
                    Your AI assistant is ready to help! Click the chat button to test it.
                  </p>
                </div>
              </div>
              <ChatWidget orgName={orgName} language={languages[0]} />
            </div>
          )}

          {/* Telegram Bot Success */}
          {success && integration === "telegram" && files.length > 0 && (
            <div className="mt-8 p-6 border-t">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-success/10">
                  <MessageCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold">Telegram Bot Ready!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your AI assistant is connected to Telegram. Click the button below to start chatting.
                  </p>
                </div>
              </div>
              <a 
                href={`https://t.me/${telegramBotUsername}?start=${orgName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0088cc] text-white rounded-lg hover:bg-[#0077b5] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.015-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.154.234.169.362.015.128.035.367.02.567z"/>
                </svg>
                Open @{telegramBotUsername}
              </a>
              <p className="mt-3 text-sm text-muted-foreground">
                Or send <code className="bg-muted px-1 py-0.5 rounded">/start {orgName}</code> to your bot manually
              </p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Generator;
