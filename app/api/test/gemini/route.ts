import { NextRequest, NextResponse } from 'next/server'
import { runGeminiTests } from '@/lib/test-gemini'

// Force dynamic rendering to prevent build-time external calls
export const dynamic = 'force-dynamic'

export async function GET() {
  // Skip external calls during build time
  if (process.env.BUILD_TIME === 'true' || process.env.DISABLE_EXTERNAL_CALLS === 'true') {
    return NextResponse.json({
      success: true,
      results: [],
      buildTime: true,
      timestamp: new Date().toISOString(),
      endpoint: '/api/test/gemini'
    });
  }
  try {
    console.log('🧪 Running comprehensive Gemini tests...');
    
    const testResults = await runGeminiTests();
    
    const status = testResults.success ? 200 : 503;
    
    return NextResponse.json({
      ...testResults,
      timestamp: new Date().toISOString(),
      endpoint: '/api/test/gemini'
    }, { status });
    
  } catch (error) {
    console.error('🚨 Test endpoint failed:', error);
    
    return NextResponse.json({
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      endpoint: '/api/test/gemini'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, options } = body;
    
    if (!prompt) {
      return NextResponse.json({
        error: 'Prompt is required'
      }, { status: 400 });
    }
    
    console.log('🧪 Running custom Gemini test with prompt:', prompt.substring(0, 100));
    
    const { generateTextWithGemini } = await import('@/lib/gemini-service');
    const response = await generateTextWithGemini(prompt, options);
    
    return NextResponse.json({
      success: true,
      response,
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🚨 Custom test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}