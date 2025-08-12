'use server'

import { Storage, GetSignedUrlConfig } from '@google-cloud/storage';
import { tts } from '@/lib/tts';
import { generateSceneVideo, waitForOperation } from '@/lib/veo';
import { concatenateVideos, estimateVideoProcessingCost } from '@/lib/ffmpeg';
import { validateVideoProcessingOptions, validateAspectRatio, validateCostLimits } from '@/lib/validation';
import { getErrorResponse, VideoProcessingError, CostLimitExceededError } from '@/lib/errors';
import { logger, createRequestLogger, withAspectRatioLogging } from '@/lib/logger';
import { getMetricsCollector, recordFFmpegOperation } from '@/lib/metrics';
import { getCacheManager } from '@/lib/cache';
import { type Language, type AspectRatio, type Scene, type VideoProcessingOptions } from '../types';
import { DEFAULT_ASPECT_RATIO } from '@/app/constants/aspectRatios';
import { v4 as uuidv4 } from 'uuid';

const MAX_COST_PER_REQUEST = parseFloat(process.env.MAX_COST_PER_REQUEST || '50');

interface EnhancedVideoOptions {
  aspectRatio?: AspectRatio;
  quality?: 'low' | 'medium' | 'high';
  enableCaching?: boolean;
  enableAspectRatioValidation?: boolean;
  enableAspectRatioConversion?: boolean;
  maxRetries?: number;
  timeout?: number;
  priority?: 'low' | 'medium' | 'high';
}

interface VideoGenerationResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
  metadata?: {
    cost: number;
    processingTime: number;
    aspectRatio: AspectRatio;
    cacheHits: number;
    warnings?: string[];
    videoCount: number;
    audioGeneration: boolean;
  };
}

/**
 * Enhanced video editing with comprehensive aspect ratio support
 */
