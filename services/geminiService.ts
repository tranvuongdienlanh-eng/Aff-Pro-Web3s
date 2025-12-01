
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { fileToBase64, watermarkImage } from "../utils/fileUtils";
import { CampaignPlan } from "../types";

// --- HELPER CLIENT ---

/**
 * Creates a GoogleGenAI client instance.
 * @param customApiKey - Optional user-provided API key. If not present, falls back to process.env.API_KEY.
 */
const getClient = (customApiKey?: string) => {
  const apiKey = customApiKey || process.env.API_KEY || '';
  return new GoogleGenAI({ apiKey });
};

// Helper to add WAV header to raw PCM data
const addWavHeader = (base64Pcm: string): Blob => {
  const binaryString = atob(base64Pcm);
  const len = binaryString.length;
  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + len, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 is PCM)
  view.setUint16(20, 1, true);
  // channel count (1 for mono)
  view.setUint16(22, 1, true);
  // sample rate (24000Hz for Gemini TTS)
  view.setUint32(24, 24000, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, 24000 * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, len, true);

  // Write PCM data
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    bytes[44 + i] = binaryString.charCodeAt(i);
  }

  return new Blob([buffer], { type: 'audio/wav' });
};


export const generateCampaignPlan = async (
  description: string,
  language: string,
  affiliateLinks: { tiktok?: string; shopee?: string; website?: string },
  region: 'south' | 'north',
  gender: 'male' | 'female',
  veoCount: number = 3,
  apiKey?: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<CampaignPlan> => {
  const ai = getClient(apiKey);
  
  // Custom instruction for Vietnamese dialects, ignored if language is not Vietnamese
  const dialectInstruction = (language.toLowerCase() === 'vietnamese' || language.toLowerCase() === 'tiếng việt')
    ? (region === 'south' 
        ? 'Use Southern Vietnamese style (Miền Nam) with natural words like "nè", "nghen", "dữ thần", "bao ngon".' 
        : 'Use Northern Vietnamese style (Miền Bắc), professional and standard.')
    : '';

  // Prepare Affiliate Links Text
  let linksText = "";
  if (affiliateLinks.tiktok) linksText += `\n🛒 TikTok: ${affiliateLinks.tiktok}`;
  if (affiliateLinks.shopee) linksText += `\n🛒 Shopee: ${affiliateLinks.shopee}`;
  if (affiliateLinks.website) linksText += `\n🌐 Web: ${affiliateLinks.website}`;

  // Logic for continuous storytelling
  const sceneInstructions = `
    2. "visualPrompts": An array containing exactly ${veoCount} video descriptions (in English) for AI video generation (Veo).
       CRITICAL CONTINUITY REQUIREMENT:
       - You must write as a film director describing a storyboard for a commercial.
       - Scene 1 to Scene ${veoCount} must be sequential in time and space.
       - Example: Scene 1 opens box, Scene 2 holds product, Scene 3 close up, Scene 4 usage...
       - Style: Cinematic, High Resolution, 4k, Product Commercial.
  `;

  const prompt = `
    You are a marketing expert and viral content creator. Create a short video plan (Shorts/Reels) to sell this product.
    Product Description: ${description}
    Target Language: ${language}
    
    Output JSON with the following fields:
    1. "script": Voiceover script in ${language}, duration 30-40 seconds. ${dialectInstruction}. Voice gender: ${gender}. End with a strong Call To Action (CTA).
    ${sceneInstructions}
    3. "socialCaption": A short, catchy social media caption in ${language}. Use emojis and 5 trending hashtags.
       IMPORTANT: Append the following affiliate links at the very end of the caption (only if they are not empty):
       ${linksText}
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          script: { type: Type.STRING },
          visualPrompts: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          socialCaption: { type: Type.STRING }
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Không thể tạo kế hoạch.");
  
  try {
    return JSON.parse(text) as CampaignPlan;
  } catch (e) {
    throw new Error("Lỗi định dạng kế hoạch từ AI.");
  }
};

export const generateCustomVideoPrompts = async (
  description: string,
  count: number,
  region: 'south' | 'north',
  gender: 'male' | 'female',
  apiKey?: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<string[]> => {
  const ai = getClient(apiKey);

  const voiceDesc = `${gender === 'female' ? 'Female' : 'Male'} voice`;
  
  const prompt = `
    Create exactly ${count} unique and high-quality video generation prompts for this product: "${description}".
    
    CRITICAL REQUIREMENTS FOR EACH PROMPT:
    1. Must explicitly describe the product visually based on the input description.
    2. Must specify that the audio/voiceover context is: "${voiceDesc}" to ensure synchronization.
    3. Each prompt represents an 8-second video segment.
    4. Style: Cinematic, Commercial, High Resolution, 4k.
    5. The prompts should cover different angles, use cases, and lifestyle shots.

    Output a JSON array of strings, where each string is a full prompt in English.
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  const text = response.text;
  if (!text) return [];

  try {
    return JSON.parse(text) as string[];
  } catch (e) {
    console.error("Failed to parse custom prompts", e);
    return [];
  }
};

export const generateAudio = async (
    text: string, 
    gender: 'male' | 'female',
    apiKey?: string
): Promise<string> => {
  const ai = getClient(apiKey);
  
  // Mapping gender/region preference to available voices
  // Note: Gemini TTS voices are multilingual but Kore/Fenrir/Puck/Charon/Zephyr have different tones.
  const voiceName = gender === 'female' ? 'Kore' : 'Fenrir';

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Không thể tạo giọng đọc.");
  
  // Gemini returns raw PCM, we must add a WAV header for browsers to decode it properly
  const wavBlob = addWavHeader(base64Audio);
  return URL.createObjectURL(wavBlob);
};

export const generateAdImage = async (
    originalImage: File, 
    promptSuffix: string, 
    channelName?: string,
    apiKey?: string,
    modelName: string = 'gemini-2.5-flash-image'
): Promise<string> => {
  const ai = getClient(apiKey);
  const base64Data = await fileToBase64(originalImage);

  const prompt = `Create a high-quality advertising photo for this specific product.
  CRITICAL INSTRUCTION: You must preserve the product's original appearance, shape, and specifically the BRAND LOGO and TEXT on the product packaging. Do not remove, blur, or distort the logo.
  Do not add any new random text overlays on the image.
  Place the product in this context: ${promptSuffix}.
  Style: High-end professional product photography, sharp focus on the product, 4k resolution, aesthetic lighting.`;

  // Helper to process response and add watermark
  const processResponse = async (response: any) => {
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        let resultBase64 = `data:image/png;base64,${part.inlineData.data}`;
        if (channelName) {
          resultBase64 = await watermarkImage(resultBase64, channelName);
        }
        return resultBase64;
      }
    }
    throw new Error("No image data found in response");
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: originalImage.type } },
          { text: prompt },
        ],
      },
      // Only set imageConfig if the model supports it or if necessary.
      config: modelName.includes('pro-image') ? { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } } : undefined
    });
    return await processResponse(response);

  } catch (error) {
    console.warn(`Image generation failed with model ${modelName}`, error);
    throw new Error(`Không thể tạo ảnh quảng cáo (${modelName}). Vui lòng kiểm tra API Key hoặc thử Model khác.`);
  }
};

