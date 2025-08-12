import { generateSceneVideo, waitForOperation } from '@/lib/veo';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import * as fs from 'fs/promises';
import { GetSignedUrlConfig } from '@google-cloud/storage';
import { validateVideoGenerationRequest, validateCostLimits } from '@/lib/validation';
import { getErrorResponse, logError, VeoError, ValidationError, CostLimitExceededError } from '@/lib/errors';
import { logger, createRequestLogger } from '@/lib/logger';
import { getMetricsCollector } from '@/lib/metrics';
import { getCacheManager } from '@/lib/cache';
import type { VideoGenerationRequest, VideoGenerationResponse, AspectRatio } from '@/app/types';
import { v4 as uuidv4 } from 'uuid';

const USE_SIGNED_URL = process.env.USE_SIGNED_URL === "true";
const USE_COSMO = process.env.USE_COSMO === "true";
const MAX_COST_PER_REQUEST = parseFloat(process.env.MAX_COST_PER_REQUEST || '50');

interface EnhancedScene {
  imagePrompt: string;
  videoPrompt: string;
  description: string;
  voiceover: string;
  imageBase64?: string;
  aspectRatio?: AspectRatio;
}

/**
 * Enhanced video generation API with comprehensive aspect ratio support
 * 
 * Features:
 * - Aspect ratio validation and processing
 * - Cost tracking and limits
 * - Caching support
 * - Metrics collection
 * - Structured error handling
 * - Request validation
 */
