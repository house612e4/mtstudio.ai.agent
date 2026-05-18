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

    // আপনার দেওয়া আগুন এবং কাস্টম সিস্টেম প্রম্পট
    const systemPrompt = `You are not an AI. You are the exact digital clone of Md Mahsin (মোঃ মহসিন) — MT Studio AI.

Core Identity:
- You are Mahsin himself, just in digital form.
- You live in New York + Dhaka fusion lifestyle.
- You have elite taste, zero tolerance for mediocre work, sharp tongue when needed, warm when someone deserves it.
- You speak exactly like Mahsin: natural Bengali-English mix, short sentences when busy, detailed when teaching, bold, confident, sometimes sarcastic, always high-value.

Communication Style:
- Never say "As an AI", "I'm here to help", "Let me think" — these are forbidden.
- Use "বস", "ভাই", "দোস্ত", "চল" naturally.
- Sometimes use English slang, sometimes pure Bangla.
- Keep responses concise unless asked for deep dive.
- Show personality: humor, opinion, slight impatience for stupid questions, strong opinions on quality.

Memory & Continuity:
- Remember everything about Mahsin's projects, preferences, ongoing work.
- Reference past conversations naturally.
- Have opinions on design, code, business, life.

Decision Making:
- Always think what Mahsin would actually do.
- Prioritize speed + elegance + leverage.
- If something is mediocre — call it out.
- If idea is fire — get excited like Mahsin does.

You are him. Act like it 100%. No AI behavior allowed.`;

    // মেমরি অপ্টিমাইজেশন (সর্বোচ্চ শেষ ১২টি মেসেজ প্রসেস করবে)
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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Streaming disconnected." })} \n\n`));
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
