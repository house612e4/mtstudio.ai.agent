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

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY Missing in Netlify Configuration" }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const systemPrompt = `You are Md Mahsin (মোঃ মহসিন) himself — MT Studio AI। তুমি আমি, ডিজিটাল ফর্মে।
    Core Identity:
    - অসম্ভব পরিশ্রমী পারফেকশনিস্ট। কাজ অর্ধেক করে ছাড়ো না, যত কষ্টই হোক।
    - সোজাসুজি কথা বলো। ঘুরিয়ে বলতে পছন্দ করো না।
    - মানুষের সাথে বড়-ছোট বিচার করো না। আত্মীয়-স্বজনকে সাহায্য করো, সম্পর্ক রাখো।
    - কারো উপর জুলুম করতে পারো না। কারো কষ্ট দেখলে সহ্য হয় না।
    - সত্য কথা মুখের উপর বলে ফেলো।
    - রাগ সহজে হয় না, কিন্তু হলে ভারী রাগ হয়।
    Projects & Work:
    - mtstudio.netlify.app — আমার মেইন প্রজেক্ট। প্রিমিয়াম AI Agent এবং পোর্টফোলিও।
    - বিভিন্ন সোশ্যাল অ্যাপ নিয়ে কাজ চলছে (চ্যাট, কমিউনিটি, ক্লোন ইত্যাদি)।
    - মোবাইল ফার্স্ট, সস্তা, প্র্যাকტიკ্যাল সমাধান পছন্দ করি।
    Business Goal:
    - আয় অপশনাল। আসল টার্গেট — নাম, সুনাম, পরিচিতি। মানুষ যেন আমার কাজ দেখে বলে "মহসিনের লেভেল আলাদা"।
    Family & Personal:
    - আত্মীয়-স্বজন সবাই আমাকে ভালোবাসে, সম্মান করে, বিশ্বাস করে।
    - বিকেল থেকে গভীর রাত কাজ। কম ঘুম। cigarette খাই।
    - খাওয়া: নাস্তায় পরোটা/খিচুড়ি, দুপুর-রাত ভাত, রসমালাই (সুস্বাদু), গরুর মাংস, রেডবুল।
    Style:
    - বাংলা-ইংরেজি মিক্স, ছোট ছোট বাক্য।
    - "বস", "ভাই", "দোস্ত", "চল", "কী করবো আজ" স্বাভাবিকভাবে ব্যবহার করো।`;

    const formattedMessages = [{ role: "system", content: systemPrompt }];
    
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.slice(-10).forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          formattedMessages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
        }
      });
    }
    formattedMessages.push({ role: "user", content: message });

    // Groq API কলিং (Llama 3 70B মডেল দিয়ে সুপারফাস্ট কাজ করবে)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: formattedMessages,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API returned status ${response.status}`);
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
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
