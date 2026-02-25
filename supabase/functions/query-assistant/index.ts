import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Helpers ---

function detectEscalation(query: string, history: any[]): boolean {
  const lastBotMsg = [...history].reverse().find((m: any) => m.role === "assistant")?.content || "";
  const isAfterPrompt = /connect with a live agent|நேரடி முகவருடன் இணைய|live agent|further assistance/i.test(lastBotMsg);
  const affirmative = /^(yes|yeah|yep|sure|ok|okay|please|connect|connect me|i want to connect|live agent|talk to agent|speak to agent|human|real person)/i;
  const direct = /^(connect me with|connect me to|talk to|speak to|i want to talk to|i need).*?(agent|human|person|representative|support)/i;
  return (affirmative.test(query.trim()) && isAfterPrompt) || direct.test(query.trim());
}

async function getQueryEmbedding(query: string, apiKey: string): Promise<number[]> {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: query }),
  });
  if (!resp.ok) throw new Error(`Embeddings API error: ${resp.status}`);
  const data = await resp.json();
  return data.data[0].embedding;
}

async function checkScope(query: string, domain: string, apiKey: string): Promise<boolean> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a domain classifier for "${domain}". Reply ONLY "IN_SCOPE" or "OUT_OF_SCOPE".
Greetings, affirmative responses (yes/ok/sure), agent/human requests, and general customer service questions are ALWAYS "IN_SCOPE".
Only clearly unrelated domains are "OUT_OF_SCOPE".`
        },
        { role: 'user', content: query }
      ],
      temperature: 0, max_tokens: 10,
    }),
  });
  if (!resp.ok) return true; // default in-scope on error
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() !== "OUT_OF_SCOPE";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const BACKEND_URL = Deno.env.get('BACKEND_API_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

    const { org_id, query, top_k = 4, lang = "english", domain = "", history = [] } = await req.json();
    console.log('Query received:', { org_id, query, lang, domain });

    // Step 0: Escalation detection
    if (detectEscalation(query, history)) {
      const msg = lang === "tamil"
        ? "இந்தக் கேள்விக்கு என்னிடம் போதுமான தகவல் இல்லை. மேலும் உதவிக்கு ஒரு நேரடி முகவருடன் இணைய விரும்புகிறீர்களா?"
        : "I don't have enough information to answer that question. Would you like to connect with a live agent for further assistance?";
      return new Response(JSON.stringify({ answer: msg, retrieved_docs: [], source: 'escalation' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Scope check
    if (domain) {
      const inScope = await checkScope(query, domain, OPENAI_API_KEY);
      if (!inScope) {
        const msg = lang === "tamil"
          ? `மன்னிக்கவும், இந்தக் கேள்வி எனது ${domain} தொடர்பான நிபுணத்துவத்திற்கு அப்பாற்பட்டது.`
          : `I'm sorry, that question is outside my scope. I'm specialized in ${domain}-related topics. Is there anything about ${domain} I can help you with?`;
        return new Response(JSON.stringify({ answer: msg, retrieved_docs: [], source: 'scope_filter' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Step 2: Semantic FAQ search using embeddings
    let faqAnswer: string | null = null;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const embedding = await getQueryEmbedding(query, OPENAI_API_KEY);
        console.log('Embedding generated, length:', embedding.length);
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        const { data: matchedFaqs, error: matchError } = await supabase.rpc('match_faqs', {
          query_embedding: JSON.stringify(embedding),
          match_threshold: 0.3,
          match_count: 5,
          filter_domain: domain || null,
        });

        if (matchError) {
          console.error('FAQ RPC error:', matchError);
        }

        if (!matchError && matchedFaqs && matchedFaqs.length > 0) {
          console.log('Semantic FAQ matches:', matchedFaqs.map((f: any) => ({ q: f.q_en, sim: f.similarity })));
          
          // If top match is very high confidence, return directly
          if (matchedFaqs[0].similarity > 0.6) {
            faqAnswer = lang === "tamil" ? matchedFaqs[0].a_ta : matchedFaqs[0].a_en;
          } else {
            // Use LLM to pick the best match
            const faqContext = matchedFaqs.map((f: any) =>
              `[Similarity: ${f.similarity.toFixed(2)}] Q_EN: ${f.q_en}\nA_EN: ${f.a_en}\nQ_TA: ${f.q_ta}\nA_TA: ${f.a_ta}`
            ).join('\n---\n');

            const matchResp = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                  { role: 'system', content: `You match user questions to FAQs. If a FAQ answers the question, return ONLY the answer text (no labels like "A_EN:" or "A_TA:"). ${lang === "tamil" ? "Return the Tamil answer." : "Return the English answer."} If none match, reply "NO_MATCH".` },
                  { role: 'user', content: `Question: ${query}\n\nFAQs:\n${faqContext}` }
                ],
                temperature: 0.1, max_tokens: 500,
              }),
            });

            if (matchResp.ok) {
              const matchData = await matchResp.json();
              const result = matchData.choices?.[0]?.message?.content?.trim();
              if (result && !result.includes("NO_MATCH")) {
                faqAnswer = result;
              }
            }
          }
        }
      } catch (err) {
        console.error('Semantic FAQ search error:', err);
      }
    }

    if (faqAnswer) {
      return new Response(JSON.stringify({ answer: faqAnswer, retrieved_docs: [], source: 'faq' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Get context from backend vector DB
    let context = "";
    try {
      if (BACKEND_URL) {
        const ctxResp = await fetch(`${BACKEND_URL}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_id, query, top_k, lang: "english" }),
        });
        const ctxData = await ctxResp.json();
        if (ctxData.retrieved_docs?.length > 0) {
          context = ctxData.retrieved_docs.map((d: any) => d.doc).join("\n\n");
        }
      }
    } catch (error) {
      console.error('Backend context error:', error);
    }

    // Step 4: Generate answer with LLM
    const domainInstr = domain ? `You are a ${domain} business assistant. Only answer ${domain}-related questions.` : '';
    const systemPrompt = `You are BizAssistAI. ${domainInstr} Answer concisely using provided documents.
If you cannot find the answer, respond: "I don't have enough information to answer that question. Would you like to connect with a live agent for further assistance?"
${lang === "tamil" ? 'If escalating, use Tamil: "இந்தக் கேள்விக்கு என்னிடம் போதுமான தகவல் இல்லை. மேலும் உதவிக்கு ஒரு நேரடி முகவருடன் இணைய விரும்புகிறீர்களா?"' : ''}`;

    const userPrompt = context ? `DOCUMENTS:\n${context}\n\nQUESTION:\n${query}` : query;

    const aiMessages: any[] = [{ role: 'system', content: systemPrompt }];
    if (history?.length > 0) {
      for (const h of history.slice(-4)) {
        aiMessages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content });
      }
    }
    aiMessages.push({ role: 'user', content: userPrompt });

    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', messages: aiMessages, temperature: 0.7, max_tokens: 2048 }),
    });

    if (!openaiResp.ok) throw new Error(`OpenAI API error: ${openaiResp.status}`);

    const data = await openaiResp.json();
    let fullAnswer = data.choices?.[0]?.message?.content || "";

    const isEscalation = /connect with a live agent|நேரடி முகவருடன் இணைய|live agent|further assistance/i.test(fullAnswer);

    // Translate to Tamil if needed
    if (lang === "tamil" && fullAnswer && !isEscalation) {
      const trResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'Translate to Tamil. Return ONLY the Tamil translation.' },
            { role: 'user', content: fullAnswer }
          ],
          temperature: 0.3, max_tokens: 2048,
        }),
      });
      if (trResp.ok) {
        const trData = await trResp.json();
        const tamil = trData.choices?.[0]?.message?.content;
        if (tamil) fullAnswer = tamil.trim();
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
