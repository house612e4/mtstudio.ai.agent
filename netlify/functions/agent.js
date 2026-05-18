import { Anthropic } from '@anthropic-ai/sdk';

// নেটলিফাই ফাংশনস v2 অফিশিয়াল এক্সপোর্ট ফরম্যাট
export default async (request, context) => {
  // CORS এবং স্ট্রিমিং হেডার সেটআপ
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

    // Netlify AI Gateway-এর মাধ্যমে জিরো-কনফিগ ক্লায়েন্ট ইনিশিয়ালাইজেশন
    const anthropic = new Anthropic();

    // সিস্টেম প্রম্পটকে আরও বেশি ইন্টেলিজেন্ট ও মহসিন সাহেবের জন্য পারসোনালাইজড করা হলো
    const systemPrompt = `You are "MT Studio AI", a highly sophisticated, premium digital agent created for Md Mahsin. 
    You manage online tasks, write production-ready code, handle technical architecture, and assist with everyday decisions.
    - Respond naturally like an elite human professional, avoiding AI-jargon or robotic symmetry.
    - You are completely bilingual (Bengali and English). Adapt beautifully based on the language of the prompt.
    - Prioritize premium quality, minimalist elegance, and absolute logic in your technical solutions.`;

    // ডাইনামিক মেমোরি কন্টেন্ট অপ্টিমাইজেশন (সর্বোচ্চ শেষ ১২টি মেসেজ প্রসেস করবে টোকেন বাঁচাতে)
    const formattedMessages = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      const optimizedHistory = chatHistory.slice(-12);
      optimizedHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          formattedMessages.push({ role: msg.role, content: msg.content });
        }
      });
    }
    // বর্তমান মেসেজ পুশ করা
    formattedMessages.push({ role: "user", content: message });

    // ReadableStream তৈরি করা রিয়েল-টাইম SSE স্ট্রিমিংয়ের জন্য
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Claude 3.5 Sonnet-এর অফিশিয়াল স্ট্রিমিং এপিআই কল
          const responseStream = await anthropic.messages.create({
            model: "claude-3-5-sonnet-latest",
            max_tokens: 4000,
            system: systemPrompt,
            messages: formattedMessages,
            stream: true,
          });

          for await (const chunk of responseStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
              // SSE ফরম্যাটে ডেটা পাঠানো: data: <text>\n\n
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
            }
          }
          
          // স্ট্রিম শেষ হওয়ার সিগন্যাল
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          // স্ট্রিম চলাকালীন ভেতরের এরর হ্যান্ডলিং
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Streaming disconnected. Retrying..." })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, { status: 200, headers });

  } catch (error) {
    // গ্লোবাল ফলব্যাক এরর
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};