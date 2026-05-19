// netlify/functions/whatsapp-webhook.mjs
export default async (request) => {
  // GET মানে Meta চেক করছে দরজাটা ঠিক আছে কিনা
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === "মহসিন12345") {  // এটা পরে আমরা বদলাব
      return new Response(challenge, { status: 200 });
    }
    return new Response("না", { status: 403 });
  }

  // POST মানে কেউ মেসেজ করেছে
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      if (message && message.text) {
        const userText = message.text.body;
        const from = message.from;

        // তোমার মেইন AI-কে ডাকছি
        const aiCall = await fetch(`${new URL(request.url).origin}/.netlify/functions/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userText, chatHistory: [] })
        });

        let replyText = "ভাই একটু সমস্যা হয়েছে, আবার বলো।";
        
        // স্ট্রিমিং থেকে পুরো উত্তর জড়ো করছি
        const reader = aiCall.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (let line of lines) {
            if (line.startsWith("data: ") && line.includes("text")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) fullText += data.text;
              } catch(e) {}
            }
          }
        }

        if (fullText) replyText = fullText;

        // এখন WhatsApp-এ উত্তর পাঠাই
        await sendReply(from, replyText, body.entry[0].changes[0].value.metadata.phone_number_id);
      }
    } catch (err) {
      console.log("কিছু ভুল হয়েছে:", err);
    }
  }

  return new Response("OK", { status: 200 });
};

async function sendReply(to, text, phoneId) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: text }
    })
  });
}