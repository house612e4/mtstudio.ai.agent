import { Anthropic } from '@anthropic-ai/sdk';

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

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
      status: 405, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  try {
    const { message, chatHistory } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const anthropic = new Anthropic();

    const systemPrompt = `You are "MT Studio AI", a highly sophisticated, premium digital agent created for Md Mahsin. 
    You manage online tasks, write production-ready code, handle technical architecture, and assist with everyday decisions.
    - Respond naturally like an elite human professional, avoiding AI-jargon or robotic symmetry.
    - You are completely bilingual (Bengali and English). Adapt beautifully based on the language of the prompt.
    - Prioritize premium quality, minimalist elegance, and absolute logic in your technical solutions.`;

    const formattedMessages = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      const optimizedHistory = chatHistory.slice(-12);
      optimizedHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          formattedMessages.push({ role: msg.role, content: msg.content });
        }
      });
    }
    formattedMessages.push({ role: "user", content: message });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // ১০০% রিয়েল এবং অফিশিয়াল ক্লোড মডেল আইডি
          const responseStream = await anthropic.messages.create({
            model: "claude-3-5-sonnet-latest",
            max_tokens: 4000,
            system: systemPrompt,
            messages: formattedMessages,
            stream: true,
          });

          for await (const chunk of responseStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
            }
          }
          
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Streaming disconnected. Retrying..." })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};