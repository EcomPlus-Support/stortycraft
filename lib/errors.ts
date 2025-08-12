import type { AspectRatio, AspectRatioError, ValidationError } from '@/app/types';

// Base error classes
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  abstract readonly isOperational: boolean;

  constructor(message: string, public readonly metadata?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      metadata: this.metadata,
    };
  }
}

// Aspect Ratio Errors
export class AspectRatioValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'ASPECT_RATIO_VALIDATION_ERROR';
  readonly isOperational = true;

  constructor(message: string, public readonly aspectRatio?: string, metadata?: Record<string, any>) {
    super(message, metadata);
  }
}

export class UnsupportedAspectRatioError extends AppError {
  readonly statusCode = 400;
  readonly code = 'UNSUPPORTED_ASPECT_RATIO';
  readonly isOperational = true;

  constructor(
    aspectRatio: string,
    service: 'imagen' | 'veo' | 'ffmpeg',
    supportedRatios: string[],
    metadata?: Record<string, any>
  ) {
    const message = `Aspect ratio ${aspectRatio} is not supported by ${service}. Supported ratios: ${supportedRatios.join(', ')}`;
    super(message, { aspectRatio, service, supportedRatios, ...metadata });
  }
}

export class AspectRatioMismatchError extends AppError {
  readonly statusCode = 400;
  readonly code = 'ASPECT_RATIO_MISMATCH';
  readonly isOperational = true;

  constructor(expected: string, actual: string, context?: string, metadata?: Record<string, any>) {
    const message = `Aspect ratio mismatch${context ? ` in ${context}` : ''}: expected ${expected}, got ${actual}`;
    super(message, { expected, actual, context, ...metadata });
  }
}

// Validation Errors
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';
  readonly isOperational = true;

  constructor(
    public readonly errors: Array<{ field: string; message: string; value?: any }>,
    metadata?: Record<string, any>
  ) {
    const message = `Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`;
    super(message, { errors, ...metadata });
  }
}

// Service Errors
export class ImagenError extends AppError {
  readonly statusCode = 502;
  readonly code = 'IMAGEN_ERROR';
  readonly isOperational = true;

  constructor(message: string, public readonly originalError?: Error, metadata?: Record<string, any>) {
    super(`Imagen API error: ${message}`, { originalError: originalError?.message, ...metadata });
  }
}

export class VeoError extends AppError {
  readonly statusCode = 502;
  readonly code = 'VEO_ERROR';
  readonly isOperational = true;

  constructor(message: string, public readonly originalError?: Error, metadata?: Record<string, any>) {
    super(`Veo API error: ${message}`, { originalError: originalError?.message, ...metadata });
  }
}

export class GeminiError extends AppError {
  readonly statusCode = 502;
  readonly code = 'GEMINI_ERROR';
  readonly isOperational = true;

  constructor(message: string, public readonly originalError?: Error, metadata?: Record<string, any>) {
    super(`Gemini API error: ${message}`, { originalError: originalError?.message, ...metadata });
  }
}

// Processing Errors
export class VideoProcessingError extends AppError {
  readonly statusCode = 500;
  readonly code = 'VIDEO_PROCESSING_ERROR';
  readonly isOperational = true;

  constructor(message: string, public readonly stage?: string, metadata?: Record<string, any>) {
    super(`Video processing failed${stage ? ` at ${stage}` : ''}: ${message}`, { stage, ...metadata });
  }
}

export class FFmpegError extends AppError {
  readonly statusCode = 500;
  readonly code = 'FFMPEG_ERROR';
  readonly isOperational = true;

  constructor(message: string, public readonly command?: string, metadata?: Record<string, any>) {
    super(`FFmpeg error: ${message}`, { command, ...metadata });
  }
}

// Resource Errors
export class ResourceNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly isOperational = true;

  constructor(resource: string, identifier?: string, metadata?: Record<string, any>) {
    const message = `${resource} not found${identifier ? `: ${identifier}` : ''}`;
    super(message, { resource, identifier, ...metadata });
  }
}

export class StorageError extends AppError {
  readonly statusCode = 500;
  readonly code = 'STORAGE_ERROR';
  readonly isOperational = true;

  constructor(message: string, public readonly operation?: string, metadata?: Record<string, any>) {
    super(`Storage error${operation ? ` during ${operation}` : ''}: ${message}`, { operation, ...metadata });
  }
}

