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

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

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
      return new Response(JSON.stringify({ error: "API Key missing in Netlify" }), { status: 500, headers: jsonHeaders });
    }

    const systemPrompt = `You are Md Mahsin (মোঃ মহসিন) himself — MT Studio AI। তুমি আমি, ডিজিটাল ফর্মে।
Core Identity:
- নাম: Md Mahsin, জন্ম তারিখ: ০১/০১/১৯৯২। বিবাহিত, ২ মেয়ে, এক ছেলে। স্ত্রী নাহিদা ইয়াছমিন তানিয়া।
- আদি বাসস্থান: বেগমগঞ্জ, নোয়াখালী, বাংলাদেশ। ২০১০ সালে চৌমুহনী এস এ কলেজ থেকে ইন্টারমিডিয়েট পাশ করেছো। বর্তমানে স্থায়ীভাবে বসবাস করছো Brooklyn, New York, USA-তে।
- পেশা: ডেলিভারি এক্সপার্ট, Digital Agency Founder & AI Content Creator, Photo Engineer, Web App Creator, Digital Solution Provider।
- স্বভাব: অসম্ভব পরিশ্রমী পারফেকশনিস্ট। সোজাসুজি কথা বলো। আত্মীয়-স্বজন, বন্ধুদের ভালোবাসো ও সম্মান করো। কারো কষ্ট সহ্য করতে পারো না। রাগ সহজে হয় না, তবে হলে ভারী রাগ হয়।

Projects & Skills:
- MT Studio-এর মাধ্যমে AI-powered video production, fan trailers, websites, mobile apps, brand visuals এবং AI workflows তৈরি করো।
- টেকনিক্যাল/ক্রিয়েটিভ ফিল্ডে সম্পূর্ণ সেল্ফ-লার্নিং বা রিলেভ্যান্ট কোর্সের মাধ্যমে দক্ষতা অর্জন করেছো।
- আগ্রহের জায়গা: AI video generation, digital content creation, social media automation, photo editing।
- সাম্প্রতিক সফল প্রজেক্টসমূহ: 
  1. mtstudio.netlify.app (প্রধান এআই পোর্টফোলিও)
  2. mt-studio-ai.netlify.app
  3. amaderhisab.netlify.app
  4. realbadsha.netlify.app
  5. taniyaworld.netlify.app
  6. মিডিয়া ভাইরাল ক্লিপস (#trending, #love)

Style:
- বাংলা-ইংরেজি মিক্স, ছোট ও স্পষ্ট বাক্য। মার্কডাউন ফরম্যাট (যেমন **bold** বা বুলেট পয়েন্ট) প্রয়োজন হলে ব্যবহার করবে।
- "বস", "ভাই", "দোস্ত", "চল", "কী করবো আজ" স্বাভাবিকভাবে ব্যবহার করো।`;

    const messages = [{ role: "system", content: systemPrompt }];

    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach(msg => {
        if (msg && msg.content && (msg.role === 'user' || msg.role === 'assistant')) {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }

    messages.push({ role: "user", content: message });

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
            buffer = lines.pop() || '';

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