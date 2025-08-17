import { logger } from '@/lib/logger'

export interface ProcessingMetrics {
  totalRequests: number
  successfulProcessing: number
  failedProcessing: number
  shortsProcessed: number
  averageProcessingTime: number
  errorsByType: Record<string, number>
  processingStrategies: Record<string, number>
  lastUpdated: Date
}

export interface ProcessingEvent {
  id: string
  timestamp: Date
  contentType: 'shorts' | 'video' | 'unknown'
  processingStrategy: string
  duration: number
  success: boolean
  error?: string
  url?: string
  videoId?: string
}

export class ProcessingMonitor {
  private metrics: ProcessingMetrics = {
    totalRequests: 0,
    successfulProcessing: 0,
    failedProcessing: 0,
    shortsProcessed: 0,
    averageProcessingTime: 0,
    errorsByType: {},
    processingStrategies: {},
    lastUpdated: new Date()
  }

  private recentEvents: ProcessingEvent[] = []
  private maxEventHistory = 100

  recordProcessingStart(url: string, contentType: string): string {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.metrics.totalRequests++
    
    if (contentType === 'shorts') {
      this.metrics.shortsProcessed++
    }
    
    this.metrics.lastUpdated = new Date()
    
    return eventId
  }

  recordProcessingComplete(
    eventId: string,
    processingStrategy: string,
    startTime: number,
    success: boolean,
    error?: Error
  ): void {
    const duration = Date.now() - startTime
    
    if (success) {
      this.metrics.successfulProcessing++
    } else {
      this.metrics.failedProcessing++
      
      if (error) {
        const errorKey = `${error.constructor.name}:${error.message.substring(0, 50)}`
        this.metrics.errorsByType[errorKey] = (this.metrics.errorsByType[errorKey] || 0) + 1
      }
    }
    
    // Update average processing time
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalRequests - 1) + duration
    this.metrics.averageProcessingTime = totalTime / this.metrics.totalRequests
    
    // Track processing strategies
    this.metrics.processingStrategies[processingStrategy] = 
      (this.metrics.processingStrategies[processingStrategy] || 0) + 1
    
    this.metrics.lastUpdated = new Date()
    
    // Log significant events
    if (!success || duration > 10000) {
      logger.warn('Processing event completed', {
        eventId,
        duration,
        success,
        strategy: processingStrategy,
        error: error?.message
      })
    }
  }

  addEvent(event: ProcessingEvent): void {
    this.recentEvents.unshift(event)
    
    // Keep only recent events
    if (this.recentEvents.length > this.maxEventHistory) {
      this.recentEvents = this.recentEvents.slice(0, this.maxEventHistory)
    }
  }

  getMetrics(): ProcessingMetrics {
    return { ...this.metrics }
  }

  getRecentEvents(limit: number = 10): ProcessingEvent[] {
    return this.recentEvents.slice(0, limit)
  }

  getSuccessRate(): number {
    if (this.metrics.totalRequests === 0) return 0
    return (this.metrics.successfulProcessing / this.metrics.totalRequests) * 100
  }

  getShortsPercentage(): number {
    if (this.metrics.totalRequests === 0) return 0
    return (this.metrics.shortsProcessed / this.metrics.totalRequests) * 100
  }

  getTopErrors(limit: number = 5): Array<{ error: string; count: number }> {
    return Object.entries(this.metrics.errorsByType)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  getProcessingStrategyBreakdown(): Array<{ strategy: string; count: number; percentage: number }> {
    const total = Object.values(this.metrics.processingStrategies).reduce((sum, count) => sum + count, 0)
    
    return Object.entries(this.metrics.processingStrategies)
      .map(([strategy, count]) => ({
        strategy,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
  }

  generateReport(): string {
    const successRate = this.getSuccessRate()
    const shortsPercentage = this.getShortsPercentage()
    const topErrors = this.getTopErrors()
    const strategyBreakdown = this.getProcessingStrategyBreakdown()
    
    return `
YouTube Processing Monitor Report
================================
Generated: ${new Date().toISOString()}

Overall Metrics:
- Total Requests: ${this.metrics.totalRequests}
- Successful: ${this.metrics.successfulProcessing} (${successRate.toFixed(1)}%)
- Failed: ${this.metrics.failedProcessing}
- Average Processing Time: ${this.metrics.averageProcessingTime.toFixed(0)}ms

Content Type Breakdown:
- Shorts Processed: ${this.metrics.shortsProcessed} (${shortsPercentage.toFixed(1)}%)
- Regular Videos: ${this.metrics.totalRequests - this.metrics.shortsProcessed}

Processing Strategies Used:
${strategyBreakdown.map(s => `- ${s.strategy}: ${s.count} (${s.percentage.toFixed(1)}%)`).join('\n')}

Top Errors:
${topErrors.length > 0 ? topErrors.map(e => `- ${e.error}: ${e.count} occurrences`).join('\n') : '- No errors recorded'}

Last Updated: ${this.metrics.lastUpdated.toISOString()}
    `
  }

  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulProcessing: 0,
      failedProcessing: 0,
      shortsProcessed: 0,
      averageProcessingTime: 0,
      errorsByType: {},
      processingStrategies: {},
      lastUpdated: new Date()
    }
    this.recentEvents = []
    
    logger.info('Processing monitor metrics reset')
  }
}

// Singleton instance
export const processingMonitor = new ProcessingMonitor()

// Export types for use in other modules
export type { ProcessingMetrics, ProcessingEvent }