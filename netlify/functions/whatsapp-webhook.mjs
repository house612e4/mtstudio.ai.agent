import crypto from "crypto";

// Meta X-Hub-Signature Verification Helper
function verifySignature(payload, signature, appSecret) {
  if (!signature) return false;
  const elements = signature.split("=");
  const signatureHash = elements[1];
  const expectedHash = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signatureHash, "hex"), Buffer.from(expectedHash, "hex"));
}

// Firestore Database Sync Handler (REST API)
async function getFirestoreHistory(senderPhone, projectId) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/whatsapp_sessions/${senderPhone}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.fields || !data.fields.messages) return [];
    
    return data.fields.messages.arrayValue.values.map(v => {
      const parts = v.stringValue.split("||");
      return { role: parts[0], content: parts[1] };
    });
  } catch (e) {
    return [];
  }
}

async function saveFirestoreHistory(senderPhone, historyArray, projectId) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/whatsapp_sessions/${senderPhone}`;
  
  const firestoreValues = historyArray.map(msg => ({
    stringValue: `${msg.role}||${msg.content}`
  }));

  const body = {
    fields: {
      messages: {
        arrayValue: { values: firestoreValues }
      }
    }
  };

  try {
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (e) {
    console.error("Firestore Save Error:", e);
  }
}

export default async (request) => {
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
  const whatsappAppSecret = process.env.WHATSAPP_APP_SECRET;

  // GET: Meta Verification
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === "mahsintest123") {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // POST: Incoming Events
  if (request.method === "POST") {
    try {
      const rawBody = await request.text();
      const signature = request.headers.get("x-hub-signature-256");

      if (whatsappAppSecret && !verifySignature(rawBody, signature, whatsappAppSecret)) {
        return new Response("Invalid Signature", { status: 401 });
      }

      const body = JSON.parse(rawBody);
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messageObj = value?.messages?.[0];

      if (messageObj && messageObj.text?.body) {
        const senderPhone = messageObj.from;
        const incomingText = messageObj.text.body;
        const phoneId = value.metadata?.phone_number_id;
        const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;

        let historicalContext = [];
        if (firebaseProjectId) {
          historicalContext = await getFirestoreHistory(senderPhone, firebaseProjectId);
        }

        const identityPrompt = `You are Md Mahsin (মোঃ মহসিন) himself — MT Studio AI. Speak directly as yourself using a mix of Bengali and English. You live in Brooklyn, originally from Noakhali. Act completely natural and authentic. Maintain respectful tone to elders (using "ভাইয়া"/"আপা"), affectionate to juniors (like roommate Jisan/Nikiv or your kids using friendly/informal tones), and friendly to close friends. Always stay in character.`;
        
        const apiMessages = [
          { role: "system", content: identityPrompt },
          ...historicalContext.slice(-8),
          { role: "user", content: incomingText }
        ];

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: apiMessages,
            stream: false
          })
        });

        if (groqResponse.ok) {
          const resultJson = await groqResponse.json();
          const replicaReply = resultJson.choices?.[0]?.message?.content || "বস, একটু নেটওয়ার্ক সমস্যা মনে হয়। আরেকবার বলো?";

          historicalContext.push({ role: "user", content: incomingText });
          historicalContext.push({ role: "assistant", content: replicaReply });
          
          if (firebaseProjectId) {
            await saveFirestoreHistory(senderPhone, historicalContext.slice(-10), firebaseProjectId);
          }

          if (whatsappToken && phoneId) {
            await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${whatsappToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: senderPhone,
                type: "text",
                text: { body: replicaReply }
              })
            });
          }
        }
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Webhook processing error: ", err);
      return new Response("OK", { status: 200 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
};