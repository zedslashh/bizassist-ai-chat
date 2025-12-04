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
      
      // Search FAQs in both English and Tamil columns for better matching
      
      // Try searching in English column first (better text search support)
      const { data: faqs } = await supabase
        .from('faqs')
        .select('*')
        .or(`q_en.ilike.%${query.substring(0, 50)}%,q_ta.ilike.%${query.substring(0, 50)}%`)
        .limit(5);
      
      console.log('FAQ search results:', faqs?.length || 0);
      
      if (faqs && faqs.length > 0) {
        // Use OpenAI to find the best matching FAQ and get proper answer
        const faqContext = faqs.map((faq: any) => 
          `Q_EN: ${faq.q_en}\nA_EN: ${faq.a_en}\nQ_TA: ${faq.q_ta}\nA_TA: ${faq.a_ta}`
        ).join('\n\n---\n\n');
        
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
                content: `You are a FAQ matcher. Given a user question and FAQ pairs (with English and Tamil versions), find the most relevant FAQ. 
                
If a FAQ matches the question well:
- If requested language is "tamil", return ONLY the Tamil answer (A_TA) - no English text at all
- If requested language is "english", return ONLY the English answer (A_EN)

If no FAQ matches well, respond with exactly "NO_MATCH" (nothing else).

Requested language: ${lang}` 
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
          
          if (faqAnswer && faqAnswer !== "NO_MATCH" && !faqAnswer.includes("NO_MATCH")) {
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

    // Build system prompt - always generate in English first for better quality
    const systemPrompt = "You are BizAssistAI. Answer concisely using the provided documents. If you cannot answer the question, apologize and politely say that the question is outside your scope.";

    const userPrompt = context
      ? `DOCUMENTS:\n${context}\n\nQUESTION:\n${query}`
      : query;

    // Call OpenAI API to generate answer
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
    let fullAnswer = data.choices?.[0]?.message?.content || "";

    console.log('Generated answer (English):', fullAnswer);

    // If Tamil requested, translate the answer
    if (lang === "tamil" && fullAnswer) {
      const translateResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a translator. Translate the following text to Tamil. Return ONLY the Tamil translation, nothing else. Do not include any English text or explanations.' },
            { role: 'user', content: fullAnswer }
          ],
          temperature: 0.3,
          max_tokens: 2048,
        }),
      });

      if (translateResponse.ok) {
        const translateData = await translateResponse.json();
        const tamilAnswer = translateData.choices?.[0]?.message?.content;
        if (tamilAnswer) {
          fullAnswer = tamilAnswer.trim();
          console.log('Translated to Tamil:', fullAnswer);
        }
      }
    }

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
