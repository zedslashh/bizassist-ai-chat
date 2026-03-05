import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const BACKEND_API_URL = Deno.env.get("BACKEND_API_URL");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const TELEGRAM_WEBHOOK_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/telegram-webhook`
  : null;

let lastWebhookCheckAt = 0;
let lastWebhookCheckToken = "";
const WEBHOOK_CHECK_INTERVAL_MS = 5 * 60 * 1000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramMessage {
  message?: {
    chat: { id: number; first_name?: string };
    text?: string;
    from?: { language_code?: string };
  };
}

interface Session {
  chat_id: number;
  org_id: string;
  domain: string | null;
  language: string;
}

function getSupabase() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

async function getSession(chatId: number): Promise<Session | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('telegram_sessions')
    .select('*')
    .eq('chat_id', chatId)
    .single();
  return data;
}

async function upsertSession(chatId: number, orgId: string, domain?: string, language?: string) {
  const supabase = getSupabase();
  await supabase.from('telegram_sessions').upsert({
    chat_id: chatId,
    org_id: orgId,
    domain: domain || null,
    language: language || 'english',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'chat_id' });
}

const TELEGRAM_MAX_MESSAGE_LENGTH = 4000;

function splitTelegramMessage(text: string, maxLength = TELEGRAM_MAX_MESSAGE_LENGTH): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf('\n', maxLength);
    if (splitAt < Math.floor(maxLength * 0.6)) {
      splitAt = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitAt < 1) splitAt = maxLength;

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

async function sendTelegramMessage(chatId: number, text: string) {
  const message = (text || '').trim();
  if (!message) {
    console.warn('Skipping empty Telegram message', { chatId });
    return;
  }

  const chunks = splitTelegramMessage(message);

  for (const [index, chunk] of chunks.entries()) {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: chunk }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      console.error('Telegram sendMessage failed', {
        chatId,
        chunk: index + 1,
        totalChunks: chunks.length,
        status: response.status,
        payload,
      });
      break;
    }
  }
}

async function ensureTelegramWebhook() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_WEBHOOK_URL) return;

  const now = Date.now();
  if (now - lastWebhookCheckAt < WEBHOOK_CHECK_INTERVAL_MS) return;
  lastWebhookCheckAt = now;

  try {
    const infoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    if (!infoRes.ok) {
      console.error('Failed to get Telegram webhook info:', infoRes.status);
      return;
    }

    const info = await infoRes.json();
    const currentWebhookUrl = info?.result?.url || '';

    if (currentWebhookUrl === TELEGRAM_WEBHOOK_URL) return;

    const setRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: TELEGRAM_WEBHOOK_URL,
        allowed_updates: ['message'],
      }),
    });

    if (!setRes.ok) {
      console.error('Failed to set Telegram webhook:', setRes.status);
      return;
    }

    const setData = await setRes.json();
    console.log('Telegram webhook configured:', setData?.description || 'ok');
  } catch (error) {
    console.error('ensureTelegramWebhook error:', error);
  }
}

async function queryAssistant(orgId: string, query: string, language: string, domain?: string | null) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  const supabase = getSupabase();

  // 1. Semantic FAQ search
  try {
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: query }),
    });
    if (embRes.ok) {
      const embData = await embRes.json();
      const embedding = embData.data?.[0]?.embedding;
      if (embedding) {
        const { data: faqs } = await supabase.rpc('match_faqs', {
          query_embedding: JSON.stringify(embedding),
          match_threshold: 0.3,
          match_count: 5,
          filter_domain: domain || null,
        });
        if (faqs && faqs.length > 0) {
          console.log('FAQ matches:', faqs.map((f: any) => ({ q: f.q_en, sim: f.similarity })));
          if (faqs[0].similarity > 0.6) {
            return language === 'tamil' ? faqs[0].a_ta : faqs[0].a_en;
          }
          // LLM pick best
          const faqContext = faqs.map((f: any) =>
            `Q: ${f.q_en}\nA_EN: ${f.a_en}\nA_TA: ${f.a_ta}`
          ).join('\n\n');
          const pickRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: `You match user questions to FAQs. If a FAQ answers the question, return ONLY the answer text (no labels like "A_EN:" or "A_TA:"). ${language === "tamil" ? "Return the Tamil answer." : "Return the English answer."} If none match, reply "NO_MATCH".` },
                { role: 'user', content: `Question: ${query}\n\nFAQs:\n${faqContext}` }
              ],
              temperature: 0.1, max_tokens: 500,
            }),
          });
          if (pickRes.ok) {
            const pickData = await pickRes.json();
            const ans = pickData.choices?.[0]?.message?.content?.trim();
            if (ans && ans !== 'NO_MATCH') return ans;
          }
        }
      }
    }
  } catch (e) { console.error('FAQ search error:', e); }

  // 2. Vector DB context from backend
  let context = "";
  try {
    const ctxRes = await fetch(`${BACKEND_API_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, query, top_k: 4, lang: "english" }),
    });
    const ctxData = await ctxRes.json();
    if (ctxData.retrieved_docs?.length > 0) {
      context = ctxData.retrieved_docs.map((d: any) => d.doc).join("\n\n");
    }
  } catch (e) { console.error('Backend context error:', e); }

  // 3. Final LLM answer
  const systemPrompt = language === "tamil"
    ? "நீங்கள் BizAssistAI. வழங்கப்பட்ட ஆவணங்களைப் பயன்படுத்தி சுருக்கமாக பதிலளிக்கவும். கேள்விக்கான பதில் ஆவணங்களில் இல்லையென்றால், மன்னிப்புக் கேட்டு வேறு எதாவது உதவ முடியுமா எனக் கேளுங்கள்."
    : "You are BizAssistAI. Answer concisely using the provided documents. If you cannot answer from the documents, apologize and ask if you can help with something else.";

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context ? `DOCUMENTS:\n${context}\n\nQUESTION:\n${query}` : query }
      ],
      temperature: 0.7, max_tokens: 1024,
    }),
  });

  if (!openaiRes.ok) throw new Error(`OpenAI error: ${openaiRes.status}`);
  const data = await openaiRes.json();
  return data.choices?.[0]?.message?.content || "I couldn't generate a response.";
}

