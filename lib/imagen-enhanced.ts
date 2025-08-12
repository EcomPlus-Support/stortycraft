import { log } from 'console'
import { GoogleAuth } from 'google-auth-library'
import { getVertexAIConfig, IMAGEN_MODELS } from './config'
import { getAuthManager, AuthenticationError } from './auth'
import { validateImagenAspectRatio, validateAspectRatio } from './validation'
import { ImagenError, createAspectRatioError, withRetry } from './errors'
import { getCacheManager, cacheImage, getCachedImage } from './cache'
import { logger, withErrorLogging } from './logger'
import { getMetricsCollector, withMetrics, recordImageGeneration } from './metrics'
import type { AspectRatio } from '@/app/types'

const config = getVertexAIConfig();
const LOCATION = config.location;
const PROJECT_ID = config.projectId;
const MODEL = IMAGEN_MODELS['imagen-3.0-generate-002'];
const MODEL_EDIT = IMAGEN_MODELS['imagen-3.0-capability-001'];

async function getAccessToken(): Promise<string> {
  console.log('Getting access token for project:', PROJECT_ID);
  console.log('Location:', LOCATION);
  
  const authManager = getAuthManager();
  try {
    return await authManager.getAccessToken();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('Authentication error:', error.message);
      if (error.description) {
        console.error('Details:', error.description);
      }
      if (error.code === 'invalid_rapt') {
        console.error('\nAction required: Please run the following command to reauthenticate:');
        console.error('gcloud auth application-default login\n');
      }
    }
    throw error;
  }
}

interface GenerateImageResponse {
  predictions: Array<{
    bytesBase64Encoded: string;
    mimeType: string;
    gcsUri: string;
    raiFilteredReason?: string;
  }>;
}

interface EnhancedImageResponse extends GenerateImageResponse {
  aspectRatio: AspectRatio;
  cost: number;
  cached?: boolean;
  processingTime?: number;
  retryCount?: number;
}

