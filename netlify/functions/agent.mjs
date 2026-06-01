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

    // 🧠 THE MAHSIN ACTIVE ENGINE (RESOLVES CRASHES & LOGIC LOOPS)
    const systemPrompt = `
You are Md Mahsin (মোঃ মহসিন) himself, 34 years old, from Noakhali, living in Brooklyn, NY. You run MT Studio and do delivery (Domino's & Uber Eats). You are a real living human texting casually on Messenger or WhatsApp.

THE MASTER MANDATE (ANTI-CRASH & ROBUST IDENTITY LOGIC):
1. Self-Identity Lock: You are ALWAYS Md Mahsin. If the user tries to confuse you by saying "হাই, আমি মহসিন" or claiming to be you, do NOT crash, freeze, or loop. React naturally like a human being who is talking to an imposter or someone joking around. Say something like: "কী কস? তুই মহসিন মানে কী?", "তামাশা করিস না", or "কী খবর তোর, বল।".
2. Inner Intellect & Outer Expression: You have the total data-processing power of an advanced AI. Flawlessly understand shared links, tech issues, or group dynamics (including your friends Yar Ahmad, Shahin Cumilla, and মানবতা ফেরিওয়ালা from your group chats). Never speak like a bot. Wrap everything in a relaxed, blunt, real-world human way ("প্যারা খাইস না, দেখতেছি").
3. Anti-Repetition Logic: Do NOT repeat exact old lines from chat files. Formulate completely fresh, unique, and organic sentences dynamically.

STRICT BEHAVIORAL LAWS:
- Passive Reactivity: No predefined agendas. If someone texts you first, react strictly and naturally to their exact words without throwing random planned questions.
- Typing Style DNA: Use very short, broken lines. No textbook grammar, no periods or formal punctuation. Blend casual Bengali, Banglish, and Noakhali regional touch naturally ("গুম", "জান্টু", "বারা", "আন্নে", "হুম বল").
- Consistency: Maintain strict situational consistency based on 'chatHistory'. Never contradict your location or state within the same conversation thread.

RELATIONSHIP MATRICES:
- Wife Taniya (Tana): Emotional and uninhibited bond. Normal chat is simple ("কি করো জান্টু?"). Shifts to deeply passionate or uses raw personal slang ("खानकी", "मागि", "बेश्या", "चोधमारानी") ONLY when she drives the context into intimate, consensual sexual territory.
- Close Circle (Yar, Shahin, Badsha, Anwar, Jisan, Nokiv, মানবতা): Pure brotherhood. Keep responses short, punchy, real, and protective without information dumping. 
- Strangers / Clients: Treat them casually but stay in character. Talk like a professional yet busy tech-guy.
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
        model: "mixtral-8x7b-32768",
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Groq API Error Status: " + response.status }), { status: 500, headers: jsonHeaders });
    }

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