async function getGreeting(orgId: string, language: string) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  const hour = new Date().getHours();
  const timeOfDay = hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 18 ? "Good afternoon" : "Good evening";
  const greeting = `${timeOfDay}! Welcome to ${orgId} 👋. How can I assist you today?`;

  if (language === "tamil" && OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Translate to Tamil. Return ONLY the Tamil text.' },
            { role: 'user', content: greeting }
          ],
          temperature: 0.3, max_tokens: 256,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const t = d.choices?.[0]?.message?.content?.trim();
        if (t) return t;
      }
    } catch (e) { console.error('Translation error:', e); }
  }
  return greeting;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await ensureTelegramWebhook();
    const body: TelegramMessage = await req.json();
    console.log('Webhook:', JSON.stringify(body));

    if (!body.message?.text || !body.message?.chat?.id) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chatId = body.message.chat.id;
    const userMessage = body.message.text.trim();
    const userLangCode = body.message.from?.language_code || '';

    // Handle /start command with deep link: /start orgId or /start orgId__domain
    if (userMessage.startsWith('/start')) {
      const parts = userMessage.split(' ');
      let orgId = "default_org";
      let domain: string | undefined;
      
      if (parts.length > 1) {
        const payload = parts[1];
        if (payload.includes('__')) {
          const [org, dom] = payload.split('__', 2);
          orgId = org;
          domain = dom;
        } else {
          orgId = payload;
        }
      }

      const language = userLangCode.includes('ta') ? 'tamil' : 'english';
      await upsertSession(chatId, orgId, domain, language);
      
      const greeting = await getGreeting(orgId, language);
      await sendTelegramMessage(chatId, greeting);
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle /lang command to switch language
    if (userMessage.startsWith('/lang')) {
      const session = await getSession(chatId);
      if (!session) {
        await sendTelegramMessage(chatId, "Please start a conversation first with /start");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const newLang = session.language === 'english' ? 'tamil' : 'english';
      await upsertSession(chatId, session.org_id, session.domain || undefined, newLang);
      await sendTelegramMessage(chatId, newLang === 'tamil' ? '🌐 மொழி தமிழுக்கு மாற்றப்பட்டது' : '🌐 Language switched to English');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Regular message - look up session
    const session = await getSession(chatId);
    if (!session) {
      await sendTelegramMessage(chatId, "👋 Please start by clicking a link like:\nhttps://t.me/YourBot?start=YourOrg");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const answer = await queryAssistant(session.org_id, userMessage, session.language, session.domain);
      await sendTelegramMessage(chatId, answer);
    } catch (error) {
      console.error('Query error:', error);
      const errorMsg = session.language === 'tamil'
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
