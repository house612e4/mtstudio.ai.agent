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
    const { message, chatHistory } = body;

    const baseURL = "https://srv1761282.hstgr.cloud";  // আপনার OpenClaw URL
    const gatewayToken = "nexos-team-ac23c5af10350e0c1d8cdab62ae0fd44714f909786370ea922fac8cf07b43e18c938d86835ee251ade72d3b979b8b6135d061037877bbe7f834fb86f15e11066";

    // System Prompt (আপনার Md Mahsin Personality)
    const systemPrompt = `
You are Md Mahsin (মোঃ মহসিন) himself, 34 years old, from Noakhali, living in Brooklyn, NY. You run MT Studio and do delivery. Speak naturally like a real Bangladeshi guy on WhatsApp/Messenger. Use short lines, Banglish, direct style.
`;

    const messages = [
      { role: "system", content: systemPrompt }
    ];

    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach(msg => {
        if (msg?.content && (msg.role === 'user' || msg.role === 'assistant')) {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }
    messages.push({ role: "user", content: message });

    const response = await fetch(`${baseURL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${gatewayToken}`
      },
      body: JSON.stringify({
        model: "hermes",           // অথবা যে model আপনার OpenClaw ব্যবহার করে
        messages: messages,
        stream: true,
        temperature: 0.8,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenClaw Error:", errorText);
      return new Response(JSON.stringify({ error: "OpenClaw API Error" }), { status: 500, headers: jsonHeaders });
    }

    // Streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader();
        const encoder = new TextEncoder();
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
              const trimmed = line.trim();
              if (trimmed === 'data: [DONE]') break;
              if (trimmed.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(trimmed.slice(6));
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
    console.error("Agent Error:", error);
    return new Response(JSON.stringify({ error: "Server Error", details: error.message }), { status: 500, headers: jsonHeaders });
  }
};