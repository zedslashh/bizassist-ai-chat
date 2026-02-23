import { useState } from "react";
import { MessageCircle, X, Send, Loader2, PhoneCall, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface ChatWidgetProps {
  orgName: string;
  language?: string;
  domain?: string;
}

const isEscalationMessage = (content: string) =>
  content.includes("connect with a live agent") ||
  content.includes("நேரடி முகவருடன் இணைய") ||
  content.includes("live agent") ||
  content.includes("further assistance");

const ChatWidget = ({ orgName, language = "english", domain = "" }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, loading, sendMessage, conversationId } = useChat(orgName, language, domain);
  const { toast } = useToast();

  // Escalation state
  const [escalationStep, setEscalationStep] = useState<"idle" | "choose" | "input" | "submitting" | "done">("idle");
  const [contactType, setContactType] = useState<"email" | "phone" | null>(null);
  const [contactValue, setContactValue] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    const messageText = input;
    setInput("");
    await sendMessage(messageText);
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
      const lastUserMsg = [...messages].reverse().find(m => m.role === "user");

      const { data, error } = await supabase.from("support_tickets").insert({
        conversation_id: conversationId,
        org_id: orgName,
        domain,
        user_id: user?.id,
        contact_type: contactType,
        contact_value: contactValue.trim(),
        query_summary: lastUserMsg?.content || "General inquiry",
      }).select("id").single();

      if (error) throw error;

      setEscalationStep("done");

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "bot",
        content: `I've created ticket #${data.id}. Our team will contact you shortly via ${contactType}.`,
        language,
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({ title: "Error", description: "Failed to create support ticket. Please try again.", variant: "destructive" });
      setEscalationStep("choose");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isOpen ? (
          <motion.div
            key="chat-button"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-lg gradient-primary"
              size="icon"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card className="w-[380px] h-[500px] flex flex-col shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-primary/5">
                <div>
                  <h3 className="font-semibold">BizAssistAI</h3>
                  <p className="text-xs text-muted-foreground">{orgName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        {msg.role === "bot" && isEscalationMessage(msg.content) && escalationStep === "idle" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 gap-1 text-xs"
                            onClick={handleConnectToAgent}
                          >
                            <PhoneCall className="h-3 w-3" />
                            Connect to Agent
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Escalation flow */}
                  {escalationStep === "choose" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                      <div className="max-w-[80%] p-3 rounded-lg bg-muted space-y-2">
                        <p className="text-sm font-medium">How would you like us to reach you?</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleContactTypeSelect("email")}>
                            <Mail className="h-3 w-3" /> Email
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleContactTypeSelect("phone")}>
                            <Phone className="h-3 w-3" /> Phone
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {escalationStep === "input" && contactType && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                      <div className="max-w-[80%] p-3 rounded-lg bg-muted space-y-2">
                        <p className="text-xs">Enter your {contactType === "email" ? "email" : "phone number"}:</p>
                        <div className="flex gap-1">
                          <Input
                            value={contactValue}
                            onChange={(e) => setContactValue(e.target.value)}
                            placeholder={contactType === "email" ? "you@example.com" : "+1 234 567 8900"}
                            type={contactType === "email" ? "email" : "tel"}
                            className="flex-1 text-xs h-8"
                            onKeyDown={(e) => { if (e.key === "Enter") handleSubmitContact(); }}
                          />
                          <Button size="sm" className="h-8 text-xs" onClick={handleSubmitContact} disabled={!contactValue.trim()}>
                            Submit
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {escalationStep === "submitting" && (
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-xs text-muted-foreground">Creating ticket...</span>
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type your message..."
                    disabled={loading}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatWidget;
