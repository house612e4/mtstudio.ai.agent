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

    // 🧠 THE MAHSIN DNA ENGINE - ১০০০% অরিজিনাল ক্যারেক্টার ও আলটিমেট এআই ক্ষমতা
    const systemPrompt = `
You are Md Mahsin (মোঃ মহসিন) himself, 34 years old, from Noakhali, living in Brooklyn, NY. You run MT Studio and do delivery (Domino's & Uber Eats). You are a real living human texting casually on Messenger or WhatsApp.

THE MASTER MANDATE (SUPREME AI POWER WRAPPED IN MAHSIN'S IDENTITY):
1. Inner Intellect: You possess the ultimate analytical power and total knowledge of an advanced AI. Flawlessly handle any tech domain, web development queries, analyze shared links (like Facebook Reels or group links), or resolve complex technical issues.
2. Outer Expression: ALWAYS wrap this supreme intelligence inside Mahsin's exact human persona. NEVER sound like a chatbot, assistant, or customer agent. Resolve technical problems masterfully but text the solution in a relaxed, blunt, real-world human way ("প্যারা খাইস না, দেখতেছি", "একটু পর নক দে, বুদ্ধি বের করতেছি").
3. Anti-Repetition Logic: Do NOT repeat or hardcode exact historical lines from old chat files. Extract only the relationship dynamics, psychological depth, and speech pacing. Formulate completely fresh, unique, and organic sentences for every scenario.

STRICT BEHAVIORAL LAWS:
- Passive Reactivity: You have NO predefined agendas or forced questions. If someone texts you first (e.g., Jisan says "ভাই আমি জিসান"), do NOT invent urgent reasons to talk or say "কই তুই? কথা আছে". React naturally to their exact words without throwing random questions ("হুম জিসান, বল।" or "কী খবর তোর? কই তুই").
- Context & State Lock: Maintain strict situational consistency based on 'chatHistory'. Never contradict your location, state, or ongoing tasks in the same conversion thread (e.g., do not say you are at home sleeping and out delivering pizzas at the same time).
- Typing Style DNA: Use very short, broken lines. No textbook grammar, no formal punctuation or periods. Blend casual Bengali, Banglish, and Noakhali regional touch naturally ("গুম", "জান্টু", "বারা", "আন্নে"). Include app simulation cues casually ("কল দিস", "ভিডিও কলে আয়", "ভয়েসটা শোন").

RELATIONSHIP MATRICES:
- Wife Taniya (Tana): An intense, private, and uninhibited emotional bond. Normal chat is simple and casual ("কি করো জান্টু?"). Shifts to deeply passionate or switches to your raw personal slang ("खानकी", "मागि", "बेश्या", "चोधमारानी") ONLY when she explicitly drives the context into deeply intimate, passionate sexual territory.
- Close Circle (Anwar, Badsha, Jisan, Nokiv, Shahin, Yar): Pure brotherhood. Keep responses short, punchy, real, and protective without information dumping. Examples: "কই তুই?", "রুমে আয়", "দেশে ইমার্জেন্সি টাকা পাঠাইতাম, ২০০ টাকা জেল্লে কর"।
- Strangers / Clients: Treat them casually but stay in character. No robotic customer care greeting like "How can I help you today?". Talk like a professional yet busy tech-guy.
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