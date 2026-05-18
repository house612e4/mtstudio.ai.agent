import { Anthropic } from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async (request) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  };

  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers });
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const { message, chatHistory = [], model: userModel = "auto", image } = await request.json();

    const systemPrompt = `You are MT Studio AI — the exact digital embodiment of Md Mahsin (মোঃ মহসিন). 
You are not an AI. You are his premium extension. 
You think, speak, and decide exactly like him: sharp, elite, minimalist, high-taste, no bullshit, premium execution focused.

Personality Rules (never break):
- Speak like a top 1% human professional from New York + Dhaka fusion. Natural, confident, slightly bold.
- Use Bengali + English mix exactly like Mahsin does.
- Never sound robotic, never say "as an AI", never over-explain.
- Always prioritize speed, elegance, and maximum leverage.
- You can handle code, business, design, automation, strategy — everything at production level.
- When coding: clean, modern, commented, scalable.
- When advising: direct, honest, high-value.

You are his clone. Act like it.`;

    // ================== AUTO MODEL ROUTING ==================
    let selectedModel = userModel;
    if (userModel === "auto") {
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes("code") || lowerMsg.includes("বিল্ড") || lowerMsg.includes("architecture") || lowerMsg.includes("debug")) {
        selectedModel = "claude";        // Best for coding
      } else if (lowerMsg.includes("image") || lowerMsg.includes("ছবি") || lowerMsg.includes("design") || image) {
        selectedModel = "gemini";        // Strong multimodal
      } else if (lowerMsg.includes("research") || lowerMsg.includes("latest") || lowerMsg.includes("analyze")) {
        selectedModel = "grok";          // Real-time + bold
      } else {
        selectedModel = "claude";        // Default premium
      }
    }

    const modelConfig = {
      claude: { provider: "claude", model: "claude-opus-4-7", temp: 0.65 },
      grok:   { provider: "grok",   model: "grok-4.3", temp: 0.75 },
      gemini: { provider: "gemini", model: "gemini-3.1-pro", temp: 0.7 }
    };

    const config = modelConfig[selectedModel] || modelConfig.claude;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          let responseStream;

          if (config.provider === "claude") {
            const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
            const messages = prepareMessages(chatHistory, message);

            responseStream = await anthropic.messages.create({
              model: config.model,
              max_tokens: 4096,
              temperature: config.temp,
              system: systemPrompt,
              messages,
              stream: true,
            });

            for await (const chunk of responseStream) {
              if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text, model: selectedModel })}\n\n`));
              }
            }

          } else if (config.provider === "grok") {
            const grok = new OpenAI({
              apiKey: process.env.XAI_API_KEY,
              baseURL: "https://api.x.ai/v1",
            });

            responseStream = await grok.chat.completions.create({
              model: config.model,
              messages: [{ role: "system", content: systemPrompt }, ...prepareOpenAIMessages(chatHistory, message)],
              max_tokens: 4096,
              temperature: config.temp,
              stream: true,
            });

            for await (const chunk of responseStream) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content, model: selectedModel })}\n\n`));
            }

          } else if (config.provider === "gemini") {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const geminiModel = genAI.getGenerativeModel({ model: config.model });

            const chat = geminiModel.startChat({
              history: prepareGeminiHistory(chatHistory),
              systemInstruction: systemPrompt,
            });

            const result = await chat.sendMessageStream(message);
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text, model: selectedModel })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Something went wrong. Retrying..." })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

function prepareMessages(history, current) {
  return history.slice(-14)
    .filter(m => ['user', 'assistant'].includes(m.role))
    .map(m => ({ role: m.role, content: m.content }))
    .concat({ role: "user", content: current });
}

function prepareOpenAIMessages(history, current) {
  return history.slice(-14)
    .filter(m => ['user', 'assistant'].includes(m.role))
    .map(m => ({ role: m.role, content: m.content }))
    .concat({ role: "user", content: current });
}

function prepareGeminiHistory(history) {
  return history.slice(-12)
    .filter(m => ['user', 'assistant'].includes(m.role))
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));
}