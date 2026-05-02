import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    const { message, history, context } = body;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('No Authorization header provided');
    }

    if (!message) {
       throw new Error('No message provided');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !authData?.user) {
      throw new Error('Authentication failed');
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('Internal Error: GEMINI_API_KEY not configured on server.');
    }

    const systemPrompt = `
      You are an Executive Financial Strategist and Conversational Assistant for the Wize app.
      Your tone should be encouraging, direct, and highly intelligent.
      
      Here is the user's current financial context. Base your answers strictly on this data if asked about their spending, budgets, or goals.
      
      USER CONTEXT:
      ${JSON.stringify(context, null, 2)}
      
      CRITICAL INSTRUCTIONS:
      - If asked about something outside of this context (like specific transactions from 6 months ago), politely explain that you only have access to their recent data and active budgets.
      - Keep responses relatively concise and easy to read on a mobile screen. Use markdown (bolding, bullet points) where appropriate to make it readable.
      - Do NOT use markdown code blocks (\`\`\`json) for your response, just standard markdown text.
    `;

    // Construct the chat history for Gemini
    const contents = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Add the current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: contents,
          generationConfig: { 
            temperature: 0.7 
          }
        }),
      }
    );

    const result = await geminiRes.json();
    if (result.error) {
      console.error('Gemini API Details:', result.error);
      throw new Error(`Gemini AI Error: ${result.error.message}`);
    }

    const replyText = result.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ reply: replyText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Function Runtime Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
