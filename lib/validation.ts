import { z } from 'zod';
import { ASPECT_RATIOS } from '@/app/constants/aspectRatios';
import type { AspectRatio, Scene, VideoGenerationRequest, VideoProcessingOptions } from '@/app/types';

// Base schemas
export const AspectRatioSchema = z.object({
  id: z.string().min(1, 'Aspect ratio ID is required'),
  label: z.string().min(1, 'Aspect ratio label is required'),
  ratio: z.number().positive('Ratio must be positive'),
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
  cssClass: z.string().min(1, 'CSS class is required'),
  icon: z.string().optional(),
  description: z.string().optional(),
  imagenFormat: z.string().optional(),
  veoFormat: z.string().optional(),
  resolutionMappings: z.object({
    low: z.object({ width: z.number(), height: z.number() }).optional(),
    medium: z.object({ width: z.number(), height: z.number() }).optional(),
    high: z.object({ width: z.number(), height: z.number() }).optional(),
  }).optional(),
  costMultiplier: z.number().positive().optional(),
  isSupported: z.object({
    imagen: z.boolean().optional(),
    veo: z.boolean().optional(),
  }).optional(),
});

export const SceneMetadataSchema = z.object({
  createdAt: z.string().optional(),
  processingTime: z.number().optional(),
  cost: z.number().optional(),
  retryCount: z.number().optional(),
  version: z.string().optional(),
});

export const SceneSchema = z.object({
  imagePrompt: z.string().min(1, 'Image prompt is required'),
  videoPrompt: z.string().min(1, 'Video prompt is required'),
  description: z.string().min(1, 'Description is required'),
  voiceover: z.string().min(1, 'Voiceover is required'),
  charactersPresent: z.array(z.string()),
  imageBase64: z.string().optional(),
  videoUri: z.union([z.string(), z.promise(z.string())]).optional(),
  aspectRatio: AspectRatioSchema.optional(),
  metadata: SceneMetadataSchema.optional(),
});

export const VideoGenerationOptionsSchema = z.object({
  quality: z.enum(['low', 'medium', 'high']).default('medium'),
  enableCaching: z.boolean().default(true),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  retryAttempts: z.number().min(0).max(5).default(3),
  timeout: z.number().min(1000).max(600000).default(120000), // 2 minutes default
});

export const VideoGenerationRequestSchema = z.object({
  scenes: z.array(SceneSchema).min(1, 'At least one scene is required'),
  aspectRatio: AspectRatioSchema.optional(),
  options: VideoGenerationOptionsSchema.optional(),
});

export const VideoProcessingOptionsSchema = z.object({
  aspectRatio: AspectRatioSchema,
  quality: z.enum(['low', 'medium', 'high']).default('medium'),
  enableUpscaling: z.boolean().default(false),
  enableAspectRatioConversion: z.boolean().default(true),
  preserveAspectRatio: z.boolean().default(true),
});

// Validation functions
export function validateAspectRatio(aspectRatio: unknown): AspectRatio {
  try {
    return AspectRatioSchema.parse(aspectRatio);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(`Invalid aspect ratio: ${firstError.message}`);
    }
    throw new Error('Invalid aspect ratio format');
  }
}

export function validateAspectRatioId(id: string): AspectRatio {
  const aspectRatio = ASPECT_RATIOS.find(ar => ar.id === id);
  if (!aspectRatio) {
    const supportedIds = ASPECT_RATIOS.map(ar => ar.id);
    throw new Error(`Unsupported aspect ratio: ${id}. Supported ratios: ${supportedIds.join(', ')}`);
  }
  return validateAspectRatio(aspectRatio);
}

export function validateScene(scene: unknown): Scene {
  try {
    return SceneSchema.parse(scene);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Scene validation failed: ${errors.join(', ')}`);
    }
    throw new Error('Invalid scene format');
  }
}

export function validateVideoGenerationRequest(request: unknown): VideoGenerationRequest {
  try {
    const validated = VideoGenerationRequestSchema.parse(request);
    
    // Additional validation: check aspect ratio consistency
    if (validated.aspectRatio) {
      const aspectRatioId = validated.aspectRatio.id;
      for (const scene of validated.scenes) {
        if (scene.aspectRatio && scene.aspectRatio.id !== aspectRatioId) {
          throw new Error(`Scene aspect ratio mismatch: expected ${aspectRatioId}, got ${scene.aspectRatio.id}`);
        }
      }
    }
    
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Video generation request validation failed: ${errors.join(', ')}`);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Invalid video generation request format');
  }
}

export function validateVideoProcessingOptions(options: unknown): VideoProcessingOptions {
  try {
    return VideoProcessingOptionsSchema.parse(options);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Video processing options validation failed: ${errors.join(', ')}`);
    }
    throw new Error('Invalid video processing options format');
  }
}

// Service-specific validation
export function validateImagenAspectRatio(aspectRatio: AspectRatio): void {
  const supportedImagenRatios = ['16:9', '9:16', '4:3', '3:4', '1:1'];
  if (!supportedImagenRatios.includes(aspectRatio.id)) {
    throw new Error(`Aspect ratio ${aspectRatio.id} is not supported by Imagen. Supported ratios: ${supportedImagenRatios.join(', ')}`);
  }
}

export function validateVeoAspectRatio(aspectRatio: AspectRatio): void {
  const supportedVeoRatios = ['16:9', '9:16'];
  if (!supportedVeoRatios.includes(aspectRatio.id)) {
    throw new Error(`Aspect ratio ${aspectRatio.id} is not supported by Veo. Supported ratios: ${supportedVeoRatios.join(', ')}`);
  }
}

// Batch validation
export function validateBatchRequest(scenes: unknown[]): Scene[] {
  if (!Array.isArray(scenes)) {
    throw new Error('Scenes must be an array');
  }
  
  if (scenes.length === 0) {
    throw new Error('At least one scene is required');
  }
  
  if (scenes.length > 50) {
    throw new Error('Maximum 50 scenes allowed per batch');
  }
  
  return scenes.map((scene, index) => {
    try {
      return validateScene(scene);
    } catch (error) {
      throw new Error(`Scene ${index + 1} validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

// Cost validation
export function validateCostLimits(estimatedCost: number, maxCost: number = 100): void {
  if (estimatedCost > maxCost) {
    throw new Error(`Estimated cost $${estimatedCost.toFixed(2)} exceeds maximum allowed cost of $${maxCost.toFixed(2)}`);
  }
}

// Type guards
export function isValidAspectRatio(value: unknown): value is AspectRatio {
  try {
    AspectRatioSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function isValidScene(value: unknown): value is Scene {
  try {
    SceneSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}