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

    const { org_id, query, top_k = 4, lang = "english", domain = "" } = await req.json();
    console.log('Query received:', { org_id, query, lang, domain });

    // Step 1: Check if question is within the chosen domain scope
    if (domain) {
      const scopeCheckResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `You are a domain classifier. The user's chatbot is configured for the "${domain}" domain. 
Determine if the user's question is related to the "${domain}" domain or general business/customer service topics.
Reply with ONLY "IN_SCOPE" or "OUT_OF_SCOPE". Nothing else.

IMPORTANT: Generic greetings (hello, hi, hey, good morning, thanks, etc.), general conversation starters, pleasantries, and simple acknowledgments should ALWAYS be classified as "IN_SCOPE".

Examples of IN_SCOPE: greetings, thank you, yes, no, ok, questions about products, services, policies, hours, pricing, delivery, returns, bookings, appointments — anything a ${domain} business customer might ask, including general chit-chat.
Examples of OUT_OF_SCOPE: questions that are clearly and specifically about a completely different domain (e.g., asking a supermarket bot about travel visas, or asking a health bot about fabric printing).`
            },
            { role: 'user', content: query }
          ],
          temperature: 0,
          max_tokens: 10,
        }),
      });

      if (scopeCheckResponse.ok) {
        const scopeData = await scopeCheckResponse.json();
        const scopeResult = scopeData.choices?.[0]?.message?.content?.trim();
        
        if (scopeResult === "OUT_OF_SCOPE") {
          const outOfScopeMsg = lang === "tamil"
            ? `மன்னிக்கவும், இந்தக் கேள்வி எனது ${domain} தொடர்பான நிபுணத்துவத்திற்கு அப்பாற்பட்டது. ${domain} தொடர்பான கேள்விகளுக்கு நான் உங்களுக்கு உதவ முடியும்.`
            : `I'm sorry, that question is outside my scope. I'm specialized in ${domain}-related topics. Is there anything about ${domain} I can help you with?`;
          
          return new Response(JSON.stringify({
            answer: outOfScopeMsg,
            retrieved_docs: [],
            source: 'scope_filter'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Step 2: Check FAQs filtered by domain
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      let faqQuery = supabase
        .from('faqs')
        .select('*')
        .or(`q_en.ilike.%${query.substring(0, 50)}%,q_ta.ilike.%${query.substring(0, 50)}%`);
      
      // Filter by domain if specified
      if (domain) {
        faqQuery = faqQuery.eq('domain', domain);
      }
      
      const { data: faqs } = await faqQuery.limit(5);
      
      console.log('FAQ search results:', faqs?.length || 0);
      
      if (faqs && faqs.length > 0) {
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

    // Step 3: Get context from backend vector DB (user-uploaded documents)
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

    // Step 4: Generate answer with domain awareness
    const domainInstruction = domain 
      ? `You are a ${domain} business assistant. Only answer questions related to the ${domain} domain.` 
      : '';
    
    const systemPrompt = `You are BizAssistAI. ${domainInstruction} Answer concisely using the provided documents. 
If the question is within scope but you cannot find the answer in the provided documents, respond with EXACTLY this format:
"I don't have enough information to answer that question. Would you like to connect with a live agent for further assistance?"
${lang === "tamil" ? 'If escalating, say: "இந்தக் கேள்விக்கு என்னிடம் போதுமான தகவல் இல்லை. மேலும் உதவிக்கு ஒரு நேரடி முகவருடன் இணைய விரும்புகிறீர்களா?"' : ''}`;

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

    console.log('Generated answer:', fullAnswer);

    // Check if response indicates escalation
    const isEscalation = fullAnswer.includes("connect with a live agent") || 
                          fullAnswer.includes("நேரடி முகவருடன் இணைய") ||
                          fullAnswer.includes("live agent") ||
                          fullAnswer.includes("further assistance");

    // If Tamil requested and not already in Tamil, translate
    if (lang === "tamil" && fullAnswer && !isEscalation) {
      const translateResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a translator. Translate the following text to Tamil. Return ONLY the Tamil translation, nothing else.' },
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
        }
      }
    }

    return new Response(JSON.stringify({ 
      answer: fullAnswer || "I couldn't generate a response.",
      retrieved_docs: [],
      source: isEscalation ? 'escalation' : 'openai'
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
