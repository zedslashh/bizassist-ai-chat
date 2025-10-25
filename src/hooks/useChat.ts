import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Message {
  id?: string;
  role: "user" | "bot";
  content: string;
  language: string;
  escalated?: boolean;
  created_at?: string;
}

export interface Conversation {
  id: string;
  org_id: string;
  language: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useChat = (orgId: string, language: string = "english") => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Create or get conversation
  useEffect(() => {
    const initConversation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check for existing conversation
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("*")
          .eq("org_id", orgId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingConv) {
          setConversationId(existingConv.id);
          loadMessages(existingConv.id);
        } else {
          // Create new conversation
          const { data: newConv, error } = await supabase
            .from("conversations")
            .insert({
              org_id: orgId,
              user_id: user.id,
              language,
            })
            .select()
            .single();

          if (error) throw error;
          setConversationId(newConv.id);
          
          // Get greeting from backend
          try {
            const { data: greetingData } = await supabase.functions.invoke('get-greeting', {
              body: { org_id: orgId, lang: language }
            });
            let greeting = greetingData?.greeting || `Hello! Welcome to ${orgId}. How can I assist you today?`;
            
            // Filter out system prompts in English and Tamil
            const systemPromptPatterns = [
              /நீங்கள் ஒரு மொழிபெயர்ப்பு உதவியாளர்.*?2023 வரை.*?\./s,
              /you are a translation assistant.*?october 2023\./is,
              /you are an? (ai|assistant|chatbot)/i,
              /system:/i,
              /instruction:/i,
              /translate.*?below.*?text/i
            ];
            
            for (const pattern of systemPromptPatterns) {
              greeting = greeting.replace(pattern, '').trim();
            }
            
            // Remove any remaining newlines and extra spaces
            greeting = greeting.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
            
            // If greeting becomes empty after filtering, use default
            if (!greeting || greeting.length < 5) {
              greeting = language === 'tamil' 
                ? `வணக்கம்! ${orgId} க்கு வரவேற்கிறோம். நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`
                : `Hello! Welcome to ${orgId}. How can I assist you today?`;
            }
            
            await addBotMessage(newConv.id, greeting, language);
          } catch (err) {
            console.error("Error fetching greeting:", err);
            const fallbackGreeting = language === 'tamil'
              ? `வணக்கம்! ${orgId} க்கு வரவேற்கிறோம். நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`
              : `Hello! Welcome to ${orgId}. How can I assist you today?`;
            await addBotMessage(newConv.id, fallbackGreeting, language);
          }
        }
      } catch (error) {
        console.error("Error initializing conversation:", error);
      }
    };

    if (orgId) {
      initConversation();
    }
  }, [orgId, language]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const addBotMessage = async (convId: string, content: string, lang: string) => {
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: convId,
        role: "bot",
        content,
        language: lang,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error adding bot message:", error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!conversationId || !content.trim()) return;

    setLoading(true);
    try {
      // Save user message
      const { error: userMsgError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "user",
        content,
        language,
      });

      if (userMsgError) throw userMsgError;

      // Call backend via edge function
      const { data, error } = await supabase.functions.invoke('query-assistant', {
        body: {
          org_id: orgId,
          query: content,
          top_k: 4,
          lang: language,
        }
      });

      if (error) throw error;
      
      // Save bot response
      await addBotMessage(conversationId, data?.answer || "I couldn't find an answer.", language);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    conversationId,
  };
};
