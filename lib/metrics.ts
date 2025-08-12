import cron from 'node-cron';
import type { ServiceMetrics, PerformanceMetrics, CostEntry, AspectRatio } from '@/app/types';

// Metrics collection interfaces
interface MetricPoint {
  timestamp: string;
  value: number;
  labels?: Record<string, string>;
}

interface TimeSeries {
  name: string;
  points: MetricPoint[];
  maxPoints: number;
}

interface ServiceStats {
  requests: TimeSeries;
  errors: TimeSeries;
  responseTime: TimeSeries;
  cost: TimeSeries;
}

// Performance monitoring
export class MetricsCollector {
  private services = new Map<string, ServiceStats>();
  private costEntries: CostEntry[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private aggregatedMetrics = new Map<string, ServiceMetrics>();
  private maxEntries = 10000;
  private maxTimeSeriesPoints = 1000;

  constructor() {
    this.initializeDefaultServices();
    this.startPeriodicAggregation();
  }

  private initializeDefaultServices(): void {
    const services = ['imagen', 'veo', 'gemini', 'tts', 'ffmpeg'];
    services.forEach(service => {
      this.services.set(service, {
        requests: { name: 'requests', points: [], maxPoints: this.maxTimeSeriesPoints },
        errors: { name: 'errors', points: [], maxPoints: this.maxTimeSeriesPoints },
        responseTime: { name: 'response_time', points: [], maxPoints: this.maxTimeSeriesPoints },
        cost: { name: 'cost', points: [], maxPoints: this.maxTimeSeriesPoints },
      });
    });
  }

  // Request tracking
  recordRequest(service: string, success: boolean, responseTime: number, aspectRatio?: AspectRatio, cost: number = 0): void {
    const timestamp = new Date().toISOString();
    const labels = { 
      success: success.toString(),
      ...(aspectRatio && { aspect_ratio: aspectRatio.id })
    };

    // Record request
    this.addMetricPoint(service, 'requests', 1, labels);
    
    // Record error if failed
    if (!success) {
      this.addMetricPoint(service, 'errors', 1, labels);
    }
    
    // Record response time
    this.addMetricPoint(service, 'responseTime', responseTime, labels);
    
    // Record cost
    if (cost > 0) {
      this.addMetricPoint(service, 'cost', cost, labels);
      this.recordCost(service, 'request', cost, aspectRatio?.id);
    }

    // Record performance metric
    this.performanceMetrics.push({
      service,
      operation: 'request',
      duration: responseTime,
      timestamp,
      success,
      aspectRatio: aspectRatio?.id,
    });

    this.cleanupOldEntries();
  }

  // Cost tracking
  recordCost(service: string, operation: string, cost: number, aspectRatio?: string, metadata?: Record<string, any>): void {
    const costEntry: CostEntry = {
      id: `${service}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      service: service as any,
      operation,
      cost,
      aspectRatio,
      metadata,
    };

    this.costEntries.push(costEntry);
    this.cleanupOldEntries();
  }

  // Performance monitoring
  recordPerformance(metric: Omit<PerformanceMetrics, 'timestamp'>): void {
    this.performanceMetrics.push({
      ...metric,
      timestamp: new Date().toISOString(),
    });
    this.cleanupOldEntries();
  }

  // Utility method to add metric points
  private addMetricPoint(service: string, metricType: keyof ServiceStats, value: number, labels?: Record<string, string>): void {
    const serviceStats = this.services.get(service);
    if (!serviceStats) return;

    const timeSeries = serviceStats[metricType];
    const point: MetricPoint = {
      timestamp: new Date().toISOString(),
      value,
      labels,
    };

    timeSeries.points.push(point);
    
    // Keep only recent points
    if (timeSeries.points.length > timeSeries.maxPoints) {
      timeSeries.points.shift();
    }
  }

  // Aggregation methods
  private startPeriodicAggregation(): void {
    // Aggregate metrics every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      this.aggregateMetrics();
    });

    // Cleanup old data every hour
    cron.schedule('0 * * * *', () => {
      this.cleanupOldEntries();
    });
  }

  private aggregateMetrics(): void {
    const now = new Date().toISOString();
    
    for (const [service, stats] of this.services) {
      const requests = this.sumRecentPoints(stats.requests, 300); // Last 5 minutes
      const errors = this.sumRecentPoints(stats.errors, 300);
      const avgResponseTime = this.averageRecentPoints(stats.responseTime, 300);
      const totalCost = this.sumRecentCost(service, 300);
      const aspectRatioBreakdown = this.getAspectRatioBreakdown(service, 300);

      const serviceMetrics: ServiceMetrics = {
        totalRequests: this.sumRecentPoints(stats.requests),
        successfulRequests: requests - errors,
        failedRequests: errors,
        averageResponseTime: avgResponseTime,
        totalCost,
        aspectRatioBreakdown,
        lastUpdated: now,
      };

      this.aggregatedMetrics.set(service, serviceMetrics);
    }
  }

  private sumRecentPoints(timeSeries: TimeSeries, seconds: number = 3600): number {
    const cutoff = new Date(Date.now() - seconds * 1000).toISOString();
    return timeSeries.points
      .filter(point => point.timestamp > cutoff)
      .reduce((sum, point) => sum + point.value, 0);
  }

  private averageRecentPoints(timeSeries: TimeSeries, seconds: number = 3600): number {
    const cutoff = new Date(Date.now() - seconds * 1000).toISOString();
    const recentPoints = timeSeries.points.filter(point => point.timestamp > cutoff);
    
    if (recentPoints.length === 0) return 0;
    
    const sum = recentPoints.reduce((acc, point) => acc + point.value, 0);
    return sum / recentPoints.length;
  }

  private sumRecentCost(service: string, seconds: number = 3600): number {
    const cutoff = new Date(Date.now() - seconds * 1000).toISOString();
    return this.costEntries
      .filter(entry => entry.service === service && entry.timestamp > cutoff)
      .reduce((sum, entry) => sum + entry.cost, 0);
  }

  private getAspectRatioBreakdown(service: string, seconds: number = 3600): Record<string, number> {
    const cutoff = new Date(Date.now() - seconds * 1000).toISOString();
    const breakdown: Record<string, number> = {};
    
    this.costEntries
      .filter(entry => entry.service === service && entry.timestamp > cutoff && entry.aspectRatio)
      .forEach(entry => {
        const ar = entry.aspectRatio!;
        breakdown[ar] = (breakdown[ar] || 0) + entry.cost;
      });

    return breakdown;
  }

  private cleanupOldEntries(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
    
    // Cleanup cost entries
    this.costEntries = this.costEntries
      .filter(entry => entry.timestamp > cutoff)
      .slice(-this.maxEntries);

    // Cleanup performance metrics
    this.performanceMetrics = this.performanceMetrics
      .filter(metric => metric.timestamp > cutoff)
      .slice(-this.maxEntries);
  }

  // Query methods
  getServiceMetrics(service: string): ServiceMetrics | null {
    return this.aggregatedMetrics.get(service) || null;
  }

  getAllServiceMetrics(): Map<string, ServiceMetrics> {
    return new Map(this.aggregatedMetrics);
  }

  getCostHistory(service?: string, aspectRatio?: string, hours: number = 24): CostEntry[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    return this.costEntries.filter(entry => {
      if (entry.timestamp <= cutoff) return false;
      if (service && entry.service !== service) return false;
      if (aspectRatio && entry.aspectRatio !== aspectRatio) return false;
      return true;
    });
  }

  getPerformanceHistory(service?: string, operation?: string, hours: number = 24): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    return this.performanceMetrics.filter(metric => {
      if (metric.timestamp <= cutoff) return false;
      if (service && metric.service !== service) return false;
      if (operation && metric.operation !== operation) return false;
      return true;
    });
  }

  getTotalCost(service?: string, aspectRatio?: string, hours: number = 24): number {
    const costHistory = this.getCostHistory(service, aspectRatio, hours);
    return costHistory.reduce((total, entry) => total + entry.cost, 0);
  }

  // Real-time metrics
  getCurrentMetrics(): {
    activeRequests: number;
    totalCost: number;
    errorRate: number;
    avgResponseTime: number;
    topAspectRatios: Array<{ ratio: string; usage: number }>;
  } {
    const recentMetrics = {
      activeRequests: 0,
      totalCost: 0,
      errorRate: 0,
      avgResponseTime: 0,
      topAspectRatios: [] as Array<{ ratio: string; usage: number }>,
    };

    // Calculate totals across all services
    let totalRequests = 0;
    let totalErrors = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const [service, stats] of this.services) {
      const requests = this.sumRecentPoints(stats.requests, 300); // Last 5 minutes
      const errors = this.sumRecentPoints(stats.errors, 300);
      const responseTime = this.averageRecentPoints(stats.responseTime, 300);
      const cost = this.sumRecentCost(service, 300);

      totalRequests += requests;
      totalErrors += errors;
      totalResponseTime += responseTime;
      responseTimeCount += 1;
      recentMetrics.totalCost += cost;
    }

    recentMetrics.activeRequests = totalRequests;
    recentMetrics.errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    recentMetrics.avgResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

    // Get top aspect ratios by usage
    const aspectRatioUsage = new Map<string, number>();
    const recentCosts = this.getCostHistory(undefined, undefined, 1); // Last hour
    
    recentCosts.forEach(entry => {
      if (entry.aspectRatio) {
        const current = aspectRatioUsage.get(entry.aspectRatio) || 0;
        aspectRatioUsage.set(entry.aspectRatio, current + entry.cost);
      }
    });

    recentMetrics.topAspectRatios = Array.from(aspectRatioUsage.entries())
      .map(([ratio, usage]) => ({ ratio, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);

    return recentMetrics;
  }

  // Health check
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, { status: string; errorRate: number; avgResponseTime: number }>;
    issues: string[];
  } {
    const issues: string[] = [];
    const services: Record<string, { status: string; errorRate: number; avgResponseTime: number }> = {};
    
    let unhealthyServices = 0;
    let degradedServices = 0;

    for (const [serviceName] of this.services) {
      const metrics = this.getServiceMetrics(serviceName);
      
      if (!metrics) {
        services[serviceName] = { status: 'unknown', errorRate: 0, avgResponseTime: 0 };
        continue;
      }

      const errorRate = metrics.totalRequests > 0 ? 
        (metrics.failedRequests / metrics.totalRequests) * 100 : 0;
      const avgResponseTime = metrics.averageResponseTime;

      let status = 'healthy';
      
      // Define health thresholds
      if (errorRate > 10 || avgResponseTime > 10000) {
        status = 'unhealthy';
        unhealthyServices++;
        issues.push(`${serviceName}: High error rate (${errorRate.toFixed(1)}%) or slow response time (${avgResponseTime.toFixed(0)}ms)`);
      } else if (errorRate > 5 || avgResponseTime > 5000) {
        status = 'degraded';
        degradedServices++;
        issues.push(`${serviceName}: Elevated error rate (${errorRate.toFixed(1)}%) or response time (${avgResponseTime.toFixed(0)}ms)`);
      }

      services[serviceName] = { status, errorRate, avgResponseTime };
    }

    // Overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyServices > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices > 0) {
      overallStatus = 'degraded';
    }

    return { status: overallStatus, services, issues };
  }

  // Export data
  exportMetrics(): {
    services: Record<string, ServiceMetrics>;
    costHistory: CostEntry[];
    performanceHistory: PerformanceMetrics[];
    exportTime: string;
  } {
    return {
      services: Object.fromEntries(this.aggregatedMetrics),
      costHistory: [...this.costEntries],
      performanceHistory: [...this.performanceMetrics],
      exportTime: new Date().toISOString(),
    };
  }
}

// Singleton instance
let metricsInstance: MetricsCollector | null = null;

export function getMetricsCollector(): MetricsCollector {
  if (!metricsInstance) {
    metricsInstance = new MetricsCollector();
  }
  return metricsInstance;
}

// Utility functions for easy metrics recording
export function recordImageGeneration(
  success: boolean, 
  responseTime: number, 
  aspectRatio: AspectRatio, 
  cost: number = 0
): void {
  const metrics = getMetricsCollector();
  metrics.recordRequest('imagen', success, responseTime, aspectRatio, cost);
}

export function recordVideoGeneration(
  success: boolean, 
  responseTime: number, 
  aspectRatio: AspectRatio, 
  cost: number = 0
): void {
  const metrics = getMetricsCollector();
  metrics.recordRequest('veo', success, responseTime, aspectRatio, cost);
}

export function recordGeminiRequest(
  success: boolean, 
  responseTime: number, 
  cost: number = 0
): void {
  const metrics = getMetricsCollector();
  metrics.recordRequest('gemini', success, responseTime, undefined, cost);
}

export function recordFFmpegOperation(
  success: boolean, 
  responseTime: number, 
  aspectRatio?: AspectRatio
): void {
  const metrics = getMetricsCollector();
  metrics.recordRequest('ffmpeg', success, responseTime, aspectRatio);
}

// Performance timing decorator
export function withMetrics<T extends (...args: any[]) => Promise<any>>(
  service: string,
  operation: string,
  fn: T,
  aspectRatio?: AspectRatio,
  costCalculator?: (result: any) => number
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    const metrics = getMetricsCollector();
    
    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      const cost = costCalculator ? costCalculator(result) : 0;
      
      metrics.recordRequest(service, true, duration, aspectRatio, cost);
      metrics.recordPerformance({
        service,
        operation,
        duration,
        success: true,
        aspectRatio: aspectRatio?.id,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      metrics.recordRequest(service, false, duration, aspectRatio);
      metrics.recordPerformance({
        service,
        operation,
        duration,
        success: false,
        aspectRatio: aspectRatio?.id,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      
      throw error;
    }
  }) as T;
}