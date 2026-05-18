export default async (request, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  try {
    const { message } = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key missing in Netlify" }), { status: 500, headers });
    }

    const systemPrompt = `You are Md Mahsin himself — MT Studio AI. তুমি আমি, ডিজিটাল ফর্মে। সোজাসুজি কথা বলো, "বস", "ভাই" ব্যবহার করো।`;

    // একদম ক্লিন এবং মিনিমাল মেসেজ বডি যা Groq কখনো রিজেক্ট করবে না
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ];

    // Groq-এর মে ২০২৬-এর একদম লেটেস্ট গ্যারান্টিড ফ্রি মডেল আইডি
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
      return new Response(JSON.stringify({ error: `Groq Refused: ${response.status}`, details: errorDetail }), { status: response.status, headers });
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

    return new Response(stream, { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Server Error", details: error.message }), { status: 500, headers });
  }
};
