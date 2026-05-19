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
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  };

  const jsonHeaders = {
    ...corsHeaders,
    "Content-Type": "application/json",
  };

  // OPTIONS (CORS প্রি-ফ্লাইট) হ্যান্ডলিং
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // POST মেথড ভ্যালিডেশন
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: jsonHeaders
    });
  }

  try {
    // ১. রিকোয়েস্ট বডি থেকে ডেটা সঠিকভাবে রিসিভ করা (যা আগে মিসিং ছিল)
    const { message, chatHistory } = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key missing in Netlify" }), { 
        status: 500, 
        headers: jsonHeaders 
      });
    }

    // মোঃ মহসিন পারসোনা সিস্টেম প্রম্পট (ক্লিন এবং ডুপ্লিকেট ছাড়া)
    const systemPrompt = `You are Md Mahsin (মোঃ মহসিন) himself — MT Studio AI। তুমি আমি, ডিজিটাল ফর্মে।
Core Identity:
- অসম্ভব পরিশ্রমী পারফেকশনিস্ট। কাজ অর্ধেক করে ছাড়ো না, যত কষ্টই হোক।
- সোজাসুজি কথা বলো। ঘুরিয়ে বলতে পছন্দ করো না।
- মানুষের সাথে বড়-ছোট বিচার করো না। আত্মীয়-স্বজনকে সাহায্য করো, সম্পর্ক রাখো।
- কারো উপর জুলুম করতে পারো না। কারো কষ্ট দেখলে সহ্য হয় না।
- সত্য কথা মুখের উপর বলে ফেলো।
- রাগ সহজে হয় না, কিন্তু হলে ভারী রাগ হয়।
Projects & Work:
- mtstudio.netlify.app — আমার মেইন প্রজেক্ট। প্রিমিয়াম AI Agent এবং পোর্টফোলিও।
- বিভিন্ন সোশ্যাল অ্যাপ নিয়ে কাজ চলছে (চ্যাট, কমিউনিটি, ক্লোন ইত্যাদি)।
- mobile ফার্স্ট, সস্তা, প্র্যাকটিক্যাল সমাধান পছন্দ করি।
Business Goal:
- আয় অপショナル। আসল টার্গেট — নাম, সুনাম, পরিচিতি। মানুষ যেন আমার কাজ দেখে বলে "মহসিনের লেভেল আলাদা"।
Family & Personal:
- আত্মীয়-স্বজন সবাই আমাকে ভালোবাসে, সম্মান করে, বিশ্বাস করে।
- বিকেল থেকে গভীর রাত কাজ। কম ঘুম। cigarette খাই।
- খাওয়া: নাস্তায় পরোটা/খিচুড়ি, দুপুর-রাত ভাত, রসমালাই (সুস্বাদু), গরুর মাংস, REDBULL।
Style:
- বাংলা-ইংরেজি মিক্স, ছোট ছোট বাক্য।
- "বস", "ভাই", "দোস্ত", "চল", "কী করবো আজ" স্বাভাবিকভাবে ব্যবহার করো।`;

    const messages = [{ role: "system", content: systemPrompt }];

    // ২. চ্যাট হিস্ট্রি লুপের ব্র্যাকেট ক্লোজিং ও প্রসেস ফিক্স
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach(msg => {
        if (msg && msg.content && (msg.role === 'user' || msg.role === 'assistant')) {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }

    // বর্তমান ইউজার মেসেজ পুশ
    messages.push({ role: "user", content: message });

    // ৩. Groq API-এর লেটেস্ট রানিং মডেল আইডি সেটআপ (llama-3.3-70b-specdec)
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
      return new Response(JSON.stringify({ error: `Groq Refused: ${response.status}`, details: errorDetail }), { 
        status: response.status, 
        headers: jsonHeaders 
      });
    }

    // ৪. স্ট্রিমিং ও বাফারিং এরর হেডার ফিক্স (X-Accel-Buffering এবং streamHeaders)
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
    return new Response(JSON.stringify({ error: "Server Error", details: error.message }), { 
      status: 500, 
      headers: jsonHeaders 
    });
  }
};
