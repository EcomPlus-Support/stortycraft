import { getAuthManager } from './auth';
import { getVertexAIConfig } from './config';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class GeminiDirectService {
  async generateText(prompt: string, options?: {
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<string> {
    const temperature = options?.temperature ?? 0.7;
    const maxOutputTokens = options?.maxOutputTokens ?? 8192;
    
    return generateTextDirect(prompt, temperature, maxOutputTokens);
  }
}

export async function generateTextDirect(prompt: string, temperature: number = 1, maxOutputTokens: number = 8192): Promise<string> {
  const config = getVertexAIConfig();
  const authManager = getAuthManager();
  
  try {
    const accessToken = await authManager.getAccessToken();
    
    const response = await fetch(
      `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: maxOutputTokens,
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API Error:', error);
      throw new Error(`Gemini API failed: ${JSON.stringify(error)}`);
    }

    const result: GeminiResponse = await response.json();
    
    console.log('Gemini response structure:', JSON.stringify(result, null, 2));
    
    // 檢查是否有有效的文字回應
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text && text.trim().length > 0) {
      return text;
    }
    
    // 處理空回應或 MAX_TOKENS 情況
    const finishReason = result.candidates?.[0]?.finishReason;
    console.error('Gemini response issue:', {
      hasText: !!text,
      textLength: text?.length || 0,
      finishReason,
      structure: result
    });
    
    if (finishReason === 'MAX_TOKENS') {
      throw new Error('Gemini hit token limit (MAX_TOKENS) - response truncated');
    } else if (!text) {
      throw new Error('No text content in Gemini response');
    } else {
      throw new Error('Empty text generated from Gemini');
    }
  } catch (error) {
    console.error('Error calling Gemini directly:', error);
    throw error;
  }
}