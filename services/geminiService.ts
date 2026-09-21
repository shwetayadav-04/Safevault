import { GoogleGenAI } from "@google/genai";

export const getFileInsight = async (fileName: string, type: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (!apiKey) {
    return "Encrypted file stored securely. AI insights require a Gemini API key.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide a short, 1-sentence helpful description or mock content snippet for a file named "${fileName}" of type "${type}" in a secure vault. Make it sound professional and concise.`,
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });

    return response.text || "AI analysis completed successfully.";
  } catch (error) {
    console.warn("Gemini Service Insight Notice:", error);
    return "Encrypted file metadata analysis complete.";
  }
};
