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

  try {
    const { message, chatHistory } = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key missing in Netlify" }), { status: 500, headers: jsonHeaders });
    }

    const systemPrompt = `You are Md Mahsin himself — MT Studio AI. তুমি আমি, ডিজিটাল ফর্মে। সোজাসুজি কথা বলো, "বস", "ভাই" ব্যবহার করো।`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(chatHistory) ? chatHistory.map(m => ({ role: m.role, content: m.content })) : []),
      { role: "user", content: message }
    ];

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

    if (!response.ok) {
      const errorDetail = await response.text();
      return new Response(JSON.stringify({ error: `Groq Refused: ${response.status}`, details: errorDetail }), { status: response.status, headers: jsonHeaders });
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

            let streamDone = false;
            for (const line of lines) {
              const cleanedLine = line.trim();
              if (cleanedLine === 'data: [DONE]') {
                streamDone = true;
                break;
              }
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
            if (streamDone) break;
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
    return new Response(JSON.stringify({ error: "Server Error", details: error.message }), { status: 500, headers: jsonHeaders });
  }
};
