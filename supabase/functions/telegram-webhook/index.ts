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

async function queryOpenAI(orgId: string, query: string, language: string = "english") {
  console.log(`Querying OpenAI for org: ${orgId}, lang: ${language}`);
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
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
      ? `DOCUMENTS:\n${context}\n\nQUESTION:\n${query}`
      : query;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    return data.choices?.[0]?.message?.content || "I couldn't generate a response.";
  } catch (error) {
    console.error('Error querying OpenAI:', error);
    throw error;
  }
}

async function getGreeting(orgId: string, language: string = "english") {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  try {
    const hour = new Date().getHours();
    let timeOfDay = "Good evening";
    if (hour >= 5 && hour < 12) {
      timeOfDay = "Good morning";
    } else if (hour >= 12 && hour < 18) {
      timeOfDay = "Good afternoon";
    }
    
    const englishGreeting = `${timeOfDay}! Welcome to ${orgId} 👋. How can I assist you today?`;
    
    if (language === "tamil" && OPENAI_API_KEY) {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that translates text to Tamil.' },
            { role: 'user', content: `Translate to Tamil: ${englishGreeting}` }
          ],
          temperature: 0.3,
          max_tokens: 256,
        }),
      });

      if (openaiResponse.ok) {
        const data = await openaiResponse.json();
        const tamilGreeting = data.choices?.[0]?.message?.content;
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

    let orgId = "default_org";
    
    if (userMessage.startsWith('/start')) {
      const parts = userMessage.split(' ');
      if (parts.length > 1) {
        orgId = parts[1];
      }
      
      const greeting = await getGreeting(orgId, userLanguage);
      await sendTelegramMessage(chatId, greeting);
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const answer = await queryOpenAI(orgId, userMessage, userLanguage);
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
