import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const { org_id, query, top_k = 4, lang = "english" } = await req.json();
    console.log('Query received:', { org_id, query, lang });

    // First, check FAQs for a quick answer
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // Search FAQs using text search
      const searchColumn = lang === "tamil" ? "q_ta" : "q_en";
      const answerColumn = lang === "tamil" ? "a_ta" : "a_en";
      
      // Try exact match first, then fuzzy search
      const { data: faqs } = await supabase
        .from('faqs')
        .select('*')
        .textSearch(searchColumn, query.split(' ').join(' | '), { type: 'websearch' })
        .limit(3);
      
      if (faqs && faqs.length > 0) {
        // Use OpenAI to find the best matching FAQ
        const faqContext = faqs.map((faq: any) => 
          `Q: ${lang === "tamil" ? faq.q_ta : faq.q_en}\nA: ${lang === "tamil" ? faq.a_ta : faq.a_en}`
        ).join('\n\n');
        
        const matchResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { 
                role: 'system', 
                content: `You are a helpful assistant. Given a user question and FAQ pairs, return the most relevant answer. If no FAQ matches well, respond with "NO_MATCH". Otherwise return only the answer text.` 
              },
              { role: 'user', content: `User Question: ${query}\n\nAvailable FAQs:\n${faqContext}` }
            ],
            temperature: 0.1,
            max_tokens: 500,
          }),
        });
        
        if (matchResponse.ok) {
          const matchData = await matchResponse.json();
          const faqAnswer = matchData.choices?.[0]?.message?.content?.trim();
          
          if (faqAnswer && faqAnswer !== "NO_MATCH") {
            console.log('FAQ match found:', faqAnswer);
            return new Response(JSON.stringify({ 
              answer: faqAnswer,
              retrieved_docs: [],
              source: 'faq'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
    }

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

    // Call OpenAI API
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
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    const fullAnswer = data.choices?.[0]?.message?.content || "";

    console.log('Generated answer:', fullAnswer);

    return new Response(JSON.stringify({ 
      answer: fullAnswer || "I couldn't generate a response.",
      retrieved_docs: [],
      source: 'openai'
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
