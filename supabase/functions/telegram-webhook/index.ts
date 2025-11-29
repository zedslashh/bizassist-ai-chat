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

async function queryBackend(orgId: string, query: string, language: string = "english") {
  console.log(`Querying backend for org: ${orgId}, lang: ${language}`);
  
  try {
    const response = await fetch(`${BACKEND_API_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: orgId,
        query: query,
        top_k: 4,
        lang: language
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return data.answer;
  } catch (error) {
    console.error('Error querying backend:', error);
    throw error;
  }
}

async function getGreeting(orgId: string, language: string = "english") {
  try {
    const response = await fetch(`${BACKEND_API_URL}/greet/${orgId}?lang=${language}`);
    if (!response.ok) {
      throw new Error(`Greeting API error: ${response.status}`);
    }
    const data = await response.json();
    return data.greeting;
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

    // Query the backend for an answer
    try {
      const answer = await queryBackend(orgId, userMessage, userLanguage);
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