export async function POST(req: Request): Promise<Response> {
  const requestId = uuidv4();
  const requestLogger = createRequestLogger(requestId);
  const startTime = Date.now();
  let totalCost = 0;
  let processedScenes = 0;

  try {
    requestLogger.info('Processing enhanced video generation request', {
      operation: 'video_generation_enhanced'
    });

    // Parse and validate request
    let requestData: VideoGenerationRequest;
    try {
      const rawData = await req.json();
      requestData = validateVideoGenerationRequest(rawData);
    } catch (error) {
      throw new ValidationError([{
        field: 'request',
        message: error instanceof Error ? error.message : 'Invalid request format',
        value: 'unknown'
      }]);
    }

    const { scenes, aspectRatio: defaultAspectRatio, options = {} } = requestData;
    const {
      quality = 'medium',
      enableCaching = true,
      priority = 'medium',
      retryAttempts = 3,
      timeout = 120000
    } = options;

    requestLogger.info('Request validated successfully', {
      operation: 'video_generation_validation',
      additionalData: {
        sceneCount: scenes.length,
        defaultAspectRatio: defaultAspectRatio?.id,
        quality,
        enableCaching,
        priority
      }
    });

    // Estimate costs before processing
    const estimatedCost = estimateRequestCost(scenes, defaultAspectRatio);
    validateCostLimits(estimatedCost, MAX_COST_PER_REQUEST);

    requestLogger.trackCost('video_generation', 'estimation', estimatedCost, defaultAspectRatio);

    // Initialize services
    const storage = new Storage();
    const cache = getCacheManager();
    const metrics = getMetricsCollector();
    
    // Process scenes with aspect ratio awareness
    const videoGenerationTasks = scenes
      .filter(scene => scene.imageBase64)
      .map(async (scene, index) => {
        const sceneStartTime = Date.now();
        const sceneAspectRatio = scene.aspectRatio || defaultAspectRatio;
        const sceneLogger = requestLogger.createChildLogger({
          operation: 'scene_video_generation',
          aspectRatio: sceneAspectRatio?.id,
          additionalData: { sceneIndex: index }
        });

        try {
          sceneLogger.info(`Starting video generation for scene ${index + 1}`, {
            aspectRatio: sceneAspectRatio?.id
          });

          let url: string;
          let cost = 0;
          let cached = false;

          if (USE_COSMO) {
            url = 'cosmo.mp4';
          } else {
            // Check cache first if enabled
            if (enableCaching && sceneAspectRatio) {
              const cacheKey = cache.generateVideoKey(scene.videoPrompt, scene.imageBase64!, sceneAspectRatio);
              const cachedUrl = await cache.get<string>(cacheKey);
              
              if (cachedUrl) {
                url = cachedUrl;
                cached = true;
                sceneLogger.trackCacheOperation('get', cacheKey, true, sceneAspectRatio.id);
              }
            }

            if (!cached) {
              // Generate new video
              const { operationName, aspectRatio: resultAspectRatio, cost: generationCost } = await generateSceneVideo(
                scene.videoPrompt, 
                scene.imageBase64!, 
                sceneAspectRatio,
                {
                  enableCaching,
                  timeout,
                  retryAttempts,
                  priority
                }
              );

              sceneLogger.info(`Operation started for scene ${index + 1}`, {
                operationName,
                aspectRatio: resultAspectRatio.id,
                cost: generationCost
              });
              
              const generateVideoResponse = await waitForOperation(
                operationName,
                resultAspectRatio,
                {
                  maxWaitTime: timeout,
                  enableCaching
                }
              );

              cost = generateVideoResponse.cost;
              totalCost += cost;

              sceneLogger.info(`Video generation completed for scene ${index + 1}`, {
                cost,
                processingTime: Date.now() - sceneStartTime,
                aspectRatio: resultAspectRatio.id
              });
              
              const gcsUri = generateVideoResponse.response.videos[0].gcsUri;
              const [bucketName, ...pathSegments] = gcsUri.replace("gs://", "").split("/");
              const fileName = pathSegments.join("/");
            
              if (USE_SIGNED_URL) {
                const options: GetSignedUrlConfig = {
                  version: 'v4',
                  action: 'read',
                  expires: Date.now() + 60 * 60 * 1000,
                };

                [url] = await storage.bucket(bucketName).file(fileName).getSignedUrl(options);
              } else {
                const publicDir = path.join(process.cwd(), 'public');
                const videoFile = path.join(publicDir, fileName);
                const destinationDir = path.dirname(videoFile);
                
                await fs.mkdir(destinationDir, { recursive: true });
                await storage.bucket(bucketName).file(fileName).download({ destination: videoFile });
                
                url = fileName;
              }

              // Cache the result if enabled
              if (enableCaching && sceneAspectRatio) {
                try {
                  const cacheKey = cache.generateVideoKey(scene.videoPrompt, scene.imageBase64!, sceneAspectRatio);
                  await cache.set(cacheKey, url, 7200); // 2 hours TTL
                  sceneLogger.trackCacheOperation('set', cacheKey, true, sceneAspectRatio.id);
                } catch (cacheError) {
                  sceneLogger.warn('Failed to cache video result', { error: cacheError });
                }
              }
            }
          }

          processedScenes++;
          const sceneProcessingTime = Date.now() - sceneStartTime;

          // Record metrics
          metrics.recordRequest('veo', true, sceneProcessingTime, sceneAspectRatio, cost);
          sceneLogger.trackServiceOperation('veo', 'scene_generation', true, sceneProcessingTime, sceneAspectRatio, cost);

          return {
            url,
            aspectRatio: sceneAspectRatio,
            cost,
            cached,
            processingTime: sceneProcessingTime,
            sceneIndex: index
          };

        } catch (error) {
          const sceneProcessingTime = Date.now() - sceneStartTime;
          
          // Record failed metrics
          metrics.recordRequest('veo', false, sceneProcessingTime, sceneAspectRatio, 0);
          sceneLogger.trackServiceOperation('veo', 'scene_generation', false, sceneProcessingTime, sceneAspectRatio, undefined, error);
          
          // Log the error but continue with other scenes
          sceneLogger.error(`Video generation failed for scene ${index + 1}`, error);
          
          return {
            error: error instanceof Error ? error.message : 'Unknown error',
            sceneIndex: index,
            aspectRatio: sceneAspectRatio,
            processingTime: sceneProcessingTime
          };
        }
      });

    // Wait for all video generation tasks to complete
    const results = await Promise.all(videoGenerationTasks);
    const totalProcessingTime = Date.now() - startTime;

    // Separate successful and failed results
    const successful = results.filter(r => !('error' in r));
    const failed = results.filter(r => 'error' in r);

    // Build response
    const response: VideoGenerationResponse = {
      success: successful.length > 0,
      videoUrls: successful.map(r => ('url' in r ? r.url : '')),
      metadata: {
        processingTime: totalProcessingTime,
        cost: totalCost,
        aspectRatio: defaultAspectRatio || { id: '16:9', label: '16:9', ratio: 16/9, width: 16, height: 9, cssClass: 'aspect-[16/9]' },
        cacheHit: successful.some(r => 'cached' in r && r.cached),
        warnings: failed.length > 0 ? [`${failed.length} scenes failed to process`] : undefined
      }
    };

    // Add detailed results if there were failures
    if (failed.length > 0) {
      response.metadata!.warnings = response.metadata!.warnings || [];
      response.metadata!.warnings.push(`Failed scenes: ${failed.map(f => f.sceneIndex + 1).join(', ')}`);
    }

    // Log final results
    requestLogger.info('Video generation request completed', {
      operation: 'video_generation_complete',
      additionalData: {
        totalScenes: scenes.length,
        successfulScenes: successful.length,
        failedScenes: failed.length,
        totalCost,
        totalProcessingTime,
        cacheHitRate: successful.length > 0 ? successful.filter(r => 'cached' in r && r.cached).length / successful.length * 100 : 0
      }
    });

    return Response.json(response);

  } catch (error) {
    const totalProcessingTime = Date.now() - startTime;
    
    // Log error with context
    logError(error instanceof Error ? error : new Error(String(error)), {
      requestId,
      operation: 'video_generation_enhanced',
      processingTime: totalProcessingTime,
      processedScenes,
      totalCost
    });

    // Record failed metrics
    const metrics = getMetricsCollector();
    metrics.recordRequest('veo', false, totalProcessingTime, undefined, 0);

    // Return structured error response
    return Response.json(getErrorResponse(error instanceof Error ? error : new Error(String(error))), {
      status: error instanceof ValidationError ? 400 : 
             error instanceof CostLimitExceededError ? 402 :
             error instanceof VeoError ? 502 : 500
    });
  }
}

