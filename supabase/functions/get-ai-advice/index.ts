import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Creates a stable checksum of the financial context.
 */
function getContextChecksum(context: any): string {
  try {
    // Sort keys and handle potential nulls for a stable hash
    const summary = {
      txCount: context?.recentTransactions?.length || 0,
      budgetCount: context?.budgets?.length || 0,
      goalCount: context?.savingGoals?.length || 0,
      totalSpent: Math.round(context?.budgets?.reduce((acc: number, b: any) => acc + (Number(b?.spent) || 0), 0) || 0)
    };
    return btoa(JSON.stringify(summary));
  } catch (e) {
    console.error('Checksum Error:', e);
    return 'error_fallback_checksum';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    const context = body?.context;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('No Authorization header provided');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Use Service Role to manage the cache table bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the actual user from the Auth Header
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !authData?.user) {
      console.error('Auth Error:', authError);
      throw new Error('Authentication failed');
    }
    const user = authData.user;

    const checksum = getContextChecksum(context);
    console.log(`AI Advisor: Processing request for user ${user.id} (Checksum: ${checksum})`);

    // 1. CHECK CACHE (Valid for 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: cached, error: cacheError } = await supabaseAdmin
      .from('ai_advice_cache')
      .select('advice')
      .eq('user_id', user.id)
      .eq('context_checksum', checksum)
      .gt('created_at', twentyFourHoursAgo)
      .maybeSingle();

    if (cacheError) {
      console.error('Cache Query Error:', cacheError);
    }

    if (cached) {
      console.log('AI Advisor: CACHE HIT! Serving stored advice.');
      return new Response(JSON.stringify(cached.advice), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('AI Advisor: CACHE MISS. Fetching fresh advice from Gemini...');

    // 2. CALL GEMINI
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('Internal Error: GEMINI_API_KEY not configured on server.');
    }

    const prompt = `
      You are an Executive Financial Strategist and Encouraging Mentor for an app called SpendWise.
      Analyze the following user financial data and provide personalized, high-level strategic advice.
      
      USER DATA:
      ${JSON.stringify(context, null, 2)}

      YOUR GOALS:
      1. Identify one positive trend (Mentor).
      2. Identify one area for improvement or a "leak" in spending (Coach).
      3. Recommend 3 specific, actionable steps the user should take today or this week.
      4. End with a powerful, one-sentence encouragement.

      RESPONSE FORMAT (JSON ONLY):
      {
        "summary": "2-3 sentences analyzing their overall state.",
        "actionItems": ["Action 1", "Action 2", "Action 3"],
        "encouragement": "One motivational sentence."
      }
    `;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        }),
      }
    );

    const result = await geminiRes.json();
    if (result.error) {
      console.error('Gemini API Details:', result.error);
      throw new Error(`Gemini AI Error: ${result.error.message}`);
    }

    const adviceText = result.candidates[0].content.parts[0].text;
    const adviceJson = JSON.parse(adviceText);

    // 3. SECURE CACHE
    const { error: upsertError } = await supabaseAdmin
      .from('ai_advice_cache')
      .upsert({
        user_id: user.id,
        advice: adviceJson,
        context_checksum: checksum,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,context_checksum' });

    if (upsertError) {
      console.error('AI Advisor: Cache Save Failed:', upsertError.message);
    } else {
      console.log('AI Advisor: Advice successfully cached for 24h.');
    }

    return new Response(adviceText, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function Runtime Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
