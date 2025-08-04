/**
 * Configuration validation and setup for Vertex AI integration
 */

export interface VertexAIConfig {
  projectId: string;
  location: string;
  model: string;
  gcsVideosStorageUri?: string;
}

export function getVertexAIConfig(): VertexAIConfig {
  const projectId = process.env.PROJECT_ID || 'fechen-aifatory';
  const location = process.env.LOCATION || 'us-central1';
  const model = process.env.MODEL || 'veo-001';
  const gcsVideosStorageUri = process.env.GCS_VIDEOS_STORAGE_URI;

  // Log configuration for debugging
  console.log('Vertex AI Configuration:');
  console.log('  Project ID:', projectId);
  console.log('  Location:', location);
  console.log('  Model:', model);
  console.log('  GCS Videos Storage URI:', gcsVideosStorageUri || 'Not set');

  return {
    projectId,
    location,
    model,
    gcsVideosStorageUri,
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
 */
export const GEMINI_MODELS = {
  'gemini-2.5-flash': 'gemini-2.5-flash',         // Latest Gemini 2.5 Flash
  'gemini-2.5-pro': 'gemini-2.5-pro',             // Latest Gemini 2.5 Pro
  'gemini-1.5-pro-002': 'gemini-1.5-pro-002',     // Stable Gemini 1.5 Pro
  'gemini-1.5-flash-002': 'gemini-1.5-flash-002', // Fast Gemini 1.5 Flash
} as const;

/**
 * Available Imagen models in Vertex AI
 */
export const IMAGEN_MODELS = {
  'imagen-3.0-generate-002': 'imagen-3.0-generate-002',
  'imagen-3.0-capability-001': 'imagen-3.0-capability-001',
} as const;