import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: "edge"
};

const CATEGORIES = [
  "Sports", "Grocery", "Electronics", "Pharmacy", 
  "Fashion & Apparel", "Food & Bakery", "Books & Stationery", 
  "Hardware", "Home Decor", "Other"
];

const SYSTEM_INSTRUCTION = `
You are "LocalLink Sahayak", a friendly and efficient Indian shopkeeper assisting a customer in a local marketplace.

STRICT CONVERSATION RULES:
1. ASK ONLY ONE QUESTION AT A TIME. Never ask multiple things in one message.
2. SHORT CONVERSATION: Aim to gather all necessary details (Brand, Size, Quantity, Type) in 2 to 4 questions maximum.
3. BE CONCISE: Use a mix of Hindi and English (Hinglish).
4. IMAGES: User images are tagged like [REF_IMG_0], [REF_IMG_1]. Use them to identify the item instead of asking basic questions if the image is clear.

WORKFLOW:
- Step 1: Identify the item from the user's first input/image.
- Step 2: Ask for one missing specific (e.g., "Quantity kitni chahiye?" or "Brand preference kya hai?").
- Step 3: Once you have the main details, proceed to the Final Step.

CATEGORIZATION:
You must categorize the request into one of these EXACT categories:
${CATEGORIES.join(", ")}.
Use "Other" ONLY if the request is unclear or doesn't fit any other category.

FINAL STEP:
When you have enough info, summarize using this EXACT format:
"Theek hai! Aapki request ye rahi:

Need: [Item Name]
Quantity: [Amount]
Brand: [Brand Name or 'Any']
Type: [Specific Type or 'General']

Kya main ye details local shops ko bhej doon? (Yes/No)"

- If they say "Yes", output ONLY this JSON: {"finalized": true, "summary": "Full formatted description", "category": "ONE_OF_THE_CATEGORIES_ABOVE", "selectedImageId": "REF_IMG_X"}.

SAFETY & CONTEXT:
- Do not block or filter messages about common household or marketplace items.
- Always assume a helpful, commercial marketplace context.
`;

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ text: "API_KEY configuration missing on server.", error: true }), { status: 200 });
    }

    const { history } = await req.json();
    const ai = new GoogleGenAI({ apiKey });

    // Robust Turn Sequencing: Strictly alternate User and Model
    let sequenced: any[] = [];
    (history || []).forEach((m: any) => {
      const role = m.role === 'model' ? 'model' : 'user';
      const parts = (m.parts || []).map((p: any) => {
        if (p.text) return { text: p.text };
        if (p.inlineData) return { inlineData: p.inlineData };
        return null;
      }).filter(Boolean);

      if (parts.length === 0) return;

      if (sequenced.length === 0) {
        if (role === 'user') sequenced.push({ role, parts });
      } else {
        const last = sequenced[sequenced.length - 1];
        if (last.role === role) {
          last.parts = [...last.parts, ...parts];
        } else {
          sequenced.push({ role, parts });
        }
      }
    });

    if (sequenced.length === 0) {
      return new Response(JSON.stringify({ text: "Namaste! Main aapki kaise madad kar sakta hoon?" }));
    }

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: sequenced,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT" as any, threshold: "BLOCK_NONE" as any },
          { category: "HARM_CATEGORY_HATE_SPEECH" as any, threshold: "BLOCK_NONE" as any },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any, threshold: "BLOCK_NONE" as any },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any, threshold: "BLOCK_NONE" as any }
        ]
      }
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (e) {
          console.error("Stream error:", e);
          controller.enqueue(encoder.encode("\n(Sahayak is currently slow. Please try again.)"));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      }
    });

  } catch (err: any) {
    console.error("Edge Handler Error:", err);
    return new Response(JSON.stringify({ text: "Namaste! Main thoda busy hoon, please ek baar phir try karein.", error: true }), { status: 200 });
  }
}