import { NextResponse } from 'next/server'
import { checkGeminiHealth } from '@/lib/gemini-service'

// Force dynamic rendering to prevent build-time external calls
export const dynamic = 'force-dynamic'

export async function GET() {
  // Skip external calls during build time
  if (process.env.BUILD_TIME === 'true' || process.env.DISABLE_EXTERNAL_CALLS === 'true') {
    return NextResponse.json({
      healthy: true,
      service: 'gemini',
      buildTime: true,
      timestamp: new Date().toISOString(),
      checkDuration: 0
    });
  }
  try {
    console.log('🏥 Health check requested for Gemini service');
    const startTime = Date.now();
    
    const healthStatus = await checkGeminiHealth();
    const checkDuration = Date.now() - startTime;
    
    console.log('🏥 Health check completed:', {
      ...healthStatus,
      checkDuration
    });
    
    const status = healthStatus.healthy ? 200 : 503;
    
    return NextResponse.json({
      ...healthStatus,
      checkDuration,
      timestamp: new Date().toISOString(),
      service: 'gemini'
    }, { status });
    
  } catch (error) {
    console.error('🚨 Health check failed:', error);
    
    return NextResponse.json({
      healthy: false,
      service: 'gemini',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      checkDuration: 0
    }, { status: 503 });
  }
}