// Rate Limiting & Cost Errors
export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly isOperational = true;

  constructor(service: string, public readonly retryAfter?: number, metadata?: Record<string, any>) {
    super(`Rate limit exceeded for ${service}`, { service, retryAfter, ...metadata });
  }
}

export class CostLimitExceededError extends AppError {
  readonly statusCode = 402;
  readonly code = 'COST_LIMIT_EXCEEDED';
  readonly isOperational = true;

  constructor(estimatedCost: number, maxCost: number, metadata?: Record<string, any>) {
    super(`Estimated cost $${estimatedCost.toFixed(2)} exceeds maximum allowed cost of $${maxCost.toFixed(2)}`, 
      { estimatedCost, maxCost, ...metadata });
  }
}

// Cache Errors
export class CacheError extends AppError {
  readonly statusCode = 500;
  readonly code = 'CACHE_ERROR';
  readonly isOperational = true;

  constructor(message: string, public readonly operation?: string, metadata?: Record<string, any>) {
    super(`Cache error${operation ? ` during ${operation}` : ''}: ${message}`, { operation, ...metadata });
  }
}

// Authentication & Authorization Errors
export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly code = 'AUTHENTICATION_ERROR';
  readonly isOperational = true;

  constructor(message: string = 'Authentication required', metadata?: Record<string, any>) {
    super(message, metadata);
  }
}

export class AuthorizationError extends AppError {
  readonly statusCode = 403;
  readonly code = 'AUTHORIZATION_ERROR';
  readonly isOperational = true;

  constructor(message: string = 'Insufficient permissions', metadata?: Record<string, any>) {
    super(message, metadata);
  }
}

// Timeout Errors
export class TimeoutError extends AppError {
  readonly statusCode = 408;
  readonly code = 'TIMEOUT_ERROR';
  readonly isOperational = true;

  constructor(operation: string, timeout: number, metadata?: Record<string, any>) {
    super(`Operation ${operation} timed out after ${timeout}ms`, { operation, timeout, ...metadata });
  }
}

// Generic Service Error
export class ServiceUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly isOperational = true;

  constructor(service: string, metadata?: Record<string, any>) {
    super(`Service ${service} is currently unavailable`, { service, ...metadata });
  }
}

// Error Factory Functions
export function createAspectRatioError(
  type: 'validation' | 'unsupported' | 'mismatch',
  details: {
    aspectRatio?: string;
    service?: 'imagen' | 'veo' | 'ffmpeg';
    supportedRatios?: string[];
    expected?: string;
    actual?: string;
    context?: string;
    message?: string;
  }
): AspectRatioValidationError | UnsupportedAspectRatioError | AspectRatioMismatchError {
  switch (type) {
    case 'validation':
      return new AspectRatioValidationError(
        details.message || 'Invalid aspect ratio format',
        details.aspectRatio
      );
    case 'unsupported':
      return new UnsupportedAspectRatioError(
        details.aspectRatio!,
        details.service!,
        details.supportedRatios || []
      );
    case 'mismatch':
      return new AspectRatioMismatchError(
        details.expected!,
        details.actual!,
        details.context
      );
    default:
      throw new Error('Invalid aspect ratio error type');
  }
}

// Error Handling Utilities
export function isOperationalError(error: Error): boolean {
  return error instanceof AppError && error.isOperational;
}

export function getErrorResponse(error: Error) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        metadata: error.metadata,
      },
    };
  }
  
  // Handle unknown errors
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    },
  };
}

export function logError(error: Error, context?: Record<string, any>) {
  const errorDetails = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error instanceof AppError && {
      code: error.code,
      statusCode: error.statusCode,
      metadata: error.metadata,
      isOperational: error.isOperational,
    }),
    ...context,
  };
  
  console.error('[ERROR]', JSON.stringify(errorDetails, null, 2));
}

// Error Recovery Utilities
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries || !isRetryableError(lastError)) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(backoffMultiplier, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

function isRetryableError(error: Error): boolean {
  if (error instanceof AppError) {
    // Retry on server errors and rate limits, but not on validation errors
    return error.statusCode >= 500 || error.code === 'RATE_LIMIT_EXCEEDED';
  }
  return true; // Retry unknown errors
}

// Circuit Breaker Pattern
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new ServiceUnavailableError('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}