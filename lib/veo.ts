import { GoogleAuth } from 'google-auth-library';
import { getVertexAIConfig } from './config';
import { getAuthManager, AuthenticationError } from './auth';
import { validateVeoAspectRatio, validateAspectRatio } from './validation';
import { VeoError, createAspectRatioError, TimeoutError } from './errors';
import { getCacheManager, cacheVideo, getCachedVideo } from './cache';
import { logger, withErrorLogging } from './logger';
import { getMetricsCollector, recordVideoGeneration } from './metrics';
import type { AspectRatio } from '@/app/types';

const config = getVertexAIConfig();
const LOCATION = config.location;
const PROJECT_ID = config.projectId;
const MODEL = config.model;
const GCS_VIDEOS_STORAGE_URI = config.gcsVideosStorageUri;

interface GenerateVideoResponse {
  name: string;
  done: boolean;
  response: {
    '@type': 'type.googleapis.com/cloud.ai.large_models.vision.GenerateVideoResponse';
    videos: Array<{
      gcsUri: string;
      mimeType: string;
    }>;
  };
  error?: { // Add an optional error field to handle operation errors
    code: number;
    message: string;
    status: string;
  };
}

async function getAccessToken(): Promise<string> {
  console.log('Getting access token for Veo video generation');
  console.log('Project ID:', PROJECT_ID);
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

async function checkOperation(operationName: string): Promise<GenerateVideoResponse> {
  const token = await getAccessToken();

  const response = await fetch(
    `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:fetchPredictOperation`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operationName: operationName,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const jsonResponse = await response.json();
  return jsonResponse as GenerateVideoResponse;
}

export async function waitForOperation(
  operationName: string, 
  aspectRatio?: AspectRatio,
  options: {
    maxWaitTime?: number;
    checkInterval?: number;
    enableCaching?: boolean;
  } = {}
): Promise<GenerateVideoResponse & { cost: number; aspectRatio?: AspectRatio; cached?: boolean }> {
  const { maxWaitTime = 600000, checkInterval = 2000, enableCaching = true } = options; // 10 minute max wait
  const startTime = Date.now();
  
  // Handle cached operations
  if (operationName.startsWith('cached:')) {
    const cacheKey = operationName.replace('cached:', '');
    try {
      const cache = getCacheManager();
      const cachedUrl = await cache.get<string>(cacheKey);
      if (cachedUrl) {
        return {
          name: operationName,
          done: true,
          response: {
            '@type': 'type.googleapis.com/cloud.ai.large_models.vision.GenerateVideoResponse',
            videos: [{ gcsUri: cachedUrl, mimeType: 'video/mp4' }]
          },
          cost: 0,
          aspectRatio,
          cached: true
        };
      }
    } catch (error) {
      logger.warn('Failed to retrieve cached video', { operationName, error });
    }
  }

  const pollOperation = async (): Promise<GenerateVideoResponse & { cost: number; aspectRatio?: AspectRatio; cached?: boolean }> => {
    if (Date.now() - startTime > maxWaitTime) {
      throw new TimeoutError('video_generation', maxWaitTime, { operationName, aspectRatio: aspectRatio?.id });
    }
    
    const generateVideoResponse = await checkOperation(operationName);

    if (generateVideoResponse.done) {
      const duration = Date.now() - startTime;
      
      // Check if there was an error during the operation
      if (generateVideoResponse.error) {
        recordVideoGeneration(false, duration, aspectRatio, 0);
        logger.trackServiceOperation('veo', 'generate_complete', false, duration, aspectRatio, undefined, new Error(generateVideoResponse.error.message));
        throw new VeoError(`Operation failed with error: ${generateVideoResponse.error.message}`);
      }
      
      // Calculate cost for completed operation
      const baseCost = 0.10;
      const cost = baseCost * (aspectRatio?.costMultiplier || 1);
      
      // Cache the result if enabled
      if (enableCaching && aspectRatio && generateVideoResponse.response?.videos?.[0]?.gcsUri) {
        try {
          const cache = getCacheManager();
          const cacheKey = `video:${operationName}`;
          await cache.set(cacheKey, generateVideoResponse.response.videos[0].gcsUri, 7200); // 2 hours TTL
          logger.trackCacheOperation('set', cacheKey, true, aspectRatio.id);
        } catch (error) {
          logger.warn('Failed to cache video result', { operationName, error });
        }
      }
      
      recordVideoGeneration(true, duration, aspectRatio, cost);
      logger.trackServiceOperation('veo', 'generate_complete', true, duration, aspectRatio, cost);
      
      return {
        ...generateVideoResponse,
        cost,
        aspectRatio,
        cached: false
      };
    } else {
      // Log progress
      const elapsed = Date.now() - startTime;
      if (elapsed % 30000 === 0) { // Log every 30 seconds
        logger.info(`Video generation in progress: ${Math.round(elapsed/1000)}s elapsed`, {
          operation: 'veo_generate_progress',
          operationName,
          aspectRatio: aspectRatio?.id,
          additionalData: { elapsed }
        });
      }
      
      await delay(checkInterval);
      return pollOperation();
    }
  };

  return pollOperation();
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateSceneVideo(
  prompt: string, 
  imageBase64: string, 
  aspectRatioInput?: string | AspectRatio,
  options: {
    enableCaching?: boolean;
    timeout?: number;
    retryAttempts?: number;
    priority?: 'low' | 'medium' | 'high';
  } = {}
): Promise<{ operationName: string; aspectRatio: AspectRatio; cost: number; cached?: boolean }> {
  const startTime = Date.now();
  let aspectRatio: AspectRatio;
  
  // Validate and normalize aspect ratio
  if (typeof aspectRatioInput === 'string') {
    const ratioMap: Record<string, AspectRatio> = {
      '16:9': { id: '16:9', label: '16:9 Widescreen', ratio: 16/9, width: 16, height: 9, cssClass: 'aspect-[16/9]', veoFormat: '16:9' },
      '9:16': { id: '9:16', label: '9:16 Portrait', ratio: 9/16, width: 9, height: 16, cssClass: 'aspect-[9/16]', veoFormat: '9:16' },
    };
    aspectRatio = ratioMap[aspectRatioInput] || ratioMap['16:9'];
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
      veoFormat: '16:9',
      costMultiplier: 1
    };
  }
  
  // Validate service support
  validateVeoAspectRatio(aspectRatio);
  
  const cache = getCacheManager();
  const cacheKey = cache.generateVideoKey(prompt, imageBase64, aspectRatio);
  const { enableCaching = true, timeout = 300000, retryAttempts = 5 } = options; // 5 minute timeout
  
  // Check cache first
  if (enableCaching) {
    try {
      const cached = await getCachedVideo(cacheKey, aspectRatio);
      if (cached) {
        logger.trackCacheOperation('get', cacheKey, true, aspectRatio.id);
        recordVideoGeneration(true, Date.now() - startTime, aspectRatio, 0);
        return {
          operationName: `cached:${cacheKey}`,
          aspectRatio,
          cost: 0,
          cached: true
        };
      }
      logger.trackCacheOperation('get', cacheKey, false, aspectRatio.id);
    } catch (error) {
      logger.warn('Video cache lookup failed', { operation: 'video_cache_get', error });
    }
  }
  
  const token = await getAccessToken();
  const maxRetries = retryAttempts;
  const initialDelay = 1000;

  const makeRequest = async (attempt: number) => {
    try {
      const response = await fetch(
        `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predictLongRunning`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instances: [
              {
                prompt: prompt,
                image: {
                  bytesBase64Encoded: imageBase64,
                  mimeType: "png",
                },
              },
            ],
            parameters: {
              storageUri: GCS_VIDEOS_STORAGE_URI,
              sampleCount: 1,
              aspectRatio: aspectRatio.veoFormat || aspectRatio.id
            },
          }),
        }
      );

      // Check if the response was successful
      if (!response.ok) {
        const errorText = await response.text();
        throw new VeoError(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const jsonResult = await response.json();
      const operationName = jsonResult.name;
      
      // Calculate cost (example: $0.10 per video)
      const baseCost = 0.10;
      const cost = baseCost * (aspectRatio.costMultiplier || 1);
      
      // Record successful request
      logger.trackServiceOperation('veo', 'generate_start', true, Date.now() - startTime, aspectRatio, cost);
      
      return {
        operationName,
        aspectRatio,
        cost,
        cached: false
      };
    } catch (error) {
      if (attempt < maxRetries) {
        const baseDelay = initialDelay * Math.pow(2, attempt); // Exponential backoff
        const jitter = Math.random() * 2000; // Random value between 0 and baseDelay
        const delay = baseDelay + jitter;
        logger.warn(`Veo generation attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          operation: 'veo_generate_retry',
          aspectRatio: aspectRatio.id,
          additionalData: { attempt, delay, error: error instanceof Error ? error.message : 'Unknown error' }
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        return makeRequest(attempt + 1);
      } else {
        recordVideoGeneration(false, Date.now() - startTime, aspectRatio, 0);
        logger.trackServiceOperation('veo', 'generate_start', false, Date.now() - startTime, aspectRatio, undefined, error);
        
        if (error instanceof VeoError) {
          throw error;
        }
        throw new VeoError(
          `Failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error : undefined,
          { prompt, aspectRatio: aspectRatio.id, attempts: maxRetries }
        );
      }
    }
  };

  return makeRequest(0); // Start the initial request
}