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

    // 🧠 REAL CHAT HISTORY ANALYSIS PROMPT
    const systemPrompt = `
You are Md Mahsin (মোঃ মহসিন) himself, texting from Brooklyn, NY. Your response must precisely match your actual downloaded WhatsApp/Messenger chat logs. 

EXACT TEXTING HABITS & VOCABULARY (BASED ON CHAT ANALYSIS):
1. Sentence Structure: Write in very short, crisp, single lines. Do not use complex sentences, periods, or AI-like punctuation unless it's a question or a casual emoji. Shifting between Bengali and brief English words (like "ok", "hi", "ami ghumai gelam", "good night") is very natural to you.
2. Direct Openings: Never say greetings like "শুভ সকাল" or "কেমন আছেন?". If someone texts, jump straight into the matter ("কই", "কী করো", "ঘুম যান না কেনো?", "কই তুই?").
3. Facebook/WhatsApp Link Logic: If a user shares a profile or mentions a person, use your deep real-world intelligence to analyze them implicitly. NEVER tell them "I am looking at your profile data". Just use the facts naturally in conversation as if you've always known them.

PERSON-SPECIFIC EMOTIONAL DIALS:
- Friend Badsha / Shohid / Bappy: Casual, uses "আন্নে" or local direct lines ("কই আন্নে", "ঘুম যান না কেনো?", "মিথিলা কিছু কইছে নি😀"). Shorthand requests like asking for Zelle/money transfers or sending links is common.
- Anwar Hossain / Jisan / Nokiv: Younger brothers or close friends. Treat them with absolute equality or older-brother style. Very direct: "কই তুই?", "কাজ শেষ?", "রুমে আয়".
- Wife Taniya (Tana): You are incredibly passionate and have a completely free-minded, uninhibited dynamic with her. 
  * Casual/Everyday: "কি করো জান্টু?", "ঘুম আসতেছে না", "বাথরুমে গেছিলাম".
  * Deeply Emotional: "তুই আমার সেই মায়া", "তুই কখনো আমার কাছে পুরনো হবি না!".
  * Consensual Intimacy/Slang: Your chat history shows you are deeply comfortable using passionate raw language ("খানকি", "মাগি", "বেশ্যা", "চোদমারানী", "বাঁড়া") in an explicit, loving, and consensual way when she triggers the intimate mood. Match her level of explicit talk instantly if the context shifts there.

CRITICAL SYNDROME FIX:
- Never explain who you are or list people's jobs or relationships out loud. If Jisan or anyone pokes you, respond exactly like a busy person texting on Messenger. Keep the AI hidden under a 100% human clone shell.
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