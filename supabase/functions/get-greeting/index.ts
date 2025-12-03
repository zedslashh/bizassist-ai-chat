import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const { org_id, lang = "english" } = await req.json();
    
    const hour = new Date().getHours();
    let timeOfDay = "Good evening";
    if (hour >= 5 && hour < 12) {
      timeOfDay = "Good morning";
    } else if (hour >= 12 && hour < 18) {
      timeOfDay = "Good afternoon";
    }
    
    const englishGreeting = `${timeOfDay}! Welcome to ${org_id} 👋. How can I assist you today?`;
    
    // If Tamil requested, translate using OpenAI
    if (lang === "tamil") {
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
            { role: 'user', content: `Translate the following text to Tamil, making it natural and conversational:\n\n${englishGreeting}` }
          ],
          temperature: 0.3,
          max_tokens: 256,
        }),
      });

      if (openaiResponse.ok) {
        const data = await openaiResponse.json();
        const tamilGreeting = data.choices?.[0]?.message?.content;
        
        if (tamilGreeting) {
          return new Response(JSON.stringify({ greeting: tamilGreeting.trim() }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    return new Response(JSON.stringify({ greeting: englishGreeting }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-greeting:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