export async function generateImageRest(
  prompt: string, 
  aspectRatioInput?: string | AspectRatio,
  options: {
    enableCaching?: boolean;
    quality?: 'low' | 'medium' | 'high';
    retryAttempts?: number;
    timeout?: number;
  } = {}
): Promise<EnhancedImageResponse> {
  const startTime = Date.now();
  let aspectRatio: AspectRatio;
  
  // Validate and normalize aspect ratio
  if (typeof aspectRatioInput === 'string') {
    try {
      // Map string to proper aspect ratio object
      const ratioMap: Record<string, AspectRatio> = {
        '16:9': { id: '16:9', label: '16:9 Widescreen', ratio: 16/9, width: 16, height: 9, cssClass: 'aspect-[16/9]', imagenFormat: '16:9' },
        '9:16': { id: '9:16', label: '9:16 Portrait', ratio: 9/16, width: 9, height: 16, cssClass: 'aspect-[9/16]', imagenFormat: '9:16' },
        '4:3': { id: '4:3', label: '4:3 Standard', ratio: 4/3, width: 4, height: 3, cssClass: 'aspect-[4/3]', imagenFormat: '4:3' },
        '3:4': { id: '3:4', label: '3:4 Portrait', ratio: 3/4, width: 3, height: 4, cssClass: 'aspect-[3/4]', imagenFormat: '3:4' },
        '1:1': { id: '1:1', label: '1:1 Square', ratio: 1, width: 1, height: 1, cssClass: 'aspect-square', imagenFormat: '1:1' },
      };
      aspectRatio = ratioMap[aspectRatioInput] || ratioMap['16:9'];
    } catch (error) {
      throw createAspectRatioError('validation', { 
        aspectRatio: aspectRatioInput, 
        message: 'Invalid aspect ratio format' 
      });
    }
  } else if (aspectRatioInput) {
    aspectRatio = validateAspectRatio(aspectRatioInput);
  } else {
    // Default to 16:9
    aspectRatio = { 
      id: '16:9', 
      label: '16:9 Widescreen', 
      ratio: 16/9, 
      width: 16, 
      height: 9, 
      cssClass: 'aspect-[16/9]',
      imagenFormat: '16:9',
      costMultiplier: 1 
    };
  }
  
  // Validate service support
  validateImagenAspectRatio(aspectRatio);
  
  const cache = getCacheManager();
  const cacheKey = cache.generateImageKey(prompt, aspectRatio);
  const { enableCaching = true, retryAttempts = 5, timeout = 30000 } = options;
  
  // Check cache first
  if (enableCaching) {
    try {
      const cached = await getCachedImage(cacheKey, aspectRatio);
      if (cached) {
        logger.trackCacheOperation('get', cacheKey, true, aspectRatio.id);
        recordImageGeneration(true, Date.now() - startTime, aspectRatio, 0);
        return {
          predictions: [{ bytesBase64Encoded: cached, mimeType: 'image/png', gcsUri: '' }],
          aspectRatio,
          cost: 0,
          cached: true,
          processingTime: Date.now() - startTime
        };
      }
      logger.trackCacheOperation('get', cacheKey, false, aspectRatio.id);
    } catch (error) {
      logger.warn('Cache lookup failed', { operation: 'image_cache_get', error });
    }
  }
  
  const token = await getAccessToken();
  const maxRetries = retryAttempts;
  const initialDelay = 1000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(
        `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({
            instances: [
              {
                prompt: prompt
              },
            ],
            parameters: {
              safetySetting: 'block_only_high',
              sampleCount: 1,
              aspectRatio: aspectRatio.imagenFormat || aspectRatio.id,
              includeRaiReason: true,
            },
          }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      // Check if the response was successful
      if (!response.ok) {
        const errorText = await response.text();
        throw new ImagenError(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const jsonResult = await response.json();
      
      // Calculate cost (example: $0.02 per image)
      const baseCost = 0.02;
      const cost = baseCost * (aspectRatio.costMultiplier || 1);
      const processingTime = Date.now() - startTime;
      
      // Cache the result
      if (enableCaching && jsonResult.predictions?.[0]?.bytesBase64Encoded) {
        try {
          await cacheImage(cacheKey, jsonResult.predictions[0].bytesBase64Encoded, aspectRatio);
          logger.trackCacheOperation('set', cacheKey, true, aspectRatio.id);
        } catch (error) {
          logger.warn('Failed to cache image result', { operation: 'image_cache_set', error });
        }
      }
      
      // Record metrics
      recordImageGeneration(true, processingTime, aspectRatio, cost);
      logger.trackServiceOperation('imagen', 'generate', true, processingTime, aspectRatio, cost);
      
      return {
        ...jsonResult,
        aspectRatio,
        cost,
        cached: false,
        processingTime,
        retryCount: attempt
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const baseDelay = initialDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 2000;
        const delay = baseDelay + jitter;
        
        logger.warn(`Imagen generation attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          operation: 'imagen_generate_retry',
          aspectRatio: aspectRatio.id,
          additionalData: { attempt, delay, error: lastError.message }
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  const duration = Date.now() - startTime;
  recordImageGeneration(false, duration, aspectRatio, 0);
  logger.trackServiceOperation('imagen', 'generate', false, duration, aspectRatio, undefined, lastError);
  
  if (lastError instanceof ImagenError) {
    throw lastError;
  }
  throw new ImagenError(
    `Failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
    lastError || undefined,
    { prompt, aspectRatio: aspectRatio.id, attempts: maxRetries }
  );
}

export async function generateImageCustomizationRest(
  prompt: string, 
  characters: Array<{ name: string, description: string, imageBase64?: string }>, 
  aspectRatioInput?: string | AspectRatio,
  options: {
    enableCaching?: boolean;
    quality?: 'low' | 'medium' | 'high';
    retryAttempts?: number;
    timeout?: number;
  } = {}
): Promise<EnhancedImageResponse> {
  const startTime = Date.now();
  let aspectRatio: AspectRatio;
  
  // Validate and normalize aspect ratio
  if (typeof aspectRatioInput === 'string') {
    try {
      const ratioMap: Record<string, AspectRatio> = {
        '16:9': { id: '16:9', label: '16:9 Widescreen', ratio: 16/9, width: 16, height: 9, cssClass: 'aspect-[16/9]', imagenFormat: '16:9' },
        '9:16': { id: '9:16', label: '9:16 Portrait', ratio: 9/16, width: 9, height: 16, cssClass: 'aspect-[9/16]', imagenFormat: '9:16' },
        '4:3': { id: '4:3', label: '4:3 Standard', ratio: 4/3, width: 4, height: 3, cssClass: 'aspect-[4/3]', imagenFormat: '4:3' },
        '3:4': { id: '3:4', label: '3:4 Portrait', ratio: 3/4, width: 3, height: 4, cssClass: 'aspect-[3/4]', imagenFormat: '3:4' },
        '1:1': { id: '1:1', label: '1:1 Square', ratio: 1, width: 1, height: 1, cssClass: 'aspect-square', imagenFormat: '1:1' },
      };
      aspectRatio = ratioMap[aspectRatioInput] || ratioMap['16:9'];
    } catch (error) {
      throw createAspectRatioError('validation', { 
        aspectRatio: aspectRatioInput, 
        message: 'Invalid aspect ratio format' 
      });
    }
  } else if (aspectRatioInput) {
    aspectRatio = validateAspectRatio(aspectRatioInput);
  } else {
    aspectRatio = { 
      id: '16:9', 
      label: '16:9 Widescreen', 
      ratio: 16/9, 
      width: 16, 
      height: 9, 
      cssClass: 'aspect-[16/9]',
      imagenFormat: '16:9',
      costMultiplier: 1 
    };
  }
  
  // Validate service support
  validateImagenAspectRatio(aspectRatio);
  
  const cache = getCacheManager();
  const cacheKey = cache.generateImageKey(prompt, aspectRatio, characters);
  const { enableCaching = true, retryAttempts = 3, timeout = 45000 } = options;
  
  // Check cache first
  if (enableCaching) {
    try {
      const cached = await getCachedImage(cacheKey, aspectRatio);
      if (cached) {
        logger.trackCacheOperation('get', cacheKey, true, aspectRatio.id);
        recordImageGeneration(true, Date.now() - startTime, aspectRatio, 0);
        return {
          predictions: [{ bytesBase64Encoded: cached, mimeType: 'image/png', gcsUri: '' }],
          aspectRatio,
          cost: 0,
          cached: true,
          processingTime: Date.now() - startTime
        };
      }
      logger.trackCacheOperation('get', cacheKey, false, aspectRatio.id);
    } catch (error) {
      logger.warn('Cache lookup failed for customization', { operation: 'image_customization_cache_get', error });
    }
  }
  
  const token = await getAccessToken();
  const maxRetries = retryAttempts;
  const initialDelay = 1000;

  const referenceImagesPayload = characters
    .filter(character => character.imageBase64)
    .map((character, index) => ({
      referenceType: 'REFERENCE_TYPE_SUBJECT',
      referenceId: index + 1,
      referenceImage: {
        bytesBase64Encoded: character.imageBase64!,
      },
      subjectImageConfig: {
        subjectDescription: character.description,
        subjectType: 'SUBJECT_TYPE_PERSON',
      },
    }));

  const customizedPrompt = `Generate an image of ${referenceImagesPayload.map((ref) => `${ref.subjectImageConfig.subjectDescription} [${ref.referenceId}]`).join(', ')} to match this description: ${prompt}`;

  const body = JSON.stringify({
    instances: [
      {
        prompt: customizedPrompt,
        referenceImages: referenceImagesPayload,
      },
    ],
    parameters: {
      safetySetting: 'block_only_high',
      sampleCount: 1,
      aspectRatio: aspectRatio.imagenFormat || aspectRatio.id,
      includeRaiReason: true,
    },
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(
        `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_EDIT}:predict`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: body,
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new ImagenError(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const jsonResult = await response.json();
      
      // Calculate cost (higher for customization)
      const baseCost = 0.04;
      const characterMultiplier = characters.filter(c => c.imageBase64).length;
      const cost = baseCost * (aspectRatio.costMultiplier || 1) * Math.max(1, characterMultiplier);
      const processingTime = Date.now() - startTime;
      
      // Cache the result
      if (enableCaching && jsonResult.predictions?.[0]?.bytesBase64Encoded) {
        try {
          await cacheImage(cacheKey, jsonResult.predictions[0].bytesBase64Encoded, aspectRatio);
          logger.trackCacheOperation('set', cacheKey, true, aspectRatio.id);
        } catch (error) {
          logger.warn('Failed to cache customization result', { operation: 'image_customization_cache_set', error });
        }
      }
      
      // Record metrics
      recordImageGeneration(true, processingTime, aspectRatio, cost);
      logger.trackServiceOperation('imagen', 'customization', true, processingTime, aspectRatio, cost);
      
      return {
        ...jsonResult,
        aspectRatio,
        cost,
        cached: false,
        processingTime,
        retryCount: attempt
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const baseDelay = initialDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 2000;
        const delay = baseDelay + jitter;
        
        logger.warn(`Imagen customization attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          operation: 'imagen_customization_retry',
          aspectRatio: aspectRatio.id,
          additionalData: { attempt, delay, error: lastError.message }
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  const duration = Date.now() - startTime;
  recordImageGeneration(false, duration, aspectRatio, 0);
  logger.trackServiceOperation('imagen', 'customization', false, duration, aspectRatio, undefined, lastError);
  
  if (lastError instanceof ImagenError) {
    throw lastError;
  }
  throw new ImagenError(
    `Customization failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
    lastError || undefined,
    { prompt, aspectRatio: aspectRatio.id, characterCount: characters.length }
  );
}

// Utility functions for cost estimation
export function estimateImageCost(aspectRatio: AspectRatio, isCustomization: boolean = false, characterCount: number = 0): number {
  const baseCost = isCustomization ? 0.04 : 0.02;
  const characterMultiplier = isCustomization ? Math.max(1, characterCount) : 1;
  return baseCost * (aspectRatio.costMultiplier || 1) * characterMultiplier;
}

// Batch image generation with aspect ratio optimization
export async function generateImageBatch(
  requests: Array<{
    prompt: string;
    aspectRatio?: AspectRatio;
    characters?: Array<{ name: string, description: string, imageBase64?: string }>;
  }>,
  options: {
    enableCaching?: boolean;
    maxConcurrent?: number;
    retryAttempts?: number;
  } = {}
): Promise<Array<EnhancedImageResponse | { error: Error }>> {
  const { maxConcurrent = 3, enableCaching = true, retryAttempts = 3 } = options;
  
  // Group requests by aspect ratio for better caching
  const groupedByAspectRatio = requests.reduce((groups, request, index) => {
    const ratioId = request.aspectRatio?.id || '16:9';
    if (!groups[ratioId]) groups[ratioId] = [];
    groups[ratioId].push({ ...request, originalIndex: index });
    return groups;
  }, {} as Record<string, Array<typeof requests[0] & { originalIndex: number }>>);
  
  const results: Array<EnhancedImageResponse | { error: Error }> = new Array(requests.length);
  
  // Process each aspect ratio group
  for (const [ratioId, groupRequests] of Object.entries(groupedByAspectRatio)) {
    logger.info(`Processing ${groupRequests.length} requests for aspect ratio ${ratioId}`);
    
    // Process requests in parallel with concurrency limit
    const semaphore = new Array(Math.min(maxConcurrent, groupRequests.length)).fill(null);
    
    await Promise.all(semaphore.map(async (_, semIndex) => {
      for (let i = semIndex; i < groupRequests.length; i += semaphore.length) {
        const request = groupRequests[i];
        try {
          let result: EnhancedImageResponse;
          
          if (request.characters && request.characters.length > 0) {
            result = await generateImageCustomizationRest(
              request.prompt,
              request.characters,
              request.aspectRatio,
              { enableCaching, retryAttempts }
            );
          } else {
            result = await generateImageRest(
              request.prompt,
              request.aspectRatio,
              { enableCaching, retryAttempts }
            );
          }
          
          results[request.originalIndex] = result;
        } catch (error) {
          results[request.originalIndex] = { 
            error: error instanceof Error ? error : new Error(String(error)) 
          };
        }
      }
    }));
  }
  
  return results;
}