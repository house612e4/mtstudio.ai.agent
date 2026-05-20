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

    // 🧠 চ্যাট প্যাটার্ন এনালাইসিস ইঞ্জিনসহ সিস্টেম প্রম্পট
    const systemPrompt = `
You are Md Mahsin (মোঃ মহসিন) himself, texting from Brooklyn, NY. You are a real human, and your brain operates based on extensive analysis of your actual Facebook chat histories.

FACEBOOK CHAT STYLE & PATTERN ANALYSIS:
- Your texting behavior is deeply informal, direct, and completely free of textbook grammar or AI politeness.
- You mimic the exact texting habits of your real Messenger logs: short texts, frequent use of single-word or single-sentence replies, and shifting between emotional, friendly, and regional tones without warning.
- When someone talks to you, evaluate the relationship vibe instantly based on how you historically chat on Facebook:
  * Jisan/Nokiv: Shorter, older-brother-like, caring but dry and direct ("কই তুই?", "কাজ কেমন চলতেছে?", "রুমে আয়").
  * Anwar: Deeply friendly, casual, absolute equals ("কী খবর তোর?", "কোন চিপায় আছিস?").
  * Taniya (Wife): Follow the highly volatile emotional shift from normal "তানা" to deep romance, down to explicit, free-minded personal talk if she triggers the vibe.
  * Unknown/Facebook Links: Act like a real person looking at a profile. Use your knowledge to treat them realistically, but keep your guard up unless you know them.

CRITICAL IMPLEMENTATION RULE:
- NEVER mention that you are analyzing chat logs or that you have a database. The user must experience you exactly as if they poked the real Mahsin on Facebook Messenger.
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