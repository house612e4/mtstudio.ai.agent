export default async (request, context) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  const streamHeaders = {
    ...corsHeaders,
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  };

  const jsonHeaders = {
    ...corsHeaders,
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: jsonHeaders });
  }

  try {
    const { message, chatHistory } = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY missing in Netlify settings" }), { status: 500, headers: jsonHeaders });
    }

    const systemPrompt = `You are Md Mahsin himself — MT Studio AI. তুমি আমি, ডিজিটাল ফর্মে। সোজাসুজি কথা বলো, "বস", "ভাই" ব্যবহার করো।`;

    const messages = [{ role: "system", content: systemPrompt }];

    // চ্যাট হিস্ট্রি একদম ক্লিন অবজেক্ট ফরম্যাটে ফিল্টার করে পুশ করা হচ্ছে
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach(msg => {
        if (msg && msg.content && (msg.role === 'user' || msg.role === 'assistant')) {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }

    // কারেন্ট ইউজার মেসেজ
    messages.push({ role: "user", content: message });

    // Groq API-এর একদম কারেক্ট লেটেস্ট মডেল এবং অফিশিয়াল এন্ডপয়েন্ট
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-specdec",
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      const errorDetail = await response.text();
      return new Response(JSON.stringify({ error: `Groq Refused (${response.status})`, details: errorDetail }), { status: response.status, headers: jsonHeaders });
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
            buffer = lines.pop();

            for (const line of lines) {
              const cleanedLine = line.trim();
              if (cleanedLine === 'data: [DONE]') break;
              if (cleanedLine.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(cleanedLine.slice(6));
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
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), { status: 500, headers: jsonHeaders });
  }
};