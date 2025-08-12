/**
 * Health Check API Endpoint
 * 
 * Provides system health status, performance metrics, and service availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor, healthChecks } from '@/lib/performance-monitor';
import { getVertexAIConfig } from '@/lib/config';

// Force dynamic rendering to prevent build-time external calls
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Skip external calls during build time
    if (process.env.BUILD_TIME === 'true' || process.env.DISABLE_EXTERNAL_CALLS === 'true') {
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        buildTime: true
      });
    }

    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    // Basic health check
    const basicHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    if (!detailed) {
      return NextResponse.json(basicHealth);
    }

    // Detailed health check
    console.log('Performing detailed health check...');

    // Check external services
    const [youtubeHealth, geminiHealth] = await Promise.allSettled([
      performanceMonitor.checkServiceHealth('youtube', healthChecks.youtube),
      performanceMonitor.checkServiceHealth('gemini', healthChecks.gemini)
    ]);

    // Get system performance metrics
    const systemHealth = performanceMonitor.getSystemHealth();

    // Check configuration
    const config = getVertexAIConfig();
    const configHealth = {
      vertexAI: {
        projectId: !!config.projectId,
        location: !!config.location,
        model: !!config.model
      },
      youtube: {
        apiKey: !!config.youtubeApiKey
      }
    };

    // Get operation-specific stats
    const operationStats = {
      youtubeMetadata: performanceMonitor.getOperationStats('youtube_metadata_extraction'),
      contentProcessing: performanceMonitor.getOperationStats('reference_content_processing')
    };

    const detailedHealth = {
      ...basicHealth,
      system: {
        overall: systemHealth.overall,
        services: systemHealth.services,
        metrics: systemHealth.metrics
      },
      configuration: configHealth,
      operations: operationStats,
      external_services: {
        youtube: youtubeHealth.status === 'fulfilled' ? youtubeHealth.value : { status: 'error' },
        gemini: geminiHealth.status === 'fulfilled' ? geminiHealth.value : { status: 'error' }
      }
    };

    // Determine overall status
    const overallStatus = systemHealth.overall === 'healthy' && 
                         systemHealth.metrics.errorRate < 10 ? 'healthy' : 'degraded';

    const response = {
      ...detailedHealth,
      status: overallStatus
    };

    return NextResponse.json(response, {
      status: overallStatus === 'healthy' ? 200 : 503
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'performance_summary':
        performanceMonitor.logPerformanceSummary();
        return NextResponse.json({ message: 'Performance summary logged' });

      case 'clear_metrics':
        performanceMonitor.cleanup();
        return NextResponse.json({ message: 'Metrics cleared' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}