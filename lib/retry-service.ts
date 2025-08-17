import { logger } from '@/lib/logger'

export interface RetryConfig {
  maxAttempts?: number
  backoffMultiplier?: number
  baseDelay?: number
  maxDelay?: number
  retryableErrors?: string[]
  retryableStatusCodes?: number[]
}

export class RetryService {
  private defaultConfig: Required<RetryConfig> = {
    maxAttempts: 3,
    backoffMultiplier: 1.5,
    baseDelay: 1000,
    maxDelay: 10000,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'],
    retryableStatusCodes: [429, 502, 503, 504]
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorContext: string,
    config?: RetryConfig
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config }
    let lastError: Error

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        logger.info(`Attempting operation: ${errorContext} (attempt ${attempt}/${finalConfig.maxAttempts})`)
        const result = await operation()
        
        if (attempt > 1) {
          logger.info(`Operation succeeded after ${attempt} attempts: ${errorContext}`)
        }
        
        return result
      } catch (error) {
        lastError = error as Error
        
        logger.warn(`Operation failed (attempt ${attempt}/${finalConfig.maxAttempts}): ${errorContext}`, {
          error: lastError.message,
          stack: lastError.stack
        })
        
        if (!this.isRetryableError(lastError, finalConfig) || attempt === finalConfig.maxAttempts) {
          throw this.wrapError(lastError, errorContext, attempt)
        }
        
        const delay = this.calculateDelay(attempt, finalConfig)
        logger.info(`Retrying in ${delay}ms...`)
        await this.delay(delay)
      }
    }

    throw lastError!
  }

  private isRetryableError(error: any, config: Required<RetryConfig>): boolean {
    // Check for retryable error codes
    if (error?.code && config.retryableErrors.includes(error.code)) {
      return true
    }
    
    // Check for retryable HTTP status codes
    if (error?.status && config.retryableStatusCodes.includes(error.status)) {
      return true
    }
    
    // Check for specific error messages
    if (error?.message) {
      const retryableMessages = [
        'rate limit',
        'timeout',
        'network',
        'temporarily unavailable',
        'service unavailable'
      ]
      
      const message = error.message.toLowerCase()
      return retryableMessages.some(msg => message.includes(msg))
    }
    
    return false
  }

  private calculateDelay(attempt: number, config: Required<RetryConfig>): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5) // Add jitter
    return Math.min(jitteredDelay, config.maxDelay)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private wrapError(error: Error, context: string, attempt: number): Error {
    const wrappedError = new Error(
      `Operation failed after ${attempt} attempt(s): ${context}\nOriginal error: ${error.message}`
    )
    wrappedError.stack = error.stack
    ;(wrappedError as any).originalError = error
    ;(wrappedError as any).context = context
    ;(wrappedError as any).attempts = attempt
    return wrappedError
  }
}

// Circuit Breaker implementation
export interface CircuitBreakerConfig {
  failureThreshold?: number
  resetTimeout?: number
  monitoringPeriod?: number
}

export class CircuitBreaker {
  private failures = 0
  private lastFailTime = 0
  private successCount = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  private config: Required<CircuitBreakerConfig> = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 300000 // 5 minutes
  }

  constructor(config?: CircuitBreakerConfig) {
    this.config = { ...this.config, ...config }
  }

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // Check if circuit should be reset
    this.checkAndResetState()

    if (this.state === 'OPEN') {
      logger.warn('Circuit breaker is OPEN, using fallback')
      if (fallback) {
        return fallback()
      }
      throw new Error('Circuit breaker is OPEN - service temporarily unavailable')
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      
      if (this.state === 'OPEN' && fallback) {
        logger.warn('Circuit opened, using fallback')
        return fallback()
      }
      
      throw error
    }
  }

  private checkAndResetState(): void {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailTime
      
      if (timeSinceLastFailure > this.config.resetTimeout) {
        logger.info('Circuit breaker: transitioning from OPEN to HALF_OPEN')
        this.state = 'HALF_OPEN'
        this.failures = 0
      }
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++
      
      // Require multiple successes before fully closing
      if (this.successCount >= 3) {
        logger.info('Circuit breaker: transitioning from HALF_OPEN to CLOSED')
        this.state = 'CLOSED'
        this.failures = 0
        this.successCount = 0
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success
      this.failures = 0
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailTime = Date.now()
    this.successCount = 0

    if (this.failures >= this.config.failureThreshold) {
      logger.error(`Circuit breaker: failure threshold reached (${this.failures}), opening circuit`)
      this.state = 'OPEN'
    }
  }

  getState(): string {
    return this.state
  }

  getStats(): { state: string; failures: number; lastFailTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailTime: this.lastFailTime
    }
  }
}

// Singleton instances for common use cases
export const defaultRetryService = new RetryService()
export const youtubeCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000 // 30 seconds for YouTube API
})