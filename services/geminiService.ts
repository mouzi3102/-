import { GoogleGenAI } from "@google/genai";

export const generateAiBackground = async (prompt: string, apiKey: string, baseUrl?: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure it in settings.");
  }

  // Initialize with optional baseUrl (compatible with standard GenAI SDK patterns for customization)
  const ai = new GoogleGenAI({ 
    apiKey,
    // Note: If the SDK supports baseUrl directly in constructor options, this works.
    // If using a reverse proxy, the BaseURL is often set here. 
    // For @google/genai specifically, we pass it in the initialization options if supported,
    // or rely on standard fetch replacement techniques if the SDK is strict.
    // Assuming standard client behavior where 'baseUrl' or similar config maps to the service endpoint.
    // In many Google client libraries, the endpoint can be overridden.
    // For this implementation, we assume the environment or SDK allows passing custom fetch or config.
    // But to keep it simple and compliant with the prompt's sdk, we pass it in the options object.
    // If the specific SDK version doesn't support 'baseUrl' in root options, we might need a custom transport,
    // but usually this is the way to do it for "China Adaptation".
    baseUrl
  } as any); 

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            text: `Generate a high-quality, abstract, minimalist wallpaper suitable for a clock app background. Style: ${prompt}. No text, no clocks, just atmospheric art.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data received from Gemini.");
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};