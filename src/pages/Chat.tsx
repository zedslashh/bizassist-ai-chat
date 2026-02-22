import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Send, Loader2, Bot, PhoneCall, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const isEscalationMessage = (content: string) =>
  content.includes("connect with a live agent") ||
  content.includes("நேரடி முகவருடன் இணைய") ||
  content.includes("live agent") ||
  content.includes("further assistance");

const Chat = () => {
  const location = useLocation();
  const { orgName = "BizAssistAI", languages = ["english"], vertical = "" } = location.state || {};
  const [input, setInput] = useState("");
  const { messages, loading, sendMessage, conversationId } = useChat(orgName, languages[0], vertical);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Escalation state
  const [escalationStep, setEscalationStep] = useState<"idle" | "choose" | "input" | "submitting" | "done">("idle");
  const [contactType, setContactType] = useState<"email" | "phone" | null>(null);
  const [contactValue, setContactValue] = useState("");
  const [ticketId, setTicketId] = useState<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, escalationStep]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const messageText = input;
    setInput("");
    await sendMessage(messageText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConnectToAgent = () => {
    setEscalationStep("choose");
  };

  const handleContactTypeSelect = (type: "email" | "phone") => {
    setContactType(type);
    setEscalationStep("input");
    setContactValue("");
  };

  const handleSubmitContact = async () => {
    if (!contactValue.trim() || !contactType || !conversationId) return;

    // Basic validation
    if (contactType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (contactType === "phone" && !/^[\d\s+()-]{7,20}$/.test(contactValue)) {
      toast({ title: "Invalid phone", description: "Please enter a valid phone number.", variant: "destructive" });
      return;
    }

    setEscalationStep("submitting");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get the last user question as query summary
      const lastUserMsg = [...messages].reverse().find(m => m.role === "user");

      const { data, error } = await supabase.from("support_tickets").insert({
        conversation_id: conversationId,
        org_id: orgName,
        domain: vertical,
        user_id: user?.id,
        contact_type: contactType,
        contact_value: contactValue.trim(),
        query_summary: lastUserMsg?.content || "General inquiry",
      }).select("id").single();

      if (error) throw error;

      setTicketId(data.id);
      setEscalationStep("done");

      // Add a bot message about the ticket
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "bot",
        content: `I've created ticket #${data.id}. Our team will contact you shortly via ${contactType}.`,
        language: languages[0],
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({ title: "Error", description: "Failed to create support ticket. Please try again.", variant: "destructive" });
      setEscalationStep("choose");
    }
  };

  return (
    <div className="min-h-screen gradient-hero">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">{orgName}</h1>
          </div>
          <p className="text-muted-foreground">AI-powered assistant ready to help</p>
        </div>

        {/* Chat Container */}
        <Card className="h-[600px] flex flex-col shadow-xl">
          {/* Messages */}
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] p-4 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === "bot" && isEscalationMessage(msg.content) && escalationStep === "idle" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-2"
                        onClick={handleConnectToAgent}
                      >
                        <PhoneCall className="h-3 w-3" />
                        Connect to Agent
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Escalation flow - inline in chat */}
              {escalationStep === "choose" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                  <div className="max-w-[75%] p-4 rounded-2xl bg-muted space-y-3">
                    <p className="text-sm font-medium">How would you like us to reach you?</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => handleContactTypeSelect("email")}>
                        <Mail className="h-3 w-3" /> Email
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => handleContactTypeSelect("phone")}>
                        <Phone className="h-3 w-3" /> Phone
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {escalationStep === "input" && contactType && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                  <div className="max-w-[75%] p-4 rounded-2xl bg-muted space-y-3">
                    <p className="text-sm">Please enter your {contactType === "email" ? "email address" : "phone number"}:</p>
                    <div className="flex gap-2">
                      <Input
                        value={contactValue}
                        onChange={(e) => setContactValue(e.target.value)}
                        placeholder={contactType === "email" ? "you@example.com" : "+1 234 567 8900"}
                        type={contactType === "email" ? "email" : "tel"}
                        className="flex-1 text-sm"
                        onKeyDown={(e) => { if (e.key === "Enter") handleSubmitContact(); }}
                      />
                      <Button size="sm" onClick={handleSubmitContact} disabled={!contactValue.trim()}>
                        Submit
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {escalationStep === "submitting" && (
                <div className="flex justify-start">
                  <div className="bg-muted p-4 rounded-2xl flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Creating support ticket...</span>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-4 rounded-2xl">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-6 border-t">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                size="icon"
                className="h-10 w-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Chat;
