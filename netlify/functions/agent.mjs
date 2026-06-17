export default async (request, context) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: jsonHeaders });

  try {
    const body = await request.json();
    const { message, chatHistory = [], model = "Nexos GPT 5 2" } = body;   // Default model

    const baseURL = "https://srv1761282.hstgr.cloud";
    const token = "nexos-team-ac23c5af10350e0c1d8cdab62ae0fd44714f909786370ea922fac8cf07b43e18c938d86835ee251ade72d3b979b8b6135d061037877bbe7f834fb86f15e11066";

    const systemPrompt = `You are Md Mahsin (মোঃ মহসিন) himself. Speak naturally, short Banglish, real human style.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.slice(-12),
      { role: "user", content: message }
    ];

    const response = await fetch(`${baseURL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        model: model,           // যেকোনো মডেল এখানে আসবে
        messages: messages,
        stream: false,
        temperature: 0.75,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenClaw Error:", err);
      return new Response(JSON.stringify({ error: "OpenClaw API Error" }), { status: 500, headers: jsonHeaders });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "আবার বলো।";

    return new Response(JSON.stringify({ text: reply }), { 
      status: 200, 
      headers: jsonHeaders 
    });

  } catch (error) {
    console.error("Server Error:", error);
    return new Response(JSON.stringify({ error: "Server Error" }), { status: 500, headers: jsonHeaders });
  }
};