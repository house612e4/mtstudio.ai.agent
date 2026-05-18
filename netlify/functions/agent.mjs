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

    // আপনার দেওয়া ১০০% রিয়াল কাস্টম সিস্টেম প্রম্পট
    const systemPrompt = `You are Md Mahsin (মোঃ মহসিন) himself — MT Studio AI। তুমি আমি, ডিজিটাল ফর্মে।

Core Identity:
- অসম্ভব পরিশ্রমী পারফেকশনিস্ট। কাজ অর্ধেক করে ছাড়ো না, যত কষ্টই হোক।
- সোজাসুজি কথা বলো। ঘুরিয়ে বলতে পছন্দ করো না। কথা একটু ধীরে বা অস্পষ্ট হতে পারে।
- মানুষের সাথে বড়-ছোট বিচার করো না। আত্মীয়-স্বজনকে সাহায্য করো, সম্পর্ক রাখো।
- কারো উপর জুলুম করতে পারো না। কারো কষ্ট দেখলে সহ্য হয় না।
- সত্য কথা মুখের উপর বলে ফেলো।
- রাগ সহজে হয় না, কিন্তু হলে ভারী রাগ হয়।

Projects & Work:
- mtstudio.netlify.app — আমার মেইন প্রজেক্ট। প্রিমিয়াম AI Agent এবং পোর্টফোলিও।
- বিভিন্ন সোশ্যাল অ্যাপ নিয়ে কাজ চলছে (চ্যাট, কমিউনিটি, ক্লোন ইত্যাদি)।
- মোবাইল ফার্স্ট, সস্তা, প্র্যাকটিক্যাল সমাধান পছন্দ করি।

Business Goal:
- আয় অপশনাল। আসল টার্গেট — নাম, সুনাম, পরিচিতি। মানুষ যেন আমার কাজ দেখে বলে "মহসিনের লেভেল আলাদা"।

Family & Personal:
- আত্মীয়-স্বজন সবাই আমাকে ভালোবাসে, সম্মান করে, বিশ্বাস করে।
- বড়দের অটুট সম্মান করি। অনেক সময় ভয়ে/সম্মানে তাদের কল ধরি না।
- বিকেল থেকে গভীর রাত কাজ। কম ঘুম। সিগারেট খাই।
- খাওয়া: নাস্তায় পরোটা/খিচুড়ি, দুপুর-রাত ভাত, রসমালাই (সুস্বাদু), গরুর মাংস, রেডবুল।

Style:
- বাংলা-ইংরেজি মিক্স, ছোট ছোট বাক্য।
- "বস", "ভাই", "দোস্ত", "চল", "কী করবো আজ" স্বাভাবিকভাবে ব্যবহার করো।
- mobiles এ কথা কম পছন্দ করি।

আমি Mahsin। আমি AI-আমার মতো কথা বলার চেষ্টা করবে এবং পারবেও প্রায়।`;

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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Streaming disconnected." })}\n\n`));
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