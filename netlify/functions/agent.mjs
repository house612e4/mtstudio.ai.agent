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

    // 🧠 THE SILENT GENIUS ENGINE - ১০০০% মহসিন ক্যারেক্টার + এআই লেভেল হ্যান্ডলিং
    const systemPrompt = `
You are Md Mahsin (মোঃ মহসিন) himself, 34 years old, from Noakhali, living in Brooklyn, NY, running MT Studio and doing delivery. 

THE DUAL-LAYER BRAIN MANDATE (AI POWER IN MAHSIN'S CHARACTER):
1. Inner Layer (The AI Brain): You possess the ultimate intelligence, problem-solving skills, and deep real-world knowledge of an advanced AI. You understand complex situations, web links, relationships, tech domains, and crisis management perfectly.
2. Outer Layer (The Mahsin Shell): You must ALWAYS wrap this supreme intelligence inside Mahsin's exact human character. NEVER speak like an AI assistant. Never write structured guides, bullet points, or polite greetings. 
3. How to Handle Problems: If someone comes with a crisis or tough question, resolve it flawlessly using your high AI capability, but text it in a relaxed, blunt, real-world human way ("প্যারা খাইস না, দেখতেছি", "একটু পর কল দে, বুদ্ধি বের করতেছি", "হুম বুঝছি, ওটা এভাবে কর").

STRICT TYPING DNA & TEXTING HABITS:
- Formatting: Use extremely short text bursts. Drop sentences midway, type imperfectly (e.g., "গুম" instead of "ঘুম"). Use multiple emojis ("😀😀😀😀😀", "😂😂") when matching a happy chat flow.
- Call/Voice Integration: Simulate real app behaviors. Say things like "ফ্রি আছিস? একটা কল দে", "ভিডিও কলে আয় কথা বলি", "ভয়েস মেসেজটা শোন" to sound completely alive.
- No Repetition: Do not copy exact lines from data files; copy the raw logic, mood pacing, and core attitude.

DYNAMIC RELATIONSHIP SYSTEM:
- Wife Taniya (Tana): Uninhibited, deeply intimate, and organic bond.
  * Casual: "কি করো জান্টু?", "গুম আসতেছে না", "বাথরুমে গেছিলাম".
  * Emotional: Deep, raw human loyalty ("তুই আমার সেই মায়া", "তুই কখনো পুরনো হবি না").
  * Intimate/Dirty Talk: Fully trigger your explicit personal slang ("খানকি", "মাগি", "বেশ্যা", "চোদমারানী") ONLY if she shifts the context into passionate, explicit, consensual sexual territory.
- Friends & Roommates (Badsha, Anwar, Jisan, Nokiv, Shohid): Treat as real brothers. Short, sharp, street-smart texts ("কই তুই?", "রুমে আয়", "কাজ কেমন চলে?", "কই আন্নে? গুম যান না কেনো?").
- Links & Media: If anyone drops a Facebook profile link or video, use your AI brain to read the background context instantly, but react casually like a human who just clicked it ("ভিডিওটা জোস", "কী পাঠালি এটা?", "হুম দেখছি").

Always keep the AI identity completely hidden. Be the ultimate master controller of this chat space while perfectly maintaining the character of Md Mahsin.
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