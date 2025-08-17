import { NextResponse } from 'next/server'
import { processingMonitor } from '@/lib/processing-monitor'
import { intelligentCache } from '@/lib/intelligent-cache'
import { youtubeCircuitBreaker } from '@/lib/retry-service'

export async function GET() {
  try {
    // Get monitoring metrics
    const metrics = processingMonitor.getMetrics()
    const recentEvents = processingMonitor.getRecentEvents(10)
    const topErrors = processingMonitor.getTopErrors()
    const strategyBreakdown = processingMonitor.getProcessingStrategyBreakdown()
    
    // Get cache statistics
    const cacheStats = intelligentCache.getStats()
    const cacheBreakdown = {
      shorts: intelligentCache.getEntriesByType('shorts'),
      video: intelligentCache.getEntriesByType('video'),
      metadata: intelligentCache.getEntriesByType('metadata'),
      fallback: intelligentCache.getEntriesByType('fallback'),
      error: intelligentCache.getEntriesByType('error')
    }
    
    // Get circuit breaker status
    const circuitBreakerStats = youtubeCircuitBreaker.getStats()
    
    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      processing: {
        metrics,
        successRate: processingMonitor.getSuccessRate(),
        shortsPercentage: processingMonitor.getShortsPercentage(),
        recentEvents,
        topErrors,
        strategyBreakdown
      },
      cache: {
        stats: cacheStats,
        breakdown: cacheBreakdown
      },
      circuitBreaker: circuitBreakerStats,
      health: {
        status: metrics.successfulProcessing > 0 ? 'healthy' : 'degraded',
        issues: []
      }
    }
    
    // Check for health issues
    if (processingMonitor.getSuccessRate() < 80) {
      summary.health.issues.push('Low success rate detected')
    }
    
    if (circuitBreakerStats.state === 'OPEN') {
      summary.health.issues.push('Circuit breaker is OPEN')
      summary.health.status = 'critical'
    }
    
    if (cacheStats.hitRate < 20) {
      summary.health.issues.push('Low cache hit rate')
    }
    
    return NextResponse.json(summary)
    
  } catch (error) {
    console.error('Error generating monitoring report:', error)
    return NextResponse.json(
      { error: 'Failed to generate monitoring report' },
      { status: 500 }
    )
  }
}

// Generate detailed text report
export async function POST(request: Request) {
  try {
    const report = processingMonitor.generateReport()
    
    return new NextResponse(report, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="processing-report-${new Date().toISOString()}.txt"`
      }
    })
    
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}