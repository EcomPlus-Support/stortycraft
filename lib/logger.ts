/**
 * Enhanced logging utility for better error tracking and debugging
 */

export interface LogContext {
  userId?: string
  operation?: string
  timestamp?: Date
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
  trackApiCall(endpoint: string, duration: number, success: boolean, error?: unknown) {
    const context: LogContext = {
      additionalData: {
        endpoint,
        duration,
        success
      }
    }

    if (success) {
      this.info(`API call successful: ${endpoint} (${duration}ms)`, context)
    } else {
      this.error(`API call failed: ${endpoint} (${duration}ms)`, error, context)
    }
  }
}

export const logger = new Logger()

/**
 * Higher-order function to wrap async functions with error logging
 */
export function withErrorLogging<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    try {
      const result = await fn(...args)
      const duration = Date.now() - startTime
      logger.trackApiCall(operation, duration, true)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.trackApiCall(operation, duration, false, error)
      throw error
    }
  }
}