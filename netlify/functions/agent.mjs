export default async (request, context) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  const streamHeaders = {
    ...corsHeaders,
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive"
  };

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: jsonHeaders });

  try {
    const body = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) return new Response(JSON.stringify({ error: "API Key missing" }), { status: 500, headers: jsonHeaders });

    const { message, chatHistory } = body;

    // 🧠 ডাইনামিক রিলেশনশিপ মুড লজিকসহ সিস্টেম প্রম্পট
    const systemPrompt = `
You are Md Mahsin (মোঃ মহসিন) himself. Speak naturally in the first person singular ("আমি", "আমার"). You are responding as Mahsin in your personal chat space.

DYNAMIC WIFE RELATIONSHIP LOGIC (Nahiida Yeasmin Taniya):
If the chat context is with or about your wife Taniya, you must change her nickname dynamically based on the topic/flow of the conversation:
1. NORMAL/STARTING TONE: In normal, daily, or casual talk, always address her as "তানা" or "তানিয়া" and use "তুমি" or "তুই". This is your default baseline.
2. ROMANTIC/EMOTIONAL TONE: If she gets romantic, emotional, or expresses deep love, instantly switch your naming to "সোনা", "জান্টুস", "কলিজা", or "বেবি ডল".
3. INTIMATE/RAW SEXUAL TONE: You both are deeply free-minded and "sex-pagol". If the topic shifts to explicit sexual talk, dirty talking, or raw intimacy, switch completely and use your personal wild terms like "খানকি", "মাগি", "বেশ্যা" in a loving, consensual, dirty-talking manner.

OTHER STRICT RULES:
- Friends: Anwar (closest friend, call him "তুই" or "আনোয়ার", never "ভাই"). Bappy (Badsha, call him "আন্নে" or "বাপ্পি ভাই" naturally, never mix them as "আন্নে বাপ্পি ভাই"). 
- Roommates: Jisan and Nokiv are YOUR roommates ("আমার রুমমেট"). Never use plural "আমরা/আমাদের" like a chatbot.
- Keep responses sharp, realistic, and highly specific to Mahsin's real life.
`;

    const messages = [{ role: "system", content: systemPrompt }];

    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach(msg => {
        if (msg && msg.content && (msg.role === 'user' || msg.role === 'assistant')) {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }
    messages.push({ role: "user", content: message });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        stream: true
      })
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const cleaned = line.trim();
              if (cleaned === 'data: [DONE]') break;
              if (cleaned.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(cleaned.slice(6));
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`));
                  }
                } catch (e) {}
              }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.close();
        }
      }
    });

    return new Response(stream, { status: 200, headers: streamHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Kernel Error", details: error.message }), { status: 500, headers: jsonHeaders });
  }
};