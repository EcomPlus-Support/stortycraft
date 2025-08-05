/**
 * Enhanced Gemini service with proper error handling, fallbacks, and debugging
 */

import { generateText } from 'ai'
import { createVertex } from '@ai-sdk/google-vertex'
import { getVertexAIConfig, getBestGeminiModel, GEMINI_FALLBACK_MODELS, TIMEOUTS } from './config'
import { AuthenticationError } from './auth'

export interface GeminiServiceConfig {
  projectId: string;
  location: string;
  model: string;
  maxRetries: number;
  timeout: number;
}

export class GeminiServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public isRetryable: boolean = false,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'GeminiServiceError';
  }
}

export class GeminiService {
  private config: GeminiServiceConfig;
  private vertex!: ReturnType<typeof createVertex>;
  private static instance: GeminiService;

  private constructor() {
    const vertexConfig = getVertexAIConfig();
    this.config = {
      projectId: vertexConfig.projectId,
      location: vertexConfig.location,
      model: getBestGeminiModel(vertexConfig.geminiModel),
      maxRetries: 3,
      timeout: TIMEOUTS.GEMINI_TEXT_GENERATION
    };

    console.log('Initializing Gemini Service with config:', {
      projectId: this.config.projectId,
      location: this.config.location,
      model: this.config.model,
      timeout: this.config.timeout
    });

    // Initialize Vertex AI client
    this.initializeVertex();
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  private initializeVertex() {
    try {
      this.vertex = createVertex({
        project: this.config.projectId,
        location: this.config.location,
        googleAuthOptions: {
          projectId: this.config.projectId,
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        },
      });
      console.log('Vertex AI client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Vertex AI client:', error);
      throw new GeminiServiceError(
        'Failed to initialize Gemini service',
        'INIT_ERROR',
        false,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Test model availability by making a simple request
   */
  private async testModelAvailability(modelName: string): Promise<boolean> {
    try {
      console.log(`Testing model availability: ${modelName}`);
      
      const testPrompt = 'Hello! Please respond with exactly "HEALTHY" to confirm you are working correctly.';
      const startTime = Date.now();
      
      const { text } = await generateText({
        model: this.vertex(modelName),
        prompt: testPrompt,
        temperature: 0.1,
        maxTokens: 50,
        abortSignal: AbortSignal.timeout(15000) // 15 second timeout for availability test
      });

      const responseTime = Date.now() - startTime;
      console.log(`Model ${modelName} responded in ${responseTime}ms with: ${text?.substring(0, 50)}`);
      
      return Boolean(text && text.trim().length > 0);
    } catch (error: any) {
      console.warn(`Model ${modelName} not available:`, error.message);
      
      // Check for specific error types that indicate model unavailability
      if (error.message?.includes('model not found') || 
          error.message?.includes('not available') ||
          error.message?.includes('region') ||
          error.response?.status === 404) {
        return false;
      }
      
      // Other errors might be temporary, so we'll treat them as unavailable for safety
      return false;
    }
  }

  /**
   * Find the best available model from our fallback list
   */
  private async findAvailableModel(): Promise<string> {
    console.log('Finding best available Gemini model...');
    
    // First try the configured model
    if (await this.testModelAvailability(this.config.model)) {
      console.log(`Using configured model: ${this.config.model}`);
      return this.config.model;
    }

    // Try fallback models in order of preference
    for (const fallbackModel of GEMINI_FALLBACK_MODELS) {
      if (await this.testModelAvailability(fallbackModel)) {
        console.log(`Using fallback model: ${fallbackModel}`);
        this.config.model = fallbackModel; // Update config for future requests
        return fallbackModel;
      }
    }

    throw new GeminiServiceError(
      `No Gemini models are available in region ${this.config.location} for project ${this.config.projectId}`,
      'NO_MODELS_AVAILABLE',
      false
    );
  }

  /**
   * Generate text with comprehensive error handling and retries
   */
  public async generateText(prompt: string, options: {
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  } = {}): Promise<string> {
    const {
      temperature = 1,
      maxTokens = 8192,
      timeout: initialTimeout = this.config.timeout
    } = options;
    
    let timeout = initialTimeout;

    console.log('Generating text with Gemini:', {
      model: this.config.model,
      promptLength: prompt.length,
      temperature,
      maxTokens,
      timeout
    });

    let lastError: unknown;
    let currentModel = this.config.model;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt + 1}/${this.config.maxRetries} with model: ${currentModel}`);
        
        const startTime = Date.now();
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), timeout);

        try {
          const result = await generateText({
            model: this.vertex(currentModel),
            prompt,
            temperature,
            maxTokens,
            abortSignal: abortController.signal
          });

          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          
          console.log(`Generated text successfully in ${responseTime}ms:`, {
            textLength: result.text?.length || 0,
            textPreview: result.text?.substring(0, 100) + '...'
          });

          if (!result.text || result.text.trim().length === 0) {
            throw new GeminiServiceError(
              'No response generated from Gemini',
              'EMPTY_RESPONSE',
              true
            );
          }

          return result.text;
        } finally {
          clearTimeout(timeoutId);
        }

      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || 'Unknown error';
        
        console.error(`Attempt ${attempt + 1} failed:`, {
          error: errorMessage,
          model: currentModel,
          isTimeout: error.name === 'AbortError'
        });

        // Handle authentication errors
        if (error instanceof AuthenticationError) {
          throw new GeminiServiceError(
            `Authentication failed: ${error.message}`,
            'AUTH_ERROR',
            false,
            error
          );
        }

        // Handle timeout errors
        if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
          console.log(`Request timed out after ${timeout}ms, will retry with longer timeout`);
          
          if (attempt < this.config.maxRetries - 1) {
            // Increase timeout for next attempt
            timeout = Math.min(timeout * 1.5, TIMEOUTS.GEMINI_TEXT_GENERATION * 2);
            await this.delay(1000 * (attempt + 1)); // Progressive delay
            continue;
          }
        }

        // Handle model unavailability errors
        if (errorMessage.includes('was not found') || 
            errorMessage.includes('model not found') || 
            errorMessage.includes('not available') ||
            errorMessage.includes('not have access to it') ||
            errorMessage.includes('region') ||
            error.response?.status === 404) {
          
          console.log('Model unavailable, trying to find alternative...');
          
          try {
            currentModel = await this.findAvailableModel();
            console.log(`Switching to available model: ${currentModel}`);
            continue; // Retry with new model
          } catch (modelError) {
            throw new GeminiServiceError(
              'No Gemini models available in this region',
              'MODEL_UNAVAILABLE',
              false,
              modelError instanceof Error ? modelError : new Error(String(modelError))
            );
          }
        }

        // Handle rate limiting
        if (errorMessage.includes('rate limit') || 
            errorMessage.includes('quota') ||
            error.response?.status === 429) {
          
          if (attempt < this.config.maxRetries - 1) {
            const delay = Math.min(5000 * Math.pow(2, attempt), 30000); // Exponential backoff, max 30s
            console.log(`Rate limited, waiting ${delay}ms before retry...`);
            await this.delay(delay);
            continue;
          }
        }

        // Handle temporary server errors
        if (error.response?.status >= 500 || 
            errorMessage.includes('internal error') ||
            errorMessage.includes('server error')) {
          
          if (attempt < this.config.maxRetries - 1) {
            const delay = 2000 * (attempt + 1); // Progressive delay
            console.log(`Server error, waiting ${delay}ms before retry...`);
            await this.delay(delay);
            continue;
          }
        }

        // For other errors, if we have retries left, wait and try again
        if (attempt < this.config.maxRetries - 1) {
          const delay = 1000 * (attempt + 1);
          console.log(`Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    // All retries exhausted
    const errorMessage = (lastError instanceof Error ? lastError.message : String(lastError)) || 'Unknown error';
    console.error(`All ${this.config.maxRetries} attempts failed. Last error:`, errorMessage);
    
    throw new GeminiServiceError(
      `Failed to generate text after ${this.config.maxRetries} attempts: ${errorMessage}`,
      'MAX_RETRIES_EXCEEDED',
      false,
      lastError instanceof Error ? lastError : new Error(String(lastError))
    );
  }

  /**
   * Get service health status
   */
  public async getHealthStatus(): Promise<{
    healthy: boolean;
    model: string;
    region: string;
    responseTime?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      
      // First try the configured model
      let isAvailable = await this.testModelAvailability(this.config.model);
      let workingModel = this.config.model;
      
      // If primary model fails, try fallback models
      if (!isAvailable) {
        console.log('Primary model unavailable, trying fallback models...');
        try {
          workingModel = await this.findAvailableModel();
          isAvailable = true;
        } catch (error) {
          console.log('No fallback models available');
          isAvailable = false;
        }
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: isAvailable,
        model: workingModel,
        region: this.config.location,
        responseTime
      };
    } catch (error: any) {
      return {
        healthy: false,
        model: this.config.model,
        region: this.config.location,
        error: error.message
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const geminiService = GeminiService.getInstance();

// Export convenience function
export async function generateTextWithGemini(
  prompt: string, 
  options?: {
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  }
): Promise<string> {
  return geminiService.generateText(prompt, options);
}

// Export health check function
export async function checkGeminiHealth() {
  return geminiService.getHealthStatus();
}