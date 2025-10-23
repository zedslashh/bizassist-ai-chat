import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, CheckCircle, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import ChatWidget from "@/components/ChatWidget";
import { supabase } from "@/integrations/supabase/client";

const Generator = () => {
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [vertical, setVertical] = useState("");
  const [integration, setIntegration] = useState("widget");
  const [languages, setLanguages] = useState<string[]>(["english"]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const VERTICALS = ["supermarket", "travel", "finance", "beauty", "textile", "health"];

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
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to create an assistant",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Upload files via edge function
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

      setSuccess(true);
      toast({
        title: "Success!",
        description: "Your AI assistant has been created successfully",
      });

      // Navigate based on integration type
      if (integration === "landing") {
        navigate("/chat", { state: { orgName, languages } });
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
    setSuccess(false);
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

            {/* Integration Type */}
            <div className="space-y-2">
              <Label>Integration Type</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={integration === "widget" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setIntegration("widget")}
                >
                  Website Widget
                </Button>
                <Button
                  type="button"
                  variant={integration === "landing" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setIntegration("landing")}
                >
                  Landing Page
                </Button>
              </div>
            </div>

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

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="flex-1 gradient-primary"
                disabled={loading || success}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Creating Assistant...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="mr-2 w-4 h-4" />
                    Created Successfully!
                  </>
                ) : (
                  "Create Assistant"
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
          </form>

          {/* Chat Widget Preview */}
          {success && integration === "widget" && (
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
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Generator;
