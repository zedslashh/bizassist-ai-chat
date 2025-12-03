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
    const BACKEND_URL = Deno.env.get('BACKEND_API_URL');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const { org_id, query, top_k = 4, lang = "english" } = await req.json();
    console.log('Query received:', { org_id, query, lang });

    // Get context from backend vector DB
    let context = "";
    try {
      const contextResponse = await fetch(`${BACKEND_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          org_id, 
          query, 
          top_k,
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

    // Build system prompt
    const systemPrompt = lang === "tamil"
      ? "நீங்கள் BizAssistAI. வழங்கப்பட்ட ஆவணங்களைப் பயன்படுத்தி சுருக்கமாக பதிலளிக்கவும். கேள்விக்கு பதிலளிக்க முடியவில்லை என்றால், மன்னிப்புக் கேட்டு கேள்வி உங்கள் எல்லைக்கு வெளியே என்று பணிவுடன் கூறவும்."
      : "You are BizAssistAI. Answer concisely using the provided documents. If you cannot answer the question, apologize and politely say that the question is outside your scope.";

    const userPrompt = context
      ? `DOCUMENTS:\n${context}\n\nQUESTION:\n${query}`
      : query;

    // Call OpenAI API with streaming
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
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    // Stream response
    const reader = openaiResponse.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      throw new Error('No response body');
    }

    let fullAnswer = '';
    
    // Read stream and accumulate response
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
      
      for (const line of lines) {
        const data = line.replace('data: ', '').trim();
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullAnswer += content;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }

    console.log('Generated answer:', fullAnswer);

    return new Response(JSON.stringify({ 
      answer: fullAnswer || "I couldn't generate a response.",
      retrieved_docs: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in query-assistant:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
