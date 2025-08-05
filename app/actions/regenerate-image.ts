'use server'

import { generateImageRest } from '@/lib/imagen'
import { translateError } from '@/lib/error-utils'

export async function regenerateImage(prompt: string) {
  try {
    console.log('🎨 Regenerating image with enhanced error handling:', {
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 100) + '...'
    });

    const startTime = Date.now();
    const resultJson = await generateImageRest(prompt, '16:9');
    const generationTime = Date.now() - startTime;
    
    console.log(`✅ Image generated successfully in ${generationTime}ms`);
    
    if (!resultJson.predictions || resultJson.predictions.length === 0) {
      console.error('❌ No predictions in response:', resultJson);
      throw new Error('No image data received from Imagen service');
    }
    
    const prediction = resultJson.predictions[0];
    
    // Check for safety filter blocks
    if (prediction.raiFilteredReason) {
      console.warn('⚠️ Content filtered by safety system:', prediction.raiFilteredReason);
      throw new Error(`Content was filtered: ${prediction.raiFilteredReason}`);
    }
    
    if (!prediction.bytesBase64Encoded) {
      console.error('❌ No image data in prediction:', prediction);
      throw new Error('No image data received from prediction');
    }

    const imageBase64 = prediction.bytesBase64Encoded;
    console.log('✅ Generated image base64:', imageBase64.substring(0, 50) + '...');

    return { imageBase64 };
  } catch (error) {
    console.error('❌ Error generating image:', error);
    
    // Enhanced error translation with more specific handling
    const friendlyError = translateError(error);
    
    // Add specific guidance for common image generation issues
    if (error instanceof Error) {
      if (error.message.includes('filtered') || error.message.includes('safety')) {
        throw new Error('Content Policy Issue: The image description was flagged by safety filters. Try using different, more appropriate language.');
      }
      
      if (error.message.includes('timeout') || error.message.includes('429')) {
        throw new Error('Service Busy: Image generation is experiencing high demand. Please try again in a moment.');
      }
      
      if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        throw new Error('Authentication Error: There was an issue with service authentication. Please refresh and try again.');
      }
    }
    
    throw new Error(`${friendlyError.title}: ${friendlyError.message}${
      friendlyError.actionable ? ` ${friendlyError.actionable}` : ''
    }`);
  }
}

