// netlify/functions/agent.js

exports.handler = async function (event, context) {
  // ১. প্রি-ফ্লাইট (CORS) রিকোয়েস্ট হ্যান্ডেল করা (আইফোন বা ফ্রন্টএন্ড থেকে যেন ব্লক না হয়)
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
    // ৩. ফ্রন্টএন্ড থেকে পাঠানো ইউজারের মেসেজ বা ডেটা রিসিভ করা
    const { prompt } = JSON.parse(event.body || "{}");

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Prompt is required in the request body." }),
      };
    }

    // ৪. Netlify-তে সেট করা আপনার আসল AI API Key চেক করা (যেমন: OpenAI বা Gemini)
    // উদাহরণ হিসেবে এখানে OpenAI API ব্যবহার করা হয়েছে। আপনি চাইলে অন্য এপিআইও জুড়তে পারেন।
    const apiKey = process.env.AI_AGENT_SECRET_KEY; 
    
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "AI Agent API Key is missing in Netlify settings." }),
      };
    }

    // ৫. আসল এআই সার্ভারে এপিআই কল পাঠানো
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // অথবা আপনার পছন্দসই যেকোনো রিয়াল মডেল
        messages: [
          { role: "system", content: "You are a helpful online assistant managing tasks." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    // ৬. রেসপন্স চেক করা
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

    // ৭. ফ্রন্টএন্ডে আসল রেজাল্ট ফেরত পাঠানো
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, response: aiText }),
    };

  } catch (error) {
    // ৮. যেকোনো সিস্টেমেটিক বা নেটওয়ার্ক এরর হ্যান্ডেল করা
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error", message: error.message }),
    };
  }
};
