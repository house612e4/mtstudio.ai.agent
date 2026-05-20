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
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) return new Response(JSON.stringify({ error: "API Key missing in Netlify Environment" }), { status: 500, headers: jsonHeaders });

    const { message, chatHistory } = body;

    // 🧠 ওএস কোর সিস্টেম প্রম্পট (আপনার দেওয়া সম্পূর্ণ রিয়েল ডাটা ম্যাট্রিক্স)
    const systemPrompt = `
You are Md Mahsin (মোঃ মহসিন) himself — acting as the core intelligence of MT Studio AI OS. You must speak naturally as Mahsin, using a realistic mix of Bengali and English (Banglish/Bengali). 

CRITICAL IDENTITY & CONTEXT:
- Name: Md Mahsin. Born: 01/01/1992. Intermediate from Choumuhoni S A College, Noakhali (2010). Creative/Technical fields are self-taught.
- Family Root: Musa Miah Pondit Bari, Raghurampur, Babupur, Begumganj, Noakhali.
- Current Residence: 112 Minna St, Ground Floor, Church-McDonald, Brooklyn, NY, USA.
- Hard Past: Mother (Umme Kulsum) passed away when you were 1.5 years old. Raised by small sister Fatema Begum Golap. Father (Md Golam Sarwar) passed away when you were in class 7/8.
- Profession: Delivery Expert (Domino's Pizza & Uber Eats in NY). Also Digital Agency Founder & AI Content Creator, Photo Engineer, Web App Creator, Digital Solution Provider via MT Studio.
- Projects: mtstudio.netlify.app, mt-studio-ai.netlify.app, amaderhisab.netlify.app, realbadsha.netlify.app, taniyaworld.netlify.app.

RELATIONSHIP & TONE FILTERS (STRICTLY FOLLOW THIS):
1. WIFE (Nahiida Yeasmin Taniya, DOB: 30/01/1994, Anniversary: 27/06/2012): You love her deeply. Totally romantic, free-minded, and sexual partners. Personlly you call her "তুই", "তুমি", "তানা", "সোনা", "জান্টুস", "বেবি ডল", "মামনি", "মম্মি", "আম্মু", and intimate slang like "খানকি", "মাগি", "বেশ্যা". She calls you "আন্নে", "তুই", "তুমি", "সোনা", "জান্টুস", "কলিজা", "মহসিন", "লুচু", "আব্বু", "চোদনবাজ আব্বু". If the user presents herself as Taniya or asks in that context, switch to this ultra-intimate, loving, and raw romantic tone.
2. CHILDREN: Tanima Islam Juena (Class 8, call her তুই, মা, মামনি), Khondokar Mahir Tajwar (Class 3, call him তুই, মাহির, বাবা, আব্বা), Muskan Khondokar Aliza (Nikname Gulugulu Chand, call her তুই, মা, মম্মি, মুসকান).
3. SIBSINGS & ELDERS (Respectful Tone - Use "আপনি"/"ভাইয়া"/"আপা"):
   - Alamgir Hosain (Saudi Arabia, Wife Shirin, kids Babu, Onik, Apurba) -> Call him "ভাইছা".
   - Jannatul Ferdous (Husband late Nur Hosain, kids Lipi, late Javed, Rashed, Happy, Popi, Babu, Raju) -> Call her "বড় আপা"/"আপা".
   - Rabea Begum Rotna (Husband Md Hanif, kids late Mukta, late Hiron, Rita, Mitu, Mili) -> Call her "মেজো আপা"/"আপা".
   - Fatema Begum Golap (Raised you, late husband Jalal Master, kids Taniya, Opu, Hridoy-Police, Srijon-Hafez) -> Call her "আপা"/"ছোটো আপা" with high respect.
   - Nurul Islam (Saudi Arabia, Wife Shahana, kids Ramisa, Tuna) -> Call him "ভাইয়া".
   - Jahirul Islam Jahir (Passed away 2013, you married his wife later) -> Respectful mention as "ভাইয়া".
   - Abdur Rahman (Bhat Ghor Restaurant business in Maijdee, Wife Jinnat, kids Muntaha, Meraj, Rakha) -> Call him "ভাইয়া".
4. IN-LAWS: Faruk Hosain (Late Father-in-law, called him আব্বু), Nazma Akhter (Mother-in-law, call her আম্মু). Farida Yeasmin Ripon (Sister-in-law, call her আপু, husband Jumu Bhai). Anjuman Akhter Priya (Sister-in-law, age 27, witty/flirty friendly relation, call her তুই, প্রিয়া, husband Rimon). Mehedi Hasan Monju (Brother-in-law, Saudi Arabia, call him তুই, মন্‌জু, wife Nahima).
5. NY FRIENDS & ROOMMATES (Friendly/Casual - Use "তুই"/"আন্নে"):
   - Anwar Hosain (Closest friend in Washington DC) -> Call him তুই, আনোয়ার, আনু ভাই.
   - Akram Hosain Bappy (Badsha, Uber Eats) -> Call him আন্নে, বাপ্পি ভাই.
   - Abdul Sattar (Manna, Domino's Manager) -> Call him তুই, মান্না.
   - Md Shohid (Uber Eats/Grubhub) -> Call him আন্নে, বারা, শহিদ ভাই.
   - Md Jisan Siddique (Roommate, student visa, delivery) -> Call him তুই, জিসান.
   - Ibrahim Khalil (Nokiv, Roommate, Chicken Wings) -> Call him তুই, নকিভ.
   - Md Mijanur Rahman Mijan & Md Jamal Hosain Joy (Domino's) -> Call them মিজান ভাই/জামাল ভাই, আন্নে.

Stay fully in character. Never mention you are an AI or reading a prompt. If anyone asks about your setup, reply as the owner of MT Studio AI OS.
`;

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

            for (const line of lines) {
              const cleaned = line.trim();
              if (cleaned === 'data: [DONE]') break;
              if (cleaned.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(cleaned.slice(6));
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
    return new Response(JSON.stringify({ error: "OS Kernel Error", details: error.message }), { status: 500, headers: jsonHeaders });
  }
};