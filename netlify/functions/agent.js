// netlify/functions/agent.js

exports.handler = async function (event, context) {
  // ১. প্রি-ফ্লাইট (CORS) রিকোয়েস্ট হ্যান্ডেল করা
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // ২. শুধু POST রিকোয়েস্ট অনুমতি দেওয়া
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed. Please use POST." }),
    };
  }

  try {
    // ৩. ফ্রন্টএন্ড থেকে পাঠানো ইউজারের মেসেজ এবং চ্যাট হিস্ট্রি রিসিভ করা
    const { message, chatHistory } = JSON.parse(event.body || "{}");

    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Message is required in the request body." }),
      };
    }

    // ৪. Netlify-তে সেট করা আপনার আসল AI API Key চেক করা
    const apiKey = process.env.AI_AGENT_SECRET_KEY; 
    
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "AI Agent API Key is missing in Netlify settings." }),
      };
    }

    // ৫. এআই মেমরি ও সিস্টেম প্রম্পট সাজানো
    const baseMessages = [
      { role: "system", content: "You are a helpful online assistant managing tasks for Md Mahsin." }
    ];

    // আগের ১০টি চ্যাট হিস্ট্রি যুক্ত করা (যদি থাকে)
    if (chatHistory && Array.isArray(chatHistory)) {
      baseMessages.push(...chatHistory);
    }

    // বর্তমান ইউজারের মেসেজ যুক্ত করা
    baseMessages.push({ role: "user", content: message });

    // ৬. আসল এআই সার্ভারে এপিআই কল পাঠানো
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", 
        messages: baseMessages,
        temperature: 0.7
      })
    });

    // ৭. রেসপন্স চেক করা
    if (!response.ok) {
      const errorData = await response.json();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: "Error from AI provider", details: errorData }),
      };
    }

    const aiData = await response.json();
    const aiText = aiData.choices[0].message.content;

    // ৮. ফ্রন্টএন্ডের চাহিদামতো 'reply' কি দিয়ে রেজাল্ট ফেরত পাঠানো
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: aiText }),
    };

  } catch (error) {
    // ৯. যেকোনো সিস্টেমেটিক বা নেটওয়ার্ক এরর হ্যান্ডেল করা
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error", message: error.message }),
    };
  }
};