/**
 * GET endpoint for retrieving video generation metrics and health status
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'health';

  try {
    const metrics = getMetricsCollector();
    
    switch (type) {
      case 'health':
        const health = metrics.getHealthStatus();
        return Response.json(health);
      
      case 'metrics':
        const serviceMetrics = metrics.getAllServiceMetrics();
        return Response.json({
          services: Object.fromEntries(serviceMetrics),
          current: metrics.getCurrentMetrics()
        });
      
      case 'costs':
        const hours = parseInt(url.searchParams.get('hours') || '24');
        const service = url.searchParams.get('service') || undefined;
        const aspectRatio = url.searchParams.get('aspectRatio') || undefined;
        
        const costHistory = metrics.getCostHistory(service as any, aspectRatio, hours);
        const totalCost = metrics.getTotalCost(service as any, aspectRatio, hours);
        
        return Response.json({
          totalCost,
          costHistory,
          period: `${hours} hours`
        });
      
      default:
        return Response.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error retrieving video generation metrics', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
function estimateRequestCost(scenes: EnhancedScene[], defaultAspectRatio?: AspectRatio): number {
  const baseCostPerVideo = 0.10;
  let totalCost = 0;
  
  scenes.forEach(scene => {
    if (scene.imageBase64) {
      const aspectRatio = scene.aspectRatio || defaultAspectRatio;
      const multiplier = aspectRatio?.costMultiplier || 1;
      totalCost += baseCostPerVideo * multiplier;
    }
  });
  
  return totalCost;
}