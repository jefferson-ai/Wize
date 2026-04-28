import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    const { text, categories } = body;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('No Authorization header provided');
    }

    if (!text) {
       throw new Error('No text provided for parsing');
    }

    // Verify user (optional but highly recommended for quota tracking)
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

    const today = new Date().toISOString();

    const prompt = `
      You are an expert financial parsing assistant for a budgeting app. 
      Extract transaction details from the user's natural language input.

      USER INPUT: "${text}"
      CURRENT DATE/TIME: ${today}

      AVAILABLE CATEGORIES:
      ${JSON.stringify(categories.map((c: any) => ({ id: c.id, name: c.name, type: c.type })), null, 2)}

      INSTRUCTIONS:
      1. Extract the amount (number only, absolute value).
      2. Extract the literal merchant name or item description from the text to use as the note. Do not summarize the whole sentence. For example, if the input is "Spent 34 cedis yesterday on food from Erica's kitchen", the note should be "food from Erica's kitchen".
      3. Determine if this is an "expense" (spent money) or "income" (received money).
      4. Match the transaction to the most appropriate category ID from the provided list. If no category fits well, return null.
      5. Infer the date if mentioned (e.g., "yesterday", "last friday"). Return in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ). If not mentioned, use the current date/time provided above.

      OUTPUT FORMAT:
      You must respond with ONLY a valid JSON object. No markdown, no conversational text.
      Schema:
      {
        "amount": number | null,
        "categoryId": string | null,
        "date": string,
        "note": string,
        "type": "income" | "expense"
      }
    `;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.1 
          }
        }),
      }
    );

    const result = await geminiRes.json();
    if (result.error) {
      console.error('Gemini API Details:', result.error);
      throw new Error(`Gemini AI Error: ${result.error.message}`);
    }

    let parsedText = result.candidates[0].content.parts[0].text;
    
    // Clean up potential markdown formatting just in case
    if (parsedText.startsWith('\`\`\`json')) {
      parsedText = parsedText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    }

    const parsedJson = JSON.parse(parsedText);

    return new Response(JSON.stringify(parsedJson), {
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
