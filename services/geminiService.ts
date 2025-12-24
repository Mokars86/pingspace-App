
import { GoogleGenAI, Type } from "@google/genai";
import { SummaryResult } from "../types";

export const sendMessageToGemini = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  newMessage: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    
    // Fixed: Call generateContent with model name and prompt contents directly.
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        ...history, 
        { role: 'user', parts: [{ text: newMessage }] }
      ], 
      config: {
        systemInstruction: "You are PingAI, a helpful and friendly assistant inside the PingSpace app. Keep responses concise and natural. Use standard English (avoid futuristic or robotic jargon). Format your responses clearly for a mobile chat screen.",
      }
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting right now. Please try again later.";
  }
};

export const getQuickSuggestions = async (lastMessage: string): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Based on the following message, provide 3 short (1-4 words each), friendly, and natural quick reply suggestions. Use standard, conversational English. Return as a JSON array of strings.
    
    Message: "${lastMessage}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    // Fixed: Access the .text property directly from the response object.
    const text = response.text;
    if (!text) return ["Got it!", "Sure!", "Thanks!"];
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return ["Understood", "Thanks!", "Will do"];
  }
};

export const generateChatSummary = async (messages: { sender: string; text: string }[]): Promise<SummaryResult | null> => {
  try {
    const transcript = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
    const prompt = `Summarize the following conversation in clear, normal English. List any key decisions and action items mentioned.
    
    Transcript:
    ${transcript}`;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionItems: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          // Fixed: Use propertyOrdering instead of required in JSON schema.
          propertyOrdering: ["summary", "decisions", "actionItems"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text.trim()) as SummaryResult;
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return null;
  }
};

export interface CurrencyConversion {
  rate: number;
  result: number;
  note: string;
}

export const getCurrencyConversion = async (amount: number, from: string, to: string): Promise<CurrencyConversion | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Provide the current estimated exchange rate from ${from} to ${to} and calculate the result for ${amount} ${from}. Return a structured JSON object. Use clear, simple notes.
    
    Amount: ${amount}
    From: ${from}
    To: ${to}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rate: { type: Type.NUMBER, description: 'The current exchange rate.' },
            result: { type: Type.NUMBER, description: 'The converted amount.' },
            note: { type: Type.STRING, description: 'A short note about the conversion.' }
          },
          // Fixed: Use propertyOrdering instead of required in JSON schema.
          propertyOrdering: ["rate", "result", "note"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text.trim()) as CurrencyConversion;
  } catch (error) {
    console.error("Gemini Currency Error:", error);
    return null;
  }
};
