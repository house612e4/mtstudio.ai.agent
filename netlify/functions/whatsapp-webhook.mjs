// netlify/functions/whatsapp-webhook.mjs
export default async (request) => {
  // GET - Meta Verification
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Verification attempt:", { mode, token, challenge });

    if (mode === "subscribe" && token === "mahsintest123") {
      console.log("✅ Verified successfully!");
      return new Response(challenge, { status: 200 });
    }

    console.log("❌ Verification failed");
    return new Response("Forbidden", { status: 403 });
  }

  // POST - Incoming messages
  if (request.method === "POST") {
    try {
      const body = await request.json();
      // ... (বাকি কোড যেমন আছে রেখে দাও)
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error(err);
      return new Response("OK", { status: 200 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
};