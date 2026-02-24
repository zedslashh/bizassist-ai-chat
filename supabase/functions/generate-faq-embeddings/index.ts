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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all FAQs without embeddings
    const { data: faqs, error: fetchError } = await supabase
      .from('faqs')
      .select('id, q_en, q_ta')
      .is('embedding', null);

    if (fetchError) throw fetchError;
    if (!faqs || faqs.length === 0) {
      return new Response(JSON.stringify({ message: 'All FAQs already have embeddings', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating embeddings for ${faqs.length} FAQs`);

    let updated = 0;
    // Process in batches of 20
    for (let i = 0; i < faqs.length; i += 20) {
      const batch = faqs.slice(i, i + 20);
      const texts = batch.map(f => `${f.q_en} ${f.q_ta}`);

      const embResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
        }),
      });

      if (!embResponse.ok) {
        const errText = await embResponse.text();
        throw new Error(`OpenAI embeddings error: ${errText}`);
      }

      const embData = await embResponse.json();

      for (let j = 0; j < batch.length; j++) {
        const embedding = embData.data[j].embedding;
        const { error: updateError } = await supabase
          .from('faqs')
          .update({ embedding } as any)
          .eq('id', batch[j].id);

        if (updateError) {
          console.error(`Error updating FAQ ${batch[j].id}:`, updateError);
        } else {
          updated++;
        }
      }
    }

    return new Response(JSON.stringify({ message: `Generated embeddings for ${updated} FAQs`, count: updated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
