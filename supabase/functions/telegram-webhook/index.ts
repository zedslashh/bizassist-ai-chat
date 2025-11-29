import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const BACKEND_API_URL = Deno.env.get("BACKEND_API_URL");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramMessage {
  message?: {
    chat: {
      id: number;
      first_name?: string;
    };
    text?: string;
    from?: {
      language_code?: string;
    };
  };
}

async function sendTelegramMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  });
}

async function queryGemini(orgId: string, query: string, language: string = "english") {
  console.log(`Querying Gemini for org: ${orgId}, lang: ${language}`);
  
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    // Get context from backend
    let context = "";
    try {
      const contextResponse = await fetch(`${BACKEND_API_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          query: query,
          top_k: 4,
          lang: "english"
        }),
      });
      
      const contextData = await contextResponse.json();
      if (contextData.retrieved_docs && contextData.retrieved_docs.length > 0) {
        context = contextData.retrieved_docs
          .map((doc: any) => doc.doc)
          .join("\n\n");
      }
    } catch (error) {
      console.error('Error fetching context:', error);
    }

    const systemPrompt = language === "tamil"
      ? "நீங்கள் BizAssistAI. வழங்கப்பட்ட ஆவணங்களைப் பயன்படுத்தி சுருக்கமாக பதிலளிக்கவும்."
      : "You are BizAssistAI. Answer concisely using the provided documents.";

    const userPrompt = context
      ? `${systemPrompt}\n\nDOCUMENTS:\n${context}\n\nQUESTION:\n${query}`
      : `${systemPrompt}\n\nQUESTION:\n${query}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
  } catch (error) {
    console.error('Error querying Gemini:', error);
    throw error;
  }
}

async function getGreeting(orgId: string, language: string = "english") {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  try {
    const hour = new Date().getHours();
    let timeOfDay = "Good evening";
    if (hour >= 5 && hour < 12) {
      timeOfDay = "Good morning";
    } else if (hour >= 12 && hour < 18) {
      timeOfDay = "Good afternoon";
    }
    
    const englishGreeting = `${timeOfDay}! Welcome to ${orgId} 👋. How can I assist you today?`;
    
    if (language === "tamil" && GEMINI_API_KEY) {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: `Translate to Tamil: ${englishGreeting}` }]
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 256 }
          }),
        }
      );

      if (geminiResponse.ok) {
        const data = await geminiResponse.json();
        const tamilGreeting = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (tamilGreeting) return tamilGreeting.trim();
      }
    }
    
    return englishGreeting;
  } catch (error) {
    console.error('Error getting greeting:', error);
    return language === "tamil" 
      ? `வணக்கம்! ${orgId} க்கு வரவேற்கிறோம் 👋. நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`
      : `Hello! Welcome to ${orgId} 👋. How can I assist you today?`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: TelegramMessage = await req.json();
    console.log('Received webhook:', JSON.stringify(body));

    if (!body.message?.text || !body.message?.chat?.id) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chatId = body.message.chat.id;
    const userMessage = body.message.text;
    const userLanguage = body.message.from?.language_code?.includes('ta') ? 'tamil' : 'english';

    // Extract org_id from the message (you can customize this logic)
    // For now, we'll use a default or expect format like "/start orgname"
    let orgId = "default_org";
    
    if (userMessage.startsWith('/start')) {
      const parts = userMessage.split(' ');
      if (parts.length > 1) {
        orgId = parts[1];
      }
      
      // Send greeting
      const greeting = await getGreeting(orgId, userLanguage);
      await sendTelegramMessage(chatId, greeting);
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Query Gemini for an answer
    try {
      const answer = await queryGemini(orgId, userMessage, userLanguage);
      await sendTelegramMessage(chatId, answer);
    } catch (error) {
      console.error('Error processing query:', error);
      const errorMsg = userLanguage === 'tamil'
        ? 'மன்னிக்கவும், ஏதோ தவறு நடந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.'
        : 'Sorry, something went wrong. Please try again.';
      await sendTelegramMessage(chatId, errorMsg);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
