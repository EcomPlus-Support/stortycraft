import { NextRequest } from 'next/server';
import { getMetricsCollector } from '@/lib/metrics';
import { getCacheManager } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { getErrorResponse } from '@/lib/errors';

/**
 * Comprehensive metrics API endpoint
 * 
 * Endpoints:
 * GET /api/metrics - Get current metrics overview
 * GET /api/metrics?type=health - Get service health status
 * GET /api/metrics?type=performance - Get performance metrics
 * GET /api/metrics?type=costs - Get cost breakdown
 * GET /api/metrics?type=cache - Get cache statistics
 * GET /api/metrics?type=aspects - Get aspect ratio usage statistics
 */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'overview';
    const service = url.searchParams.get('service');
    const aspectRatio = url.searchParams.get('aspectRatio');
    const hours = parseInt(url.searchParams.get('hours') || '24');
    
    const metrics = getMetricsCollector();
    const cache = getCacheManager();
    
    logger.info('Metrics API request', {
      operation: 'metrics_api',
      additionalData: { type, service, aspectRatio, hours }
    });

    switch (type) {
      case 'overview':
        return Response.json({
          current: metrics.getCurrentMetrics(),
          health: metrics.getHealthStatus(),
          cache: cache.getStats(),
          timestamp: new Date().toISOString()
        });

      case 'health':
        const healthStatus = metrics.getHealthStatus();
        return Response.json(healthStatus, {
          status: healthStatus.status === 'healthy' ? 200 : 
                 healthStatus.status === 'degraded' ? 206 : 503
        });

      case 'performance':
        const performanceData = {
          services: Object.fromEntries(metrics.getAllServiceMetrics()),
          history: metrics.getPerformanceHistory(service, undefined, hours),
          current: metrics.getCurrentMetrics()
        };
        
        if (aspectRatio) {
          performanceData.history = performanceData.history.filter(
            h => h.aspectRatio === aspectRatio
          );
        }
        
        return Response.json(performanceData);

      case 'costs':
        const costHistory = metrics.getCostHistory(service as any, aspectRatio, hours);
        const totalCost = metrics.getTotalCost(service as any, aspectRatio, hours);
        
        // Group by service and aspect ratio
        const costBreakdown = costHistory.reduce((breakdown, entry) => {
          const key = `${entry.service}:${entry.aspectRatio || 'default'}`;
          if (!breakdown[key]) {
            breakdown[key] = {
              service: entry.service,
              aspectRatio: entry.aspectRatio,
              totalCost: 0,
              requestCount: 0
            };
          }
          breakdown[key].totalCost += entry.cost;
          breakdown[key].requestCount += 1;
          return breakdown;
        }, {} as Record<string, any>);

        return Response.json({
          totalCost,
          costHistory,
          breakdown: Object.values(costBreakdown),
          period: `${hours} hours`,
          currency: 'USD'
        });

      case 'cache':
        const cacheStats = cache.getStats();
        return Response.json({
          ...cacheStats,
          efficiency: {
            hitRate: cacheStats.hitRate,
            missRate: 100 - cacheStats.hitRate,
            averageResponseTime: cacheStats.averageResponseTime,
            memoryUtilization: (cacheStats.memoryUsage / (1024 * 1024)).toFixed(2) + ' MB'
          }
        });

      case 'aspects':
        // Get aspect ratio usage statistics
        const allServiceMetrics = metrics.getAllServiceMetrics();
        const aspectRatioStats = new Map<string, {
          totalCost: number;
          requestCount: number;
          services: Set<string>;
        }>();

        // Aggregate data from all services
        for (const [serviceName, serviceMetrics] of allServiceMetrics) {
          for (const [ratio, cost] of Object.entries(serviceMetrics.aspectRatioBreakdown)) {
            if (!aspectRatioStats.has(ratio)) {
              aspectRatioStats.set(ratio, {
                totalCost: 0,
                requestCount: 0,
                services: new Set()
              });
            }
            const stats = aspectRatioStats.get(ratio)!;
            stats.totalCost += cost;
            stats.services.add(serviceName);
          }
        }

        const aspectRatioSummary = Array.from(aspectRatioStats.entries()).map(([ratio, stats]) => ({
          aspectRatio: ratio,
          totalCost: stats.totalCost,
          requestCount: stats.requestCount,
          services: Array.from(stats.services),
          costPercentage: aspectRatioStats.size > 0 ? 
            (stats.totalCost / Array.from(aspectRatioStats.values()).reduce((sum, s) => sum + s.totalCost, 0)) * 100 : 0
        })).sort((a, b) => b.totalCost - a.totalCost);

        return Response.json({
          summary: aspectRatioSummary,
          topRatios: aspectRatioSummary.slice(0, 5),
          totalRatiosUsed: aspectRatioStats.size,
          period: `${hours} hours`
        });

      case 'export':
        // Export all metrics data
        const exportData = {
          ...metrics.exportMetrics(),
          cache: cache.getStats(),
          exportedAt: new Date().toISOString(),
          period: `${hours} hours`
        };
        
        return new Response(JSON.stringify(exportData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="storycraft-metrics-${Date.now()}.json"`
          }
        });

      case 'realtime':
        // Stream real-time metrics (SSE)
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          start(controller) {
            const interval = setInterval(() => {
              const currentMetrics = metrics.getCurrentMetrics();
              const data = `data: ${JSON.stringify({
                timestamp: new Date().toISOString(),
                metrics: currentMetrics,
                health: metrics.getHealthStatus(),
                cache: cache.getStats()
              })}\n\n`;
              
              controller.enqueue(encoder.encode(data));
            }, 5000); // Update every 5 seconds

            // Clean up after 5 minutes
            setTimeout(() => {
              clearInterval(interval);
              controller.close();
            }, 300000);
          }
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          }
        });

      default:
        return Response.json({ 
          error: 'Invalid type parameter',
          available: ['overview', 'health', 'performance', 'costs', 'cache', 'aspects', 'export', 'realtime']
        }, { status: 400 });
    }

  } catch (error) {
    logger.error('Error in metrics API', error);
    return Response.json(getErrorResponse(error instanceof Error ? error : new Error(String(error))), {
      status: 500
    });
  }
}

/**
 * POST endpoint for custom metric queries
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { 
      services = [], 
      aspectRatios = [], 
      operations = [], 
      timeRange = { hours: 24 },
      groupBy = 'service',
      aggregation = 'sum'
    } = await req.json();

    const metrics = getMetricsCollector();
    
    logger.info('Custom metrics query', {
      operation: 'metrics_custom_query',
      additionalData: { services, aspectRatios, operations, timeRange, groupBy, aggregation }
    });

    const performanceHistory = metrics.getPerformanceHistory(
      services.length === 1 ? services[0] : undefined,
      operations.length === 1 ? operations[0] : undefined,
      timeRange.hours
    );

    // Filter by criteria
    let filteredHistory = performanceHistory;
    
    if (services.length > 0) {
      filteredHistory = filteredHistory.filter(h => services.includes(h.service));
    }
    
    if (aspectRatios.length > 0) {
      filteredHistory = filteredHistory.filter(h => h.aspectRatio && aspectRatios.includes(h.aspectRatio));
    }
    
    if (operations.length > 0) {
      filteredHistory = filteredHistory.filter(h => operations.includes(h.operation));
    }

    // Group and aggregate data
    const grouped = filteredHistory.reduce((groups, entry) => {
      let key: string;
      switch (groupBy) {
        case 'service':
          key = entry.service;
          break;
        case 'aspectRatio':
          key = entry.aspectRatio || 'unknown';
          break;
        case 'operation':
          key = entry.operation;
          break;
        case 'hour':
          key = new Date(entry.timestamp).toISOString().substring(0, 13);
          break;
        default:
          key = 'all';
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          entries: [],
          totalDuration: 0,
          avgDuration: 0,
          successCount: 0,
          failureCount: 0,
          successRate: 0
        };
      }

      groups[key].entries.push(entry);
      groups[key].totalDuration += entry.duration;
      if (entry.success) {
        groups[key].successCount++;
      } else {
        groups[key].failureCount++;
      }

      return groups;
    }, {} as Record<string, any>);

    // Calculate aggregations
    Object.values(grouped).forEach((group: any) => {
      const entryCount = group.entries.length;
      group.avgDuration = entryCount > 0 ? group.totalDuration / entryCount : 0;
      group.successRate = entryCount > 0 ? (group.successCount / entryCount) * 100 : 0;
      
      if (aggregation === 'avg') {
        group.value = group.avgDuration;
      } else if (aggregation === 'count') {
        group.value = entryCount;
      } else {
        group.value = group.totalDuration;
      }
    });

    const result = {
      query: { services, aspectRatios, operations, timeRange, groupBy, aggregation },
      results: Object.values(grouped),
      summary: {
        totalEntries: filteredHistory.length,
        groups: Object.keys(grouped).length,
        timeRange: `${timeRange.hours} hours`
      }
    };

    return Response.json(result);

  } catch (error) {
    logger.error('Error in custom metrics query', error);
    return Response.json(getErrorResponse(error instanceof Error ? error : new Error(String(error))), {
      status: 500
    });
  }
}

/**
 * DELETE endpoint for clearing metrics data
 */
export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    
    logger.info('Metrics data deletion request', {
      operation: 'metrics_delete',
      additionalData: { type }
    });

    switch (type) {
      case 'cache':
        const cache = getCacheManager();
        await cache.clear();
        return Response.json({ message: 'Cache cleared successfully' });

      case 'all':
        // This would require implementing a reset method in MetricsCollector
        return Response.json({ message: 'Full metrics reset not implemented for safety' }, { status: 501 });

      default:
        return Response.json({ 
          error: 'Invalid or missing type parameter',
          available: ['cache']
        }, { status: 400 });
    }

  } catch (error) {
    logger.error('Error in metrics deletion', error);
    return Response.json(getErrorResponse(error instanceof Error ? error : new Error(String(error))), {
      status: 500
    });
  }
}