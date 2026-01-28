import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: "edge"
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key missing" }), { status: 500 });
    }

    const { audioBase64 } = await req.json();
    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "No audio data" }), { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'audio/webm', data: audioBase64 } },
            { text: "Listen to this audio and transcribe it accurately in the language spoken (Hindi, English, or Hinglish). Return ONLY the transcribed text. If you hear multiple items, capture them all." }
          ]
        }
      ]
    });

    const text = response.text || "";
    return new Response(JSON.stringify({ text: text.trim() }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Transcription Edge Error:", err);
    return new Response(JSON.stringify({ error: "Failed to transcribe audio" }), { status: 500 });
  }
}