export const generateVeoVideo = async (
    image: File, 
    prompt: string, 
    apiKey?: string,
    modelName: string = 'veo-3.1-fast-generate-preview'
): Promise<string> => {
  const ai = getClient(apiKey);
  const base64Data = await fileToBase64(image);

  const enhancedPrompt = `${prompt}. Focus on the product. Maintain high fidelity to the product's details and LOGO. Cinematic lighting, 4k quality, vertical 9:16 aspect ratio, slow motion, photorealistic product showcase.`;

  // Veo config might vary slightly between models
  let resolution = '720p';
  if (modelName.includes('veo-3.1-generate-preview')) {
      // HQ model supports 720p or 1080p. Let's assume 720p for better speed/consistency for now, or bump if requested.
      // But Veo 3.1 HQ primarily distinguishes itself by quality of generation.
      resolution = '720p'; 
  }
  
  let operation = await ai.models.generateVideos({
    model: modelName,
    prompt: enhancedPrompt,
    image: {
      imageBytes: base64Data,
      mimeType: image.type,
    },
    config: {
      numberOfVideos: 1,
      resolution: resolution, 
      aspectRatio: '9:16'
    }
  });

  // Polling
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Video generation failed");

  // Fetch the actual video blob
  // Use the key used for creation
  const keyToUse = apiKey || process.env.API_KEY || '';
  const videoRes = await fetch(`${videoUri}&key=${keyToUse}`);
  const blob = await videoRes.blob();
  
  return URL.createObjectURL(blob);
};
