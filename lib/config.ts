/**
 * Configuration validation and setup for Vertex AI integration
 */

export interface VertexAIConfig {
  projectId: string;
  location: string;
  model: string;
  geminiModel: string;
  gcsVideosStorageUri?: string;
  youtubeApiKey?: string;
}

export function getVertexAIConfig(): VertexAIConfig {
  const projectId = process.env.PROJECT_ID || 'fechen-aifatory';
  const location = process.env.LOCATION || 'us-central1';
  const model = process.env.MODEL || 'veo-001';
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-pro';
  const gcsVideosStorageUri = process.env.GCS_VIDEOS_STORAGE_URI;
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;

  // Log configuration for debugging
  console.log('Vertex AI Configuration:');
  console.log('  Project ID:', projectId);
  console.log('  Location:', location);
  console.log('  Veo Model:', model);
  console.log('  Gemini Model:', geminiModel);
  console.log('  GCS Videos Storage URI:', gcsVideosStorageUri || 'Not set');
  console.log('  YouTube API Key:', youtubeApiKey ? 'Set' : 'Not set');

  return {
    projectId,
    location,
    model,
    geminiModel,
    gcsVideosStorageUri,
    youtubeApiKey,
  };
}

export function validateVertexAIConfig(): void {
  const config = getVertexAIConfig();
  
  if (!config.projectId) {
    throw new Error('PROJECT_ID environment variable is required');
  }
  
  if (!config.location) {
    throw new Error('LOCATION environment variable is required');
  }

  console.log('Vertex AI configuration validated successfully');
}

/**
 * Available Gemini models in Vertex AI
 * Ordered by likelihood of availability in us-central1 region
 */
export const GEMINI_MODELS = {
  'gemini-1.5-pro': 'gemini-1.5-pro',             // Most widely available Pro version
  'gemini-1.5-flash': 'gemini-1.5-flash',         // Most widely available Flash version
  'gemini-1.0-pro': 'gemini-1.0-pro',             // Legacy but very stable
  'gemini-1.5-pro-002': 'gemini-1.5-pro-002',     // May not be available in all regions
  'gemini-1.5-flash-002': 'gemini-1.5-flash-002', // May not be available in all regions
  'gemini-2.5-flash': 'gemini-2.5-flash',         // Latest but limited availability
  'gemini-2.5-pro': 'gemini-2.5-pro',             // Latest but limited availability
} as const;

/**
 * Fallback models for when primary model is not available
 * Ordered by likelihood of availability in this project/region
 */
export const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash',     // Confirmed working in this project
  'gemini-2.5-pro',       // Latest version, likely available
  'gemini-1.5-flash',     // Current fast version
  'gemini-1.5-pro',       // Current stable version
  'gemini-1.0-pro',       // Stable v1.0
  'gemini-pro',           // Legacy model
  'gemini-1.5-pro-002',   // Specific version
  'gemini-1.5-flash-002'  // Specific version
] as const;

/**
 * Get the best available Gemini model for the current configuration
 */
export function getBestGeminiModel(preferredModel?: string): string {
  // If a preferred model is specified and it's in our known models, use it
  if (preferredModel && Object.values(GEMINI_MODELS).includes(preferredModel as any)) {
    return preferredModel;
  }
  
  // Default to the working model in this project
  return 'gemini-2.5-flash';
}

/**
 * Timeout configurations for different operations
 */
export const TIMEOUTS = {
  GEMINI_TEXT_GENERATION: 60000,     // 60 seconds for text generation
  IMAGEN_GENERATION: 120000,         // 2 minutes for image generation
  VEO_GENERATION: 300000,            // 5 minutes for video generation
  API_REQUEST: 30000,                // 30 seconds for general API requests
} as const;

/**
 * Available Imagen models in Vertex AI
 */
export const IMAGEN_MODELS = {
  'imagen-3.0-generate-002': 'imagen-3.0-generate-002',
  'imagen-3.0-capability-001': 'imagen-3.0-capability-001',
} as const;