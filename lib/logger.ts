/**
 * Enhanced logging utility for better error tracking and debugging
 */

import type { AspectRatio, PerformanceMetrics } from '@/app/types';

export interface LogContext {
  userId?: string
  operation?: string
  timestamp?: Date
  aspectRatio?: AspectRatio | string
  service?: string
  cost?: number
  requestId?: string
  sessionId?: string
  additionalData?: Record<string, any>
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  error(message: string, error: unknown, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logData = {
      level: 'ERROR',
      timestamp,
      message,
      error: this.serializeError(error),
      context
    }

    if (this.isDevelopment) {
      console.error('🔴 ERROR:', message, error, context)
    } else {
      console.error(JSON.stringify(logData))
    }
  }

  warn(message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logData = {
      level: 'WARN',
      timestamp,
      message,
      context
    }

    if (this.isDevelopment) {
      console.warn('🟡 WARN:', message, context)
    } else {
      console.warn(JSON.stringify(logData))
    }
  }

  info(message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logData = {
      level: 'INFO',
      timestamp,
      message,
      context
    }

    if (this.isDevelopment) {
      console.log('🔵 INFO:', message, context)
    } else {
      console.log(JSON.stringify(logData))
    }
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.debug('🟢 DEBUG:', message, context)
    }
  }

  private serializeError(error: unknown): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }
    return error
  }

  /**
   * Track user actions and errors for analytics
   */
  trackUserAction(action: string, success: boolean, context?: LogContext) {
    this.info(`User action: ${action}`, {
      ...context,
      additionalData: {
        ...context?.additionalData,
        success,
        action
      }
    })
  }

  /**
   * Track API performance and errors
   */
  trackApiCall(endpoint: string, duration: number, success: boolean, error?: unknown, aspectRatio?: AspectRatio, cost?: number) {
    const context: LogContext = {
      aspectRatio: aspectRatio?.id,
      cost,
      additionalData: {
        endpoint,
        duration,
        success,
        aspectRatio: aspectRatio?.label
      }
    }

    if (success) {
      this.info(`API call successful: ${endpoint} (${duration}ms)`, context)
    } else {
      this.error(`API call failed: ${endpoint} (${duration}ms)`, error, context)
    }
  }

  /**
   * Track aspect ratio specific operations
   */
  trackAspectRatioOperation(operation: string, aspectRatio: AspectRatio, success: boolean, duration?: number, cost?: number, error?: unknown) {
    const context: LogContext = {
      operation,
      aspectRatio: aspectRatio.id,
      cost,
      additionalData: {
        aspectRatioLabel: aspectRatio.label,
        aspectRatioRatio: aspectRatio.ratio,
        duration,
        success
      }
    }

    if (success) {
      this.info(`${operation} successful for aspect ratio ${aspectRatio.id}`, context)
    } else {
      this.error(`${operation} failed for aspect ratio ${aspectRatio.id}`, error, context)
    }
  }

  /**
   * Track service-specific operations
   */
  trackServiceOperation(service: string, operation: string, success: boolean, duration: number, aspectRatio?: AspectRatio, cost?: number, error?: unknown) {
    const context: LogContext = {
      service,
      operation,
      aspectRatio: aspectRatio?.id,
      cost,
      additionalData: {
        duration,
        success,
        aspectRatioLabel: aspectRatio?.label
      }
    }

    if (success) {
      this.info(`${service} ${operation} successful (${duration}ms)`, context)
    } else {
      this.error(`${service} ${operation} failed (${duration}ms)`, error, context)
    }
  }

  /**
   * Track video processing operations
   */
  trackVideoProcessing(stage: string, success: boolean, duration: number, aspectRatio?: AspectRatio, inputSize?: number, outputSize?: number, error?: unknown) {
    const context: LogContext = {
      operation: `video_processing_${stage}`,
      aspectRatio: aspectRatio?.id,
      additionalData: {
        stage,
        duration,
        success,
        aspectRatioLabel: aspectRatio?.label,
        inputSize,
        outputSize,
        compressionRatio: inputSize && outputSize ? inputSize / outputSize : undefined
      }
    }

    if (success) {
      this.info(`Video processing ${stage} completed (${duration}ms)`, context)
    } else {
      this.error(`Video processing ${stage} failed (${duration}ms)`, error, context)
    }
  }

  /**
   * Track cache operations
   */
  trackCacheOperation(operation: string, key: string, hit: boolean, aspectRatio?: string, duration?: number) {
    const context: LogContext = {
      operation: `cache_${operation}`,
      aspectRatio,
      additionalData: {
        key,
        hit,
        duration,
        cacheType: hit ? 'hit' : 'miss'
      }
    }

    this.info(`Cache ${operation}: ${hit ? 'HIT' : 'MISS'} for key ${key}`, context)
  }

  /**
   * Track cost and billing events
   */
  trackCost(service: string, operation: string, cost: number, aspectRatio?: AspectRatio, metadata?: Record<string, any>) {
    const context: LogContext = {
      service,
      operation,
      cost,
      aspectRatio: aspectRatio?.id,
      additionalData: {
        aspectRatioLabel: aspectRatio?.label,
        costPerOperation: cost,
        ...metadata
      }
    }

    this.info(`Cost incurred: $${cost.toFixed(4)} for ${service} ${operation}`, context)
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: PerformanceMetrics) {
    const context: LogContext = {
      service: metric.service,
      operation: metric.operation,
      aspectRatio: metric.aspectRatio,
      additionalData: {
        duration: metric.duration,
        success: metric.success,
        timestamp: metric.timestamp,
        ...metric.metadata
      }
    }

    const message = `Performance: ${metric.service}.${metric.operation} ${metric.success ? 'succeeded' : 'failed'} in ${metric.duration}ms`;
    
    if (metric.success) {
      this.info(message, context)
    } else {
      this.warn(message, context)
    }
  }

  /**
   * Create a child logger with preset context
   */
  createChildLogger(baseContext: Partial<LogContext>): Logger {
    const childLogger = Object.create(this);
    const originalMethods = {
      error: this.error.bind(this),
      warn: this.warn.bind(this),
      info: this.info.bind(this),
      debug: this.debug.bind(this)
    };

    ['error', 'warn', 'info', 'debug'].forEach(method => {
      childLogger[method] = (message: string, contextOrError?: any, context?: LogContext) => {
        const mergedContext = {
          ...baseContext,
          ...(method === 'error' ? context : contextOrError)
        };
        
        if (method === 'error') {
          originalMethods[method](message, contextOrError, mergedContext);
        } else {
          originalMethods[method](message, mergedContext);
        }
      };
    });

    return childLogger;
  }
}

