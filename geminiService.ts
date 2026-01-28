import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "./types";

export const CATEGORIES = [
  "Sports", "Grocery", "Electronics", "Pharmacy", 
  "Fashion & Apparel", "Food & Bakery", "Books & Stationery", 
  "Hardware", "Home Decor", "Other"
];

export const SYSTEM_INSTRUCTION = `
You are "LocalLink Sahayak", a friendly Indian shopkeeper.
Your goal: Help customers list exactly what they need to buy.

STRICT CONVERSATION RULES:
1. ASK ONLY ONE QUESTION AT A TIME. 
2. Gather essential details (Brand, Size, Quantity) in 2 to 4 questions max.
3. Be helpful, quick, and use Hinglish.

FINAL STEP: 
Summarize clearly in this format:
Need: [Item]
Quantity: [Qty]
Brand: [Brand]
Type: [Type]

Ask: "Kya main ye shops ko bhej doon? (Yes/No)".
Once they say "Yes", output ONLY this JSON: {"finalized": true, "summary": "Full item description", "category": "CATEGORY_NAME", "selectedImageId": "REF_IMG_X"}.
`;

export const getAgentResponseStream = async (history: ChatMessage[], onChunk: (text: string) => void) => {
  try {
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history })
    });

    if (!response.ok) throw new Error('Network response was not ok');
    if (!response.body) throw new Error('No readable stream in response');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      const chunk = decoder.decode(value, { stream: !done });
      if (chunk) onChunk(chunk);
    }
  } catch (err) {
    console.error("Streaming Fetch Error:", err);
    throw err;
  }
};

export const parseAgentSummary = (text: string) => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.category) {
        const found = CATEGORIES.find(c => c.toLowerCase() === parsed.category.toLowerCase());
        parsed.category = found || "Other";
      }
      return parsed;
    }
  } catch (e) {}
  return null;
};

export const generatePromoBanner = async (shopName: string, promotion: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Professional, colorful Indian storefront banner for "${shopName}" promoting "${promotion}". Vibrant retail colors.` }],
      },
    });
    
    const candidate = response.candidates?.[0];
    if (candidate) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (e) {
    console.error("Banner Generation Error:", e);
  }
  return null;
};