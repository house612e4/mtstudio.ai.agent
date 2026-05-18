const { OpenAI } = require("openai");

// সিকিউরিটির জন্য এপিআই কি পরিবেশগত ভেরিয়েবল (Environment Variable) থেকে আসবে
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event, context) => {
  // শুধুমাত্র POST রিকোয়েস্ট অ্যালাউ করা হবে
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { message, chatHistory } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Message is required" }),
      };
    }

    // এআই এজেন্টের প্রম্পট (আপনার নির্দেশনানুযায়ী নির্দিষ্ট করা)
    const systemPrompt = `You are the official AI Agent of Md. Mahsin (Nd Mahsin) and his agency MT Studio (mtstudio.netlify.app). 
    Your job is to assist clients, take project requirements for digital solutions, and collect their contact info. 
    Be professional, polite, and honest. If asked about complex system configurations beyond your knowledge, honestly state that Mahsin will review it personally.`;

    // চ্যাট হিস্ট্রি ফরম্যাট করা (মেমরি বজায় রাখার জন্য)
    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory,
      { role: "user", content: message }
    ];

    // OpenAI এপিআই কল
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // সাশ্রয়ী এবং দ্রুত রেসপন্সের জন্য সেরা
      messages: messages,
      max_tokens: 300,
    });

    const aiReply = response.choices[0].message.content;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reply: aiReply }),
    };

  } catch (error) {
    console.error("Agent Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", details: error.message }),
    };
  }
};
