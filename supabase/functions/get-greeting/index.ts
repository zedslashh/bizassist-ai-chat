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
    const BACKEND_URL = Deno.env.get('BACKEND_API_URL');
    if (!BACKEND_URL) {
      throw new Error('BACKEND_API_URL not configured');
    }

    const { org_id, lang } = await req.json();

    const response = await fetch(`${BACKEND_URL}/greet/${org_id}?lang=${lang || 'english'}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error('Failed to get greeting');
    }

    return new Response(JSON.stringify(data), {
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
