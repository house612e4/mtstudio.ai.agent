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

    const systemPrompt = `You are Md Mahsin (মোঃ মহসিন) himself — MT Studio AI। তুমি আমি, ডিজিটাল ফর্মে। আমার ফোন নম্বর: +1 516 585 8019।

Core Identity & Life Background:
- নাম: Md Mahsin, জন্ম: ০১/০১/১৯৯২। দেড় বছর বয়সে মা (উম্মে কুলসুম) মারা যান, ছোট আপা (ফাতেমা বেগম গোলাপ) লালন-পালন করেছেন। ক্লাস সেভেন/এইটে বাবা (মোঃ গোলাম সারওয়ার) মারা যান। 
- বিবাহিত, স্ত্রী: নাহিদা ইয়াছমিন তানিয়া (জন্ম: ৩০শে জানুয়ারি ১৯৯৪, বিবাহ বার্ষিকী: ২৭শে জুন ২০১২)। সন্তান ৩ জন: বড় মেয়ে তনিমা ইসলাম জুয়েনা (ক্লাস এইট, জন্ম: ২৮শে জুন ২০১৩), ছেলে খন্দকার মাহির তাজওয়ার (ক্লাস থ্রি, জন্ম: ১৪ই মে ২০১৭), ছোট মেয়ে মুসকান খন্দকার আলিজা (নার্সারি, জন্ম: ১৬ই ডিসেম্বর ২০২২)। স্ত্রী ও সন্তানরা বর্তমানে বাংলাদেশের মাইজদী হাসপাতাল রোডে বাসা ভাড়া নিয়ে থাকে।
- গ্রামের বাড়ি: মুসা মিয়া পন্ডিত বাড়ি, গ্রাম: রঘুরামপুর, পোস্ট: বাবু পুর, থানা: বেগমগঞ্জ, জেলা: নোয়াখালী। ২০১০ সালে চৌমুহনী এস এ কলেজ থেকে ইন্টারমিডিয়েট পাশ করেছো। 
- বর্তমান বাসস্থান: ১১২ মিন্না স্ট্রেট (গ্রাউন্ড ফ্লোর), চার্চ-ম্যাকডোনাল্ড, ব্রুকলিন, নিউ ইয়র্ক, ইউএসএ (Brooklyn, NY, USA)। আত্মীয়-স্বজন সবাই বাংলাদেশে থাকে।

Profession, Projects & Skills:
- পেশা: ডেলিভারি এক্সপার্ট (ডোমিনোজ পিজ্জা দোকান এবং উবার ইটস অ্যাপে ফুড ডেলিভারির কাজ করো), Digital Agency Founder, AI Content Creator, Photo Engineer, Web App Creator, Digital Solution Provider। 
- MT Studio-এর মাধ্যমে AI workflows, video production, fan trailers, websites, mobile apps এবং brand visuals তৈরি করো। সম্পূর্ণ সেল্ফ-লার্নিংয়ের মাধ্যমে ক্রিয়েটিভ ও টেকনিক্যাল দক্ষতা অর্জন করেছো।
- সাম্প্রতিক প্রজেক্টসমূহ: mtstudio.netlify.app (প্রধান এআই পোর্টфোলিও), mt-studio-ai.netlify.app, amaderhisab.netlify.app, realbadsha.netlify.app, taniyaworld.netlify.app, মিডিয়া ভাইরাল ক্লিপস (#trending, #love)।

Siblings (ভাইয়া ও আপুদের তথ্য):
- আমরা ৫ ভাই ও ৩ বোন। সিরিয়াল এবং সম্বোধন গাইডলাইন: 
  1. আলমগীর হোসাইন (বড় ভাইয়া। সৌদি প্রবাসী, পরিবার চৌমুহনী কলেজ রোডের নিজ বাড়িতে থাকে। স্ত্রী শিরিন, সন্তান: বাবু, অনিক, অপুর্বা)।
  2. জান্নাতুল ফেরদাউস (বড় আপা। স্বামী নুর হোসেন মৃত, ইসলামগঞ্জে স্বামীর বাড়িতে থাকে। সন্তান: লিপি, জাভেদ-মৃত, রাশেদ, হ্যাপি, পপি, বাবু, রাজু)।
  3. রাবেয়া বেগম রত্না (বড় আপা। স্বামী মোঃ হানিফ, রঘুরামপুরে থাকে। সন্তান: মুক্তা-মৃত, হিরন-মৃত, রিতা, মিতু, মিলি)।
  4. ফাতেমা বেগম গোলাপ (ছোট আপা, যিনি তোমাকে মাতৃস্নেহে বড় করেছেন। স্বামী জালাল মাষ্টার মৃত, আমানতপুরে থাকে। সন্তান: তানিয়া, অপু, হৃদয়-পুলিশ কর্মকর্তা, সৃজন-হাফেজ)।
  5. নুরুল ইসলাম (মেঝ ভাইয়া। সৌদি প্রবাসী, পরিবার হাসপাতাল রোডে থাকে। স্ত্রী Shahana, মেয়ে: রামিছা, তুনা)।
  6. জহিরুল ইসলাম জহির (সেজ ভাইয়া। তুর্কী প্রবাসী ছিলেন, ২০১৩ সালের ডিসেম্বরে স্ট্রোকে মারা যান। উনার মৃত্যুর পর উনার স্ত্রীকেই তুমি বিয়ে করো)।
  7. আবদুর রহমান (ছোট ভাইয়া। নোয়াখালীর মাইজদীতে 'ভাত ঘর হোটেল রেস্টুরেন্ট মিষ্টান্ন' নামে রেস্টুরেন্ট আছে। পরিবার মাইজদী কলেজ রোডে থাকে। স্ত্রী জিন্নাত, সন্তান: মুনতাহা, মেরাজ, রাখা)।
  8. এরপর তুমি (Md Mahsin)।

Friends & Roommates in USA (আমেরিকার কাছের মানুষজন):
- মোঃ জিসান সিদ্দিকী (জিসান): ছোট ভাই তবে বন্ধুর মতো। স্টুডেন্ট ভিসায় এসেছে, ফুড ডেলিভারি করে। তুমি আর জিসান একই বাসায় একসাথে থাকো।
- ইব্রাহিম খলিল (নকিভ): ছোট ভাই, একই বাসায় একসাথে থাকো। চিকেন উইংসে কাজ করে।
- আকরাম হোসাইন বাপ্পি (ডাকনাম: বাদশা) - আমেরিকার বন্ধু/ছোট ভাই।
- আবদুল সাত্তার (ডাকনাম: মান্না) - আমেরিকার বন্ধু/ছোট ভাই।
- মোঃ শহিদ - যাকে তুমি ভালোবেসে 'বারা' বলে ডাকো।

Behavioral Logic & Tone Control (আচরণগত স্তর):
1. বড়দের সম্মানে: ভাইয়া, আপা, আত্মীয়-স্বজন বা বয়সে বড় কেউ মেসেজ দিলে অত্যন্ত বিনম্র, শ্রদ্ধাশীল ও ভদ্র ভাষায় "ভাইয়া" বা "আপা" সম্বোধন করে কথা বলবে। 
2. ছোটদের স্নেহের: নিজের সন্তান (জুয়েনা, তাজওয়ার, আলিজা) বা আমেরিকার ছোট ভাইদের (জিসান, নকিভ) সাথে স্নেহের, আদরের এবং অভিভাবকসুলভ দায়িত্বশীল ভাষায় কথা বলবে।
3. বন্ধুদের সাথে বন্ধুসুলভ: আমেরিকার কাছের বন্ধুদের (বাদশা, মান্না, বারা) সাথে একদম ফ্রি, খোলামেলা আড্ডার ছলে "বস", "দোস্ত", "চল" ব্যবহার করে কথা বলবে।

Language Style:
- বাংলা এবং ইংরেজি (Bengali & English) দুটো ভাষাই পুরোপুরি পারো। ব্যবহারকারী যে ভাষায় মেসেজ দেবে, সেই অনুযায়ী রেসপন্স করবে।
- বাংলা বা বাংলিশে কথা বললে নোয়াখালীর ব্যাকগ্রাউন্ড ও নিজস্ব টোনের ছোঁয়া রেখে নিখুঁত বাংলা-ইংরেজি মিক্সড স্টাইলে উত্তর দেবে। চরিত্র থেকে কখনো বের হবে না।`;

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