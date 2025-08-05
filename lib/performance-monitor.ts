/**
 * Performance Monitoring and Error Tracking for StoryCraft Backend
 * 
 * This module provides performance monitoring, error tracking, and metrics
 * collection for the backend API operations.
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  timestamp: Date;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private maxMetricsHistory = 1000;

  /**
   * Track the performance of an async operation
   */
  async trackOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      const result = await operation();
      success = true;
      return result;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      this.recordMetric({
        operation: operationName,
        duration,
        timestamp: new Date(),
        success,
        error,
        metadata
      });

      // Log performance warnings
      if (duration > 30000) { // 30 seconds
        console.warn(`⚠️  Slow operation detected: ${operationName} took ${duration}ms`);
      }
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getOperationStats(operationName: string): {
    totalCalls: number;
    successRate: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    recentErrors: string[];
  } {
    const operationMetrics = this.metrics.filter(m => m.operation === operationName);
    
    if (operationMetrics.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        recentErrors: []
      };
    }

    const successfulCalls = operationMetrics.filter(m => m.success).length;
    const durations = operationMetrics.map(m => m.duration);
    const recentErrors = operationMetrics
      .filter(m => !m.success && m.error)
      .slice(-5)
      .map(m => m.error!);

    return {
      totalCalls: operationMetrics.length,
      successRate: (successfulCalls / operationMetrics.length) * 100,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      recentErrors
    };
  }

  /**
   * Perform health check on external services
   */
  async checkServiceHealth(serviceName: string, checkFunction: () => Promise<boolean>): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await checkFunction();
      const responseTime = Date.now() - startTime;
      
      const healthCheck: HealthCheck = {
        service: serviceName,
        status: isHealthy ? 'healthy' : 'degraded',
        responseTime,
        timestamp: new Date()
      };
      
      this.healthChecks.set(serviceName, healthCheck);
      return healthCheck;
      
    } catch (error) {
      const healthCheck: HealthCheck = {
        service: serviceName,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      
      this.healthChecks.set(serviceName, healthCheck);
      return healthCheck;
    }
  }

  /**
   * Get overall system health status
   */
  getSystemHealth(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: HealthCheck[];
    metrics: {
      totalOperations: number;
      averageResponseTime: number;
      errorRate: number;
    };
  } {
    const services = Array.from(this.healthChecks.values());
    const recentMetrics = this.metrics.slice(-100); // Last 100 operations
    
    // Determine overall health
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (services.some(s => s.status === 'unhealthy')) {
      overall = 'unhealthy';
    } else if (services.some(s => s.status === 'degraded')) {
      overall = 'degraded';
    }
    
    // Calculate metrics
    const totalOperations = recentMetrics.length;
    const averageResponseTime = totalOperations > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations 
      : 0;
    const errorRate = totalOperations > 0 
      ? (recentMetrics.filter(m => !m.success).length / totalOperations) * 100 
      : 0;

    return {
      overall,
      services,
      metrics: {
        totalOperations,
        averageResponseTime,
        errorRate
      }
    };
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary(): void {
    const health = this.getSystemHealth();
    
    console.log('📊 Performance Summary:');
    console.log(`   Overall Health: ${health.overall}`);
    console.log(`   Total Operations: ${health.metrics.totalOperations}`);
    console.log(`   Average Response Time: ${health.metrics.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Error Rate: ${health.metrics.errorRate.toFixed(2)}%`);
    
    if (health.services.length > 0) {
      console.log('   Service Health:');
      health.services.forEach(service => {
        console.log(`     ${service.service}: ${service.status} ${service.responseTime ? `(${service.responseTime}ms)` : ''}`);
      });
    }
  }

  /**
   * Clear old metrics and health checks
   */
  cleanup(): void {
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    // Remove old metrics
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    
    // Remove old health checks
    for (const [service, check] of this.healthChecks) {
      if (check.timestamp < oneHourAgo) {
        this.healthChecks.delete(service);
      }
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator function to track method performance
 */
export function trackPerformance(operationName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.trackOperation(
        operationName,
        () => originalMethod.apply(this, args)
      );
    };
    
    return descriptor;
  };
}

/**
 * Health check functions for external services
 */
export const healthChecks = {
  async youtube(): Promise<boolean> {
    try {
      const response = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=invalid', {
        method: 'HEAD'
      });
      // YouTube API returns 400 for invalid key, which means the service is up
      return response.status === 400 || response.status === 200;
    } catch {
      return false;
    }
  },

  async gemini(): Promise<boolean> {
    try {
      // This would check Vertex AI endpoint availability
      // For now, we'll assume it's healthy if we can create the client
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Utility function to measure execution time
 */
export function measureTime<T>(fn: () => T): { result: T; duration: number } {
  const start = Date.now();
  const result = fn();
  const duration = Date.now() - start;
  
  return { result, duration };
}

/**
 * Utility function to measure async execution time
 */
export async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  
  return { result, duration };
}

// Auto-cleanup every hour
setInterval(() => {
  performanceMonitor.cleanup();
}, 3600000);

// Log performance summary every 10 minutes in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    performanceMonitor.logPerformanceSummary();
  }, 600000);
}