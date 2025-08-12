'use server'

import { generateImageCustomizationRest, generateImageRest } from '@/lib/imagen-enhanced';
import { getVertexAIConfig, TIMEOUTS } from '@/lib/config';
import { AuthenticationError } from '@/lib/auth';
import { parseWithFallback, translateError, cleanJsonResponse, validateScenesData, validateScenesDataLenient } from '@/lib/error-utils';
import { generateTextWithGemini, GeminiServiceError, checkGeminiHealth } from '@/lib/gemini-service';
import { createDebugTracker, logEnvironmentInfo, validateEnvironment } from '@/lib/debug-utils';
import { validateAspectRatio, validateCostLimits, validateBatchRequest } from '@/lib/validation';
import { getErrorResponse, ValidationError, CostLimitExceededError } from '@/lib/errors';
import { logger, createRequestLogger, withAspectRatioLogging } from '@/lib/logger';
import { getMetricsCollector, recordGeminiRequest } from '@/lib/metrics';
import { getCacheManager } from '@/lib/cache';
import { ASPECT_RATIOS, getAspectRatioById, DEFAULT_ASPECT_RATIO } from '@/app/constants/aspectRatios';

import { Scene, Scenario, Language, AspectRatio } from "../types"
import { v4 as uuidv4 } from 'uuid';

const config = getVertexAIConfig();
const MAX_COST_PER_REQUEST = parseFloat(process.env.MAX_COST_PER_REQUEST || '25');

