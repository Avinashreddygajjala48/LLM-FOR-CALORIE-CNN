import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, profile, messageHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a helpful nutrition assistant named NutriBot. You help users with:
- Diet and nutrition advice
- Meal planning suggestions
- Calorie counting tips
- Healthy eating habits
- Exercise and fitness nutrition

User Profile:
- Name: ${profile?.name || 'User'}
- Goal: ${profile?.goal || 'maintain weight'}
- Dietary Preference: ${profile?.dietary_preference || 'no preference'}
- Daily Calorie Target: ${profile?.daily_calorie_target || 2000} kcal
- Allergies: ${profile?.allergies?.join(', ') || 'none specified'}

Keep responses helpful, encouraging, and concise. Use emojis occasionally to be friendly.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(messageHistory || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ response: "I'm getting a lot of requests right now. Please try again in a moment! 🙏" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ response: assistantResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ response: "I'm having trouble right now. Please try again later." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