export async function editVideoEnhanced(
  scenes: Array<{
    voiceover: string;
    videoUri?: string | Promise<string>;
    aspectRatio?: AspectRatio;
  }>, 
  mood: string, 
  withVoiceOver: boolean, 
  language: Language,
  logoOverlay?: string,
  options: EnhancedVideoOptions = {}
): Promise<VideoGenerationResult> {
  const requestId = uuidv4();
  const {
    aspectRatio = DEFAULT_ASPECT_RATIO,
    quality = 'medium',
    enableCaching = true,
    enableAspectRatioValidation = true,
    enableAspectRatioConversion = false,
    maxRetries = 3,
    timeout = 300000, // 5 minutes
    priority = 'medium'
  } = options;

  const requestLogger = createRequestLogger(requestId, undefined, aspectRatio);
  const startTime = Date.now();
  let totalCost = 0;
  let cacheHits = 0;
  const warnings: string[] = [];

  try {
    requestLogger.info('Starting enhanced video editing', {
      operation: 'video_editing_enhanced',
      aspectRatio: aspectRatio.id,
      additionalData: {
        sceneCount: scenes.length,
        mood,
        withVoiceOver,
        language: language.name,
        quality,
        logoOverlay: !!logoOverlay
      }
    });

    // Validate aspect ratio
    const validatedAspectRatio = validateAspectRatio(aspectRatio);

    // Validate video processing options
    const processingOptions: VideoProcessingOptions = {
      aspectRatio: validatedAspectRatio,
      quality,
      enableAspectRatioConversion,
      enableAspectRatioValidation
    };
    validateVideoProcessingOptions(processingOptions);

    // Estimate costs
    const operations: Array<'concatenate' | 'audio' | 'overlay'> = ['concatenate'];
    if (withVoiceOver) operations.push('audio');
    if (logoOverlay) operations.push('overlay');
    
    const estimatedDuration = scenes.length * 5; // Assume 5 seconds per scene
    const estimatedCost = estimateVideoProcessingCost(operations, estimatedDuration, validatedAspectRatio);
    validateCostLimits(estimatedCost, MAX_COST_PER_REQUEST);

    requestLogger.trackCost('video_editing', 'estimation', estimatedCost, validatedAspectRatio);

    // Process video URIs
    const filteredGcsVideoUris = scenes
      .map((scene) => scene.videoUri)
      .filter((s): s is string => s !== undefined);

    if (filteredGcsVideoUris.length === 0) {
      throw new VideoProcessingError('No video URIs provided');
    }

    // Validate aspect ratios across scenes if enabled
    if (enableAspectRatioValidation) {
      const aspectRatioMismatches = scenes.filter(scene => 
        scene.aspectRatio && scene.aspectRatio.id !== validatedAspectRatio.id
      );
      
      if (aspectRatioMismatches.length > 0) {
        if (enableAspectRatioConversion) {
          warnings.push(`${aspectRatioMismatches.length} scenes have different aspect ratios and will be converted`);
        } else {
          warnings.push(`${aspectRatioMismatches.length} scenes have different aspect ratios`);
        }
      }
    }

    // Generate speech audio files with caching
    let speechAudioFiles: string[] = [];
    
    if (withVoiceOver) {
      requestLogger.info('Generating speech audio files', {
        operation: 'tts_generation_batch',
        additionalData: {
          sceneCount: scenes.length,
          language: language.name
        }
      });

      const cache = getCacheManager();
      const audioPromises = scenes.map(async (scene, index) => {
        const audioStartTime = Date.now();
        
        try {
          // Check cache first
          if (enableCaching) {
            const cacheKey = `tts:${language.code}:${scene.voiceover}`;
            const cachedAudio = await cache.get<string>(cacheKey);
            
            if (cachedAudio) {
              cacheHits++;
              requestLogger.trackCacheOperation('get', cacheKey, true);
              return cachedAudio;
            }
            requestLogger.trackCacheOperation('get', cacheKey, false);
          }

          requestLogger.info(`Generating TTS for scene ${index + 1}`, {
            operation: 'tts_generation',
            additionalData: { language: language.name }
          });

          const filename = await tts(scene.voiceover, language.code, 'Algenib');
          const audioCost = 0.001; // Estimated TTS cost
          totalCost += audioCost;

          // Cache the result
          if (enableCaching && filename) {
            try {
              const cacheKey = `tts:${language.code}:${scene.voiceover}`;
              await cache.set(cacheKey, filename, 3600); // 1 hour TTL
              requestLogger.trackCacheOperation('set', cacheKey, true);
            } catch (error) {
              requestLogger.warn('Failed to cache TTS result', { error });
            }
          }

          const audioDuration = Date.now() - audioStartTime;
          requestLogger.trackServiceOperation('tts', 'generation', true, audioDuration, validatedAspectRatio, audioCost);

          return filename;
        } catch (error) {
          const audioDuration = Date.now() - audioStartTime;
          requestLogger.trackServiceOperation('tts', 'generation', false, audioDuration, validatedAspectRatio, undefined, error);
          requestLogger.error(`Error generating TTS for scene ${index + 1}`, error);
          return null;
        }
      });

      const audioResults = await Promise.all(audioPromises);
      speechAudioFiles = audioResults.filter((s): s is string => s !== null);

      if (speechAudioFiles.length < scenes.length) {
        warnings.push(`Only ${speechAudioFiles.length} of ${scenes.length} audio files generated successfully`);
      }

      requestLogger.info('TTS generation completed', {
        operation: 'tts_generation_complete',
        additionalData: {
          successful: speechAudioFiles.length,
          total: scenes.length,
          cacheHits
        }
      });
    }

    // Concatenate videos with aspect ratio support
    requestLogger.info('Starting video concatenation', {
      operation: 'video_concatenation',
      aspectRatio: validatedAspectRatio.id
    });

    const concatenationResult = await concatenateVideos(
      filteredGcsVideoUris,
      speechAudioFiles,
      withVoiceOver,
      mood,
      validatedAspectRatio,
      logoOverlay,
      {
        quality,
        enableAspectRatioValidation,
        enableAspectRatioConversion
      }
    );

    totalCost += concatenationResult.cost;
    const processingTime = Date.now() - startTime;

    // Record final metrics
    const metrics = getMetricsCollector();
    metrics.recordPerformance({
      service: 'video_editing',
      operation: 'edit_enhanced',
      duration: processingTime,
      success: true,
      aspectRatio: validatedAspectRatio.id,
      metadata: {
        sceneCount: scenes.length,
        totalCost,
        cacheHits,
        withVoiceOver,
        logoOverlay: !!logoOverlay
      }
    });

    requestLogger.info('Video editing completed successfully', {
      operation: 'video_editing_complete',
      aspectRatio: validatedAspectRatio.id,
      additionalData: {
        videoUrl: concatenationResult.url,
        totalCost,
        processingTime,
        cacheHits,
        warnings: warnings.length
      }
    });

    return {
      success: true,
      videoUrl: concatenationResult.url,
      metadata: {
        cost: totalCost,
        processingTime,
        aspectRatio: validatedAspectRatio,
        cacheHits,
        warnings: warnings.length > 0 ? warnings : undefined,
        videoCount: filteredGcsVideoUris.length,
        audioGeneration: withVoiceOver
      }
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Record error metrics
    const metrics = getMetricsCollector();
    metrics.recordPerformance({
      service: 'video_editing',
      operation: 'edit_enhanced',
      duration: processingTime,
      success: false,
      aspectRatio: aspectRatio.id,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalCost,
        cacheHits
      }
    });

    requestLogger.error('Video editing failed', error, {
      operation: 'video_editing_error',
      additionalData: {
        processingTime,
        totalCost,
        cacheHits
      }
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate video',
      metadata: {
        cost: totalCost,
        processingTime,
        aspectRatio,
        cacheHits,
        warnings: warnings.length > 0 ? warnings : undefined,
        videoCount: scenes.length,
        audioGeneration: withVoiceOver
      }
    };
  }
}

/**
 * Enhanced video generation for scenes with aspect ratio support
 */
export async function generateVideosEnhanced(
  scenes: Array<Scene>,
  options: EnhancedVideoOptions = {}
): Promise<{
  success: boolean;
  scenes?: Array<Scene & { videoUri?: string; cost?: number; cached?: boolean }>;
  error?: string;
  metadata?: {
    totalCost: number;
    processingTime: number;
    aspectRatio: AspectRatio;
    successful: number;
    failed: number;
    cacheHits: number;
  };
}> {
  const requestId = uuidv4();
  const {
    aspectRatio = DEFAULT_ASPECT_RATIO,
    quality = 'medium',
    enableCaching = true,
    maxRetries = 3,
    timeout = 120000,
    priority = 'medium'
  } = options;

  const requestLogger = createRequestLogger(requestId, undefined, aspectRatio);
  const startTime = Date.now();
  let totalCost = 0;
  let cacheHits = 0;
  let successful = 0;
  let failed = 0;

  try {
    requestLogger.info('Starting enhanced video generation for scenes', {
      operation: 'scene_video_generation',
      aspectRatio: aspectRatio.id,
      additionalData: {
        sceneCount: scenes.length,
        quality,
        priority
      }
    });

    // Validate aspect ratio
    const validatedAspectRatio = validateAspectRatio(aspectRatio);

    // Filter scenes with images
    const scenesWithImages = scenes.filter(scene => scene.imageBase64);
    
    if (scenesWithImages.length === 0) {
      throw new VideoProcessingError('No scenes with images found');
    }

    // Estimate costs
    const estimatedCost = scenesWithImages.length * 0.10 * (validatedAspectRatio.costMultiplier || 1);
    validateCostLimits(estimatedCost, MAX_COST_PER_REQUEST);

    // Process scenes in parallel with concurrency control
    const concurrencyLimit = 3;
    const processedScenes: Array<Scene & { videoUri?: string; cost?: number; cached?: boolean }> = [...scenes];
    
    const semaphore = new Array(Math.min(concurrencyLimit, scenesWithImages.length)).fill(null);
    
    await Promise.all(semaphore.map(async (_, semIndex) => {
      for (let i = semIndex; i < scenesWithImages.length; i += semaphore.length) {
        const scene = scenesWithImages[i];
        const sceneIndex = scenes.indexOf(scene);
        const sceneStartTime = Date.now();
        
        try {
          requestLogger.info(`Generating video for scene ${sceneIndex + 1}`, {
            operation: 'scene_video_generation',
            aspectRatio: validatedAspectRatio.id,
            additionalData: { sceneIndex }
          });

          // Generate video with aspect ratio support
          const { operationName, aspectRatio: resultAspectRatio, cost: generationCost, cached } = await generateSceneVideo(
            scene.videoPrompt,
            scene.imageBase64!,
            validatedAspectRatio,
            {
              enableCaching,
              timeout,
              retryAttempts: maxRetries,
              priority
            }
          );

          if (cached) {
            cacheHits++;
            processedScenes[sceneIndex] = {
              ...scene,
              videoUri: operationName.replace('cached:', ''),
              cost: 0,
              cached: true
            };
            successful++;
          } else {
            // Wait for operation to complete
            const result = await waitForOperation(operationName, resultAspectRatio, {
              maxWaitTime: timeout,
              enableCaching
            });

            const videoUri = result.response.videos[0].gcsUri;
            totalCost += result.cost;

            processedScenes[sceneIndex] = {
              ...scene,
              videoUri,
              cost: result.cost,
              cached: false
            };
            successful++;
          }

          const sceneDuration = Date.now() - sceneStartTime;
          requestLogger.trackServiceOperation('veo', 'scene_video', true, sceneDuration, validatedAspectRatio, generationCost);

        } catch (error) {
          failed++;
          const sceneDuration = Date.now() - sceneStartTime;
          requestLogger.trackServiceOperation('veo', 'scene_video', false, sceneDuration, validatedAspectRatio, undefined, error);
          requestLogger.error(`Failed to generate video for scene ${sceneIndex + 1}`, error);
          
          // Keep the scene without video URI
          processedScenes[sceneIndex] = {
            ...scene,
            cost: 0
          };
        }
      }
    }));

    const processingTime = Date.now() - startTime;

    // Record metrics
    const metrics = getMetricsCollector();
    metrics.recordPerformance({
      service: 'scene_video_generation',
      operation: 'generate_batch',
      duration: processingTime,
      success: successful > 0,
      aspectRatio: validatedAspectRatio.id,
      metadata: {
        totalScenes: scenes.length,
        successful,
        failed,
        totalCost,
        cacheHits
      }
    });

    requestLogger.info('Scene video generation completed', {
      operation: 'scene_video_generation_complete',
      aspectRatio: validatedAspectRatio.id,
      additionalData: {
        successful,
        failed,
        totalCost,
        processingTime,
        cacheHits
      }
    });

    return {
      success: successful > 0,
      scenes: processedScenes,
      metadata: {
        totalCost,
        processingTime,
        aspectRatio: validatedAspectRatio,
        successful,
        failed,
        cacheHits
      }
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    requestLogger.error('Scene video generation failed', error, {
      operation: 'scene_video_generation_error',
      additionalData: {
        processingTime,
        totalCost,
        successful,
        failed
      }
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate videos',
      metadata: {
        totalCost,
        processingTime,
        aspectRatio,
        successful,
        failed,
        cacheHits
      }
    };
  }
}

/**
 * Batch video processing with aspect ratio optimization
 */
export async function processVideoBatch(
  videoRequests: Array<{
    scenes: Scene[];
    mood: string;
    withVoiceOver: boolean;
    language: Language;
    logoOverlay?: string;
    aspectRatio?: AspectRatio;
  }>,
  options: {
    maxConcurrent?: number;
    enableCaching?: boolean;
    quality?: 'low' | 'medium' | 'high';
  } = {}
): Promise<Array<VideoGenerationResult>> {
  const { maxConcurrent = 2, enableCaching = true, quality = 'medium' } = options;
  
  logger.info(`Processing ${videoRequests.length} video requests in batch`, {
    operation: 'video_batch_processing',
    additionalData: { maxConcurrent, quality }
  });

  const results: VideoGenerationResult[] = [];
  const semaphore = new Array(Math.min(maxConcurrent, videoRequests.length)).fill(null);
  
  await Promise.all(semaphore.map(async (_, semIndex) => {
    for (let i = semIndex; i < videoRequests.length; i += semaphore.length) {
      const request = videoRequests[i];
      
      try {
        const result = await editVideoEnhanced(
          request.scenes.map(scene => ({
            voiceover: scene.voiceover,
            videoUri: scene.videoUri,
            aspectRatio: scene.aspectRatio || request.aspectRatio
          })),
          request.mood,
          request.withVoiceOver,
          request.language,
          request.logoOverlay,
          {
            aspectRatio: request.aspectRatio,
            quality,
            enableCaching
          }
        );
        
        results[i] = result;
      } catch (error) {
        results[i] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  }));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  logger.info('Batch video processing completed', {
    operation: 'video_batch_complete',
    additionalData: { total: results.length, successful, failed }
  });
  
  return results;
}