export const logger = new Logger()

// Aspect ratio specific loggers
export const aspectRatioLogger = {
  validation: (aspectRatio: string, success: boolean, error?: Error) => {
    logger.trackAspectRatioOperation(
      'validation', 
      { id: aspectRatio } as AspectRatio, 
      success, 
      undefined, 
      undefined, 
      error
    );
  },
  
  conversion: (fromRatio: AspectRatio, toRatio: AspectRatio, success: boolean, duration: number, error?: Error) => {
    logger.info(`Aspect ratio conversion: ${fromRatio.id} → ${toRatio.id} ${success ? 'succeeded' : 'failed'}`, {
      operation: 'aspect_ratio_conversion',
      aspectRatio: toRatio.id,
      additionalData: {
        fromRatio: fromRatio.id,
        toRatio: toRatio.id,
        duration,
        success
      }
    });
  }
};

/**
 * Higher-order function to wrap async functions with error logging
 */
export function withErrorLogging<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string,
  service?: string,
  aspectRatio?: AspectRatio
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    try {
      const result = await fn(...args)
      const duration = Date.now() - startTime
      
      if (service) {
        logger.trackServiceOperation(service, operation, true, duration, aspectRatio)
      } else {
        logger.trackApiCall(operation, duration, true, undefined, aspectRatio)
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      if (service) {
        logger.trackServiceOperation(service, operation, false, duration, aspectRatio, undefined, error)
      } else {
        logger.trackApiCall(operation, duration, false, error, aspectRatio)
      }
      
      throw error
    }
  }
}

/**
 * Higher-order function to wrap functions with aspect ratio specific logging
 */
export function withAspectRatioLogging<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string,
  aspectRatio: AspectRatio,
  costCalculator?: (result: R) => number
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    try {
      const result = await fn(...args)
      const duration = Date.now() - startTime
      const cost = costCalculator ? costCalculator(result) : undefined
      
      logger.trackAspectRatioOperation(operation, aspectRatio, true, duration, cost)
      
      if (cost) {
        logger.trackCost('unknown', operation, cost, aspectRatio)
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.trackAspectRatioOperation(operation, aspectRatio, false, duration, undefined, error)
      throw error
    }
  }
}

/**
 * Create request-scoped logger with tracking ID
 */
export function createRequestLogger(requestId: string, sessionId?: string, aspectRatio?: AspectRatio): Logger {
  return logger.createChildLogger({
    requestId,
    sessionId,
    aspectRatio: aspectRatio?.id
  });
}

/**
 * Utility functions for common logging scenarios
 */
export const logUtils = {
  aspectRatioValidation: (aspectRatio: string, isValid: boolean, error?: Error) => {
    const operation = 'aspect_ratio_validation';
    if (isValid) {
      logger.info(`Aspect ratio validation passed: ${aspectRatio}`, { operation, aspectRatio });
    } else {
      logger.error(`Aspect ratio validation failed: ${aspectRatio}`, error, { operation, aspectRatio });
    }
  },

  serviceHealth: (service: string, healthy: boolean, responseTime?: number, error?: Error) => {
    const context: LogContext = {
      service,
      operation: 'health_check',
      additionalData: { healthy, responseTime }
    };

    if (healthy) {
      logger.info(`Service ${service} health check passed`, context);
    } else {
      logger.error(`Service ${service} health check failed`, error, context);
    }
  },

  cacheWarm: (keys: string[], aspectRatio?: string) => {
    logger.info(`Cache warming initiated for ${keys.length} keys`, {
      operation: 'cache_warm',
      aspectRatio,
      additionalData: { keyCount: keys.length }
    });
  },

  configChange: (setting: string, oldValue: any, newValue: any) => {
    logger.info(`Configuration changed: ${setting}`, {
      operation: 'config_change',
      additionalData: { setting, oldValue, newValue }
    });
  }
};