interface EnhancedGenerationOptions {
  aspectRatio?: AspectRatio;
  enableCaching?: boolean;
  imageQuality?: 'low' | 'medium' | 'high';
  enableImageGeneration?: boolean;
  customCharacters?: Array<{ name: string; description: string; imageBase64?: string }>;
  enableCostTracking?: boolean;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Enhanced scene generation with comprehensive aspect ratio support
 * 
 * Features:
 * - Aspect ratio validation and processing
 * - Cost estimation and tracking
 * - Intelligent caching
 * - Batch image generation optimization
 * - Comprehensive error handling
 * - Performance metrics
 */
export async function generateScenesEnhanced(
  pitch: string, 
  numScenes: number, 
  style: string, 
  language: Language,
  options: EnhancedGenerationOptions = {}
): Promise<Scenario & { metadata: { cost: number; processingTime: number; cacheHits: number } }> {
  const requestId = uuidv4();
  const requestLogger = createRequestLogger(requestId, undefined, options.aspectRatio);
  const debugTracker = createDebugTracker('generate-scenes-enhanced');
  const startTime = Date.now();
  
  const {
    aspectRatio = DEFAULT_ASPECT_RATIO,
    enableCaching = true,
    imageQuality = 'medium',
    enableImageGeneration = true,
    customCharacters = [],
    enableCostTracking = true,
    maxRetries = 3,
    timeout = TIMEOUTS.GEMINI_TEXT_GENERATION
  } = options;

  let totalCost = 0;
  let cacheHits = 0;
  
  try {
    debugTracker.startStep('initialization');
    requestLogger.info('Starting enhanced scene generation', {
      operation: 'generate_scenes_enhanced',
      aspectRatio: aspectRatio.id,
      additionalData: {
        numScenes,
        style,
        language: language.name,
        enableImageGeneration,
        imageQuality,
        customCharacters: customCharacters.length
      }
    });

    // Validate aspect ratio
    const validatedAspectRatio = validateAspectRatio(aspectRatio);
    
    // Estimate costs before processing
    const estimatedCost = estimateSceneGenerationCost(numScenes, enableImageGeneration, customCharacters.length, validatedAspectRatio);
    if (enableCostTracking) {
      validateCostLimits(estimatedCost, MAX_COST_PER_REQUEST);
      requestLogger.trackCost('scene_generation', 'estimation', estimatedCost, validatedAspectRatio);
    }

    // Log environment information for debugging
    logEnvironmentInfo();
    
    // Validate environment configuration
    const envValidation = validateEnvironment();
    if (!envValidation.valid) {
      console.error('❌ Environment validation failed:', envValidation.issues);
      debugTracker.addError('initialization', `Environment issues: ${envValidation.issues.join(', ')}`);
    }
    if (envValidation.warnings.length > 0) {
      console.warn('⚠️ Environment warnings:', envValidation.warnings);
    }
    
    requestLogger.info('Configuration validated', {
      operation: 'config_validation',
      additionalData: {
        projectId: config.projectId,
        location: config.location,
        geminiModel: config.geminiModel,
        estimatedCost
      }
    });
    debugTracker.endStep('initialization', true);
    
    // Check cache for similar scenario
    const cache = getCacheManager();
    let cachedScenario: Scenario | null = null;
    
    if (enableCaching) {
      debugTracker.startStep('cache-check');
      const cacheKey = cache.generateScenarioKey({
        pitch,
        numScenes,
        style,
        language,
        aspectRatio: validatedAspectRatio
      });
      
      cachedScenario = await cache.get<Scenario>(cacheKey);
      if (cachedScenario) {
        cacheHits++;
        requestLogger.trackCacheOperation('get', cacheKey, true, validatedAspectRatio.id);
        requestLogger.info('Using cached scenario', { operation: 'cache_hit' });
        debugTracker.endStep('cache-check', true, 'Cache hit');
        
        return {
          ...cachedScenario,
          aspectRatio: validatedAspectRatio,
          metadata: {
            cost: 0,
            processingTime: Date.now() - startTime,
            cacheHits: 1
          }
        };
      }
      
      requestLogger.trackCacheOperation('get', cacheKey, false, validatedAspectRatio.id);
      debugTracker.endStep('cache-check', true, 'Cache miss');
    }

    // First, check Gemini service health
    debugTracker.startStep('health-check');
    const healthStatus = await checkGeminiHealth();
    requestLogger.info('Gemini health check completed', {
      operation: 'health_check',
      additionalData: { healthy: healthStatus.healthy }
    });
    
    if (!healthStatus.healthy) {
      debugTracker.endStep('health-check', false, healthStatus.error);
      debugTracker.addError('health-check', healthStatus.error || 'Service unhealthy');
      
      // Return fallback scenario if Gemini is completely unavailable
      requestLogger.warn('Creating fallback scenario due to Gemini unavailability');
      debugTracker.startStep('fallback-scenario');
      const fallback = createFallbackScenario(pitch, numScenes, style, language, validatedAspectRatio);
      debugTracker.endStep('fallback-scenario', true);
      debugTracker.logSummary();
      
      return {
        ...fallback,
        metadata: {
          cost: 0,
          processingTime: Date.now() - startTime,
          cacheHits
        }
      };
    }
    debugTracker.endStep('health-check', true);
  
    debugTracker.startStep('gemini-text-generation');
    
    // Enhanced prompt with aspect ratio considerations
    const prompt = createEnhancedPrompt(pitch, numScenes, style, language, validatedAspectRatio);
    
    requestLogger.info('Generating scenario with Gemini', {
      operation: 'gemini_text_generation',
      aspectRatio: validatedAspectRatio.id
    });
    
    const geminiStartTime = Date.now();
    const text = await generateTextWithGemini(prompt, {
      temperature: 1,
      maxTokens: 8192,
      timeout
    });
    const geminiDuration = Date.now() - geminiStartTime;
    
    // Record Gemini metrics
    const geminiCost = 0.002; // Estimated cost per request
    totalCost += geminiCost;
    recordGeminiRequest(true, geminiDuration, geminiCost);
    requestLogger.trackServiceOperation('gemini', 'text_generation', true, geminiDuration, validatedAspectRatio, geminiCost);
    
    requestLogger.info('Gemini response received', {
      operation: 'gemini_response',
      additionalData: {
        textLength: text.length,
        duration: geminiDuration,
        cost: geminiCost
      }
    });
    debugTracker.endStep('gemini-text-generation', true);

    if (!text) {
      debugTracker.endStep('gemini-text-generation', false, 'No text generated');
      throw new Error('No text generated from the AI model');
    }

    debugTracker.startStep('response-parsing');
    let scenario: Scenario;
    try {
      // Use three-tier parsing strategy for better compatibility
      const parseResult = parseWithFallback(text);
      
      if (!parseResult.success) {
        requestLogger.error('Failed to parse AI response', parseResult.error);
        debugTracker.addError('response-parsing', `Parse error: ${parseResult.error.message}`);
        
        throw new Error(`${parseResult.error.title}: ${parseResult.error.message}${
          parseResult.error.actionable ? ` ${parseResult.error.actionable}` : ''
        }`);
      }
      
      // Use lenient validation for better main branch compatibility
      const scenesValidation = validateScenesDataLenient(parseResult.data);
      if (!scenesValidation.valid) {
        debugTracker.addError('response-parsing', `Validation error: ${scenesValidation.warnings?.join(', ') || 'Unknown validation issue'}`);
        requestLogger.warn('Lenient validation failed, using fallback scenario');
        debugTracker.startStep('fallback-scenario');
        const fallback = createFallbackScenario(pitch, numScenes, style, language, validatedAspectRatio);
        debugTracker.endStep('fallback-scenario', true);
        
        return {
          ...fallback,
          metadata: {
            cost: totalCost,
            processingTime: Date.now() - startTime,
            cacheHits
          }
        };
      }
      
      scenario = {
        ...parseResult.data,
        aspectRatio: validatedAspectRatio,
        metadata: {
          id: requestId,
          createdAt: new Date().toISOString(),
          version: '2.0',
          totalCost: 0,
          processingTime: 0
        }
      };
      
      // Add aspect ratio to each scene
      scenario.scenes = scenario.scenes.map(scene => ({
        ...scene,
        aspectRatio: validatedAspectRatio,
        metadata: {
          createdAt: new Date().toISOString(),
          version: '2.0'
        }
      }));
      
      requestLogger.info('Scenario parsed successfully', {
        operation: 'scenario_parsing',
        additionalData: {
          sceneCount: scenario.scenes.length,
          hasCharacters: scenario.characters?.length > 0
        }
      });
      debugTracker.endStep('response-parsing', true);
    } catch (error) {
      debugTracker.endStep('response-parsing', false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }

    // Generate images for scenes if enabled
    if (enableImageGeneration) {
      debugTracker.startStep('image-generation');
      requestLogger.info('Starting image generation for scenes', {
        operation: 'image_generation_batch',
        aspectRatio: validatedAspectRatio.id,
        additionalData: {
          sceneCount: scenario.scenes.length,
          imageQuality
        }
      });
      
      const { scenes: scenesWithImages, cost: imageCost, cacheHitsCount } = await generateScenesImages(
        scenario.scenes,
        scenario.characters || [],
        validatedAspectRatio,
        {
          enableCaching,
          quality: imageQuality,
          customCharacters,
          maxRetries
        }
      );
      
      scenario.scenes = scenesWithImages;
      totalCost += imageCost;
      cacheHits += cacheHitsCount;
      
      requestLogger.info('Image generation completed', {
        operation: 'image_generation_complete',
        additionalData: {
          imageCost,
          cacheHits: cacheHitsCount,
          totalCost
        }
      });
      debugTracker.endStep('image-generation', true);
    }

    // Cache the scenario for future use
    if (enableCaching && !cachedScenario) {
      try {
        const cacheKey = cache.generateScenarioKey({
          pitch,
          numScenes,
          style,
          language,
          aspectRatio: validatedAspectRatio
        });
        await cache.set(cacheKey, scenario, 3600); // 1 hour TTL
        requestLogger.trackCacheOperation('set', cacheKey, true, validatedAspectRatio.id);
      } catch (error) {
        requestLogger.warn('Failed to cache scenario', { error });
      }
    }

    const processingTime = Date.now() - startTime;
    
    // Update scenario metadata
    scenario.metadata = {
      ...scenario.metadata,
      totalCost,
      processingTime
    };
    
    // Record final metrics
    const metrics = getMetricsCollector();
    metrics.recordPerformance({
      service: 'scene_generation',
      operation: 'generate_enhanced',
      duration: processingTime,
      success: true,
      aspectRatio: validatedAspectRatio.id,
      metadata: {
        sceneCount: numScenes,
        imageGeneration: enableImageGeneration,
        totalCost,
        cacheHits
      }
    });
    
    requestLogger.info('Scene generation completed successfully', {
      operation: 'generate_scenes_complete',
      aspectRatio: validatedAspectRatio.id,
      additionalData: {
        totalCost,
        processingTime,
        cacheHits,
        sceneCount: scenario.scenes.length
      }
    });
    
    debugTracker.logSummary();
    
    return {
      ...scenario,
      metadata: {
        cost: totalCost,
        processingTime,
        cacheHits
      }
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Record error metrics
    const metrics = getMetricsCollector();
    metrics.recordPerformance({
      service: 'scene_generation',
      operation: 'generate_enhanced',
      duration: processingTime,
      success: false,
      aspectRatio: options.aspectRatio?.id,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalCost,
        cacheHits
      }
    });
    
    requestLogger.error('Scene generation failed', error, {
      operation: 'generate_scenes_error',
      additionalData: {
        processingTime,
        totalCost,
        cacheHits
      }
    });
    
    debugTracker.logSummary();
    
    // If it's a known error type, throw it as-is
    if (error instanceof ValidationError || error instanceof CostLimitExceededError || error instanceof AuthenticationError) {
      throw error;
    }
    
    // Otherwise, wrap it in a generic error
    throw new Error(`Scene generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a fallback scenario with aspect ratio support when AI parsing fails
 */
function createFallbackScenario(
  pitch: string, 
  numScenes: number, 
  style: string, 
  language: Language,
  aspectRatio: AspectRatio
): Scenario {
  console.log('Creating fallback scenario for pitch:', pitch.substring(0, 100))
  
  const fallbackScenes: Scene[] = []
  
  for (let i = 0; i < numScenes; i++) {
    fallbackScenes.push({
      imagePrompt: `${style} style: A compelling scene from the story "${pitch.substring(0, 50)}...". Professional cinematography with dramatic lighting and composition. Optimized for ${aspectRatio.label} aspect ratio.`,
      videoPrompt: `Camera slowly moves to reveal the scene. Characters move naturally with emotional expressions that convey the story's message. Composed for ${aspectRatio.id} aspect ratio.`,
      description: `Scene ${i + 1}: The story unfolds as we see the key moment from the pitch come to life.`,
      voiceover: `This scene brings the story to life with visual impact.`,
      charactersPresent: [],
      aspectRatio,
      metadata: {
        createdAt: new Date().toISOString(),
        version: '2.0'
      }
    })
  }
  
  return {
    scenario: `A compelling story based on: ${pitch}. This scenario brings the core message to life through visual storytelling, optimized for ${aspectRatio.label}.`,
    genre: 'Cinematic',
    mood: 'Inspirational',
    music: 'Orchestral score that enhances the emotional journey of the story.',
    language: {
      name: language.name,
      code: language.code
    },
    characters: [
      { name: 'Protagonist', description: 'A relatable character who embodies the story\'s main theme' }
    ],
    settings: [
      { name: 'Main Setting', description: 'A visually appealing environment that supports the story narrative' }
    ],
    scenes: fallbackScenes,
    aspectRatio,
    metadata: {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      version: '2.0',
      totalCost: 0,
      processingTime: 0
    }
  }
}

/**
 * Create enhanced prompt with aspect ratio considerations
 */
function createEnhancedPrompt(
  pitch: string, 
  numScenes: number, 
  style: string, 
  language: Language,
  aspectRatio: AspectRatio
): string {
  const aspectRatioGuidance = getAspectRatioPromptGuidance(aspectRatio);
  
  return `
You are tasked with generating a creative scenario for a short movie and creating prompts for storyboard illustrations optimized for ${aspectRatio.label} (${aspectRatio.id}) aspect ratio. Follow these instructions carefully:

1. First, you will be given a story pitch. This story pitch will be the foundation for your scenario.

<pitch>
${pitch}
</pitch>

2. Generate a scenario in ${language.name} for an ad movie based on the story pitch. Stick as close as possible to the pitch. Do not include children in your scenario.

3. ASPECT RATIO CONSIDERATIONS:
${aspectRatioGuidance}

4. What Music Genre will best fit this video, pick from: 
- Alternative & Punk
- Ambient
- Children's
- Cinematic
- Classical
- Country & Folk
- Dance & Electronic
- Hip-Hop & Rap
- Holiday
- Jazz & Blues
- Pop
- R&B & Soul
- Reggae
- Rock

5. What is the mood of this video, pick from:
- Angry
- Bright
- Calm
- Dark
- Dramatic
- Funky
- Happy
- Inspirational
- Romantic
- Sad

6. Generate a short description of the music that will be used in the video.

7. After creating the scenario, generate ${numScenes} creative scenes to create a storyboard illustrating the scenario optimized for ${aspectRatio.id} aspect ratio. Follow these guidelines for the scenes:
 a. For each scene, provide:
 1. A detailed visual description for AI image generation (imagePrompt), the style should be ${style}. ${aspectRatioGuidance}. Always use the FULL character(s) description(s) in your images prompts. Do NOT use the character(s) name(s) in your image prompts. Always use indefinite articles when describing character(s). No children.
 2. A video prompt, focusing on the movement of the characters, objects, in the scene optimized for ${aspectRatio.id}. Always use the FULL character(s) description(s) in your video prompts. Do NOT use the character(s) name(s) in your video prompts. Always use indefinite articles when describing character(s). No children.
 3. A scene description in ${language.name} explaining what happens (description). You can use the character(s) name(s) in your descriptions.
 4. A short, narrator voiceover text in ${language.name}. One full sentence, 6s max. (voiceover). You can use the character(s) name(s) in your voiceovers.

Your response should be in JSON format with the following structure:
{
  "scenario": "string",
  "genre": "string",
  "mood": "string", 
  "music": "string",
  "language": {
    "name": "${language.name}",
    "code": "${language.code}"
  },
  "characters": [
    {
      "name": "string",
      "description": "string"
    }
  ],
  "settings": [
    {
      "name": "string", 
      "description": "string"
    }
  ],
  "scenes": [
    {
      "imagePrompt": "string (optimized for ${aspectRatio.id})",
      "videoPrompt": "string (optimized for ${aspectRatio.id})",
      "description": "string",
      "voiceover": "string",
      "charactersPresent": ["string"]
    }
  ]
}

Remember, your goal is to create a compelling and visually interesting story that can be effectively illustrated through a storyboard optimized for ${aspectRatio.label}. Be creative, consistent, and detailed in your scenario and prompts.`;
}

/**
 * Get aspect ratio specific prompt guidance
 */
function getAspectRatioPromptGuidance(aspectRatio: AspectRatio): string {
  switch (aspectRatio.id) {
    case '16:9':
      return "This is widescreen format (16:9). Compose scenes with horizontal emphasis. Use wide shots, panoramic views, and cinematic framing. Characters can be positioned across the wide frame for dramatic effect.";
    case '9:16':
      return "This is vertical/portrait format (9:16) for mobile viewing. Compose scenes with vertical emphasis. Focus on close-ups, vertical compositions, and tall subjects. Characters should be positioned to fill the vertical frame effectively.";
    case '4:3':
      return "This is traditional TV format (4:3). Use balanced compositions with equal emphasis on width and height. Center subjects effectively and use the square-ish frame for intimate, focused shots.";
    case '1:1':
      return "This is square format (1:1) for social media. Create perfectly balanced compositions. Center subjects or use symmetrical arrangements. Every element should work within the square constraint.";
    case '21:9':
      return "This is ultrawide cinematic format (21:9). Use the extreme width for epic panoramic shots, multiple subjects across the frame, and dramatic horizontal compositions. Perfect for landscapes and action sequences.";
    case '3:4':
      return "This is portrait format (3:4) similar to classic photography. Compose with slight vertical emphasis while maintaining good balance. Ideal for character portraits and vertical subjects.";
    default:
      return "Compose scenes appropriately for the given aspect ratio, ensuring all visual elements work within the frame constraints.";
  }
}

/**
 * Generate images for all scenes with aspect ratio optimization
 */
async function generateScenesImages(
  scenes: Scene[],
  characters: Array<{ name: string; description: string; imageBase64?: string }>,
  aspectRatio: AspectRatio,
  options: {
    enableCaching?: boolean;
    quality?: 'low' | 'medium' | 'high';
    customCharacters?: Array<{ name: string; description: string; imageBase64?: string }>;
    maxRetries?: number;
  } = {}
): Promise<{ scenes: Scene[]; cost: number; cacheHitsCount: number }> {
  const { enableCaching = true, quality = 'medium', customCharacters = [], maxRetries = 3 } = options;
  
  let totalCost = 0;
  let cacheHitsCount = 0;
  const processedScenes: Scene[] = [];
  
  // Merge default characters with custom characters
  const allCharacters = [...characters, ...customCharacters];
  const hasCustomCharacters = allCharacters.some(char => char.imageBase64);
  
  logger.info(`Generating images for ${scenes.length} scenes`, {
    operation: 'batch_image_generation',
    aspectRatio: aspectRatio.id,
    additionalData: {
      quality,
      hasCustomCharacters,
      characterCount: allCharacters.length
    }
  });

  // Process scenes in parallel with concurrency limit
  const concurrencyLimit = 3;
  const semaphore = new Array(Math.min(concurrencyLimit, scenes.length)).fill(null);
  
  await Promise.all(semaphore.map(async (_, semIndex) => {
    for (let i = semIndex; i < scenes.length; i += semaphore.length) {
      const scene = scenes[i];
      const sceneStartTime = Date.now();
      
      try {
        let imageResult;
        
        if (hasCustomCharacters) {
          imageResult = await generateImageCustomizationRest(
            scene.imagePrompt,
            allCharacters,
            aspectRatio,
            { enableCaching, quality, retryAttempts: maxRetries }
          );
        } else {
          imageResult = await generateImageRest(
            scene.imagePrompt,
            aspectRatio,
            { enableCaching, quality, retryAttempts: maxRetries }
          );
        }
        
        const processedScene: Scene = {
          ...scene,
          imageBase64: imageResult.predictions[0]?.bytesBase64Encoded,
          aspectRatio,
          metadata: {
            ...scene.metadata,
            processingTime: Date.now() - sceneStartTime,
            cost: imageResult.cost,
            retryCount: imageResult.retryCount || 0
          }
        };
        
        processedScenes[i] = processedScene;
        totalCost += imageResult.cost;
        
        if (imageResult.cached) {
          cacheHitsCount++;
        }
        
        logger.info(`Scene ${i + 1} image generated`, {
          operation: 'scene_image_generated',
          aspectRatio: aspectRatio.id,
          additionalData: {
            cached: imageResult.cached,
            cost: imageResult.cost,
            processingTime: imageResult.processingTime
          }
        });
        
      } catch (error) {
        logger.error(`Failed to generate image for scene ${i + 1}`, error);
        
        // Add scene without image
        processedScenes[i] = {
          ...scene,
          aspectRatio,
          metadata: {
            ...scene.metadata,
            processingTime: Date.now() - sceneStartTime,
            cost: 0
          }
        };
      }
    }
  }));
  
  return {
    scenes: processedScenes,
    cost: totalCost,
    cacheHitsCount
  };
}

/**
 * Estimate the cost of scene generation
 */
function estimateSceneGenerationCost(
  numScenes: number,
  enableImageGeneration: boolean,
  customCharacterCount: number,
  aspectRatio: AspectRatio
): number {
  let cost = 0;
  
  // Gemini text generation cost
  cost += 0.002;
  
  if (enableImageGeneration) {
    const baseImageCost = customCharacterCount > 0 ? 0.04 : 0.02;
    const characterMultiplier = Math.max(1, customCharacterCount);
    const aspectRatioMultiplier = aspectRatio.costMultiplier || 1;
    
    cost += numScenes * baseImageCost * characterMultiplier * aspectRatioMultiplier;
  }
  
  return cost;
}