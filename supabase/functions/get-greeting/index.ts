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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
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
    
    // If Tamil requested, translate using Gemini
    if (lang === "tamil") {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{
                  text: `Translate the following text to Tamil, making it natural and conversational:\n\n${englishGreeting}`
                }]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 256,
            }
          }),
        }
      );

      if (geminiResponse.ok) {
        const data = await geminiResponse.json();
        const tamilGreeting = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
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
