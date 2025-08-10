/**
 * Test utility for validating Gemini configuration and availability
 * This can be used to troubleshoot issues with the Gemini service
 */

import { generateTextWithGemini, checkGeminiHealth } from './gemini-service';
import { logEnvironmentInfo, validateEnvironment } from './debug-utils';

export async function runGeminiTests(): Promise<{
  success: boolean;
  results: Array<{
    test: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    duration?: number;
  }>;
}> {
  const results: Array<{
    test: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    duration?: number;
  }> = [];

  console.log('🧪 Starting Gemini service tests...\n');

  // Test 1: Environment validation
  console.log('1️⃣ Testing environment configuration...');
  const envValidation = validateEnvironment();
  if (envValidation.valid) {
    results.push({
      test: 'Environment Configuration',
      status: 'pass',
      message: 'All required environment variables are set'
    });
  } else {
    results.push({
      test: 'Environment Configuration',
      status: 'fail',
      message: `Missing required variables: ${envValidation.issues.join(', ')}`
    });
  }

  // Log warnings if any
  if (envValidation.warnings.length > 0) {
    results.push({
      test: 'Environment Warnings',
      status: 'warning',
      message: `Optional variables not set: ${envValidation.warnings.join(', ')}`
    });
  }

  // Test 2: Health check
  console.log('2️⃣ Testing Gemini service health...');
  try {
    const startTime = Date.now();
    const health = await checkGeminiHealth();
    const duration = Date.now() - startTime;
    
    if (health.healthy) {
      results.push({
        test: 'Service Health Check',
        status: 'pass',
        message: `Service is healthy (model: ${health.model}, region: ${health.region})`,
        duration
      });
    } else {
      results.push({
        test: 'Service Health Check',
        status: 'fail',
        message: `Service is unhealthy: ${health.error}`,
        duration
      });
    }
  } catch (error) {
    results.push({
      test: 'Service Health Check',
      status: 'fail',
      message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Test 3: Simple text generation
  console.log('3️⃣ Testing basic text generation...');
  try {
    const startTime = Date.now();
    const response = await generateTextWithGemini(
      'Reply with exactly "GEMINI_TEST_SUCCESS" if you understand this message.',
      {
        temperature: 0,
        maxTokens: 50,
        timeout: 30000 // 30 second timeout
      }
    );
    const duration = Date.now() - startTime;
    
    if (response && response.includes('GEMINI_TEST_SUCCESS')) {
      results.push({
        test: 'Basic Text Generation',
        status: 'pass',
        message: 'Successfully generated expected response',
        duration
      });
    } else {
      results.push({
        test: 'Basic Text Generation',
        status: 'warning',
        message: `Unexpected response: ${response?.substring(0, 100)}...`,
        duration
      });
    }
  } catch (error) {
    results.push({
      test: 'Basic Text Generation',
      status: 'fail',
      message: `Text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Test 4: JSON generation (similar to scene generation)
  console.log('4️⃣ Testing JSON generation capability...');
  try {
    const startTime = Date.now();
    const response = await generateTextWithGemini(
      'Generate a simple JSON object with this structure: {"status": "test", "message": "JSON generation works", "timestamp": "current time"}. Return only the JSON, no other text.',
      {
        temperature: 0,
        maxTokens: 200,
        timeout: 30000
      }
    );
    const duration = Date.now() - startTime;
    
    try {
      // Try to parse the response as JSON
      const parsed = JSON.parse(response);
      if (parsed.status === 'test' && parsed.message) {
        results.push({
          test: 'JSON Generation',
          status: 'pass',
          message: 'Successfully generated and parsed JSON response',
          duration
        });
      } else {
        results.push({
          test: 'JSON Generation',
          status: 'warning',
          message: 'Generated JSON but with unexpected content',
          duration
        });
      }
    } catch {
      results.push({
        test: 'JSON Generation',
        status: 'fail',
        message: `Generated response is not valid JSON: ${response?.substring(0, 100)}...`,
        duration
      });
    }
  } catch (error) {
    results.push({
      test: 'JSON Generation',
      status: 'fail',
      message: `JSON generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Calculate overall success
  const failures = results.filter(r => r.status === 'fail').length;
  const success = failures === 0;

  // Print summary
  console.log('\n📊 Test Results Summary:');
  results.forEach((result) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${icon} ${result.test}: ${result.message}${duration}`);
  });

  console.log(`\n🎯 Overall Status: ${success ? '✅ PASS' : '❌ FAIL'} (${results.filter(r => r.status === 'pass').length}/${results.length} tests passed)`);

  if (!success) {
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check your Google Cloud authentication: gcloud auth application-default login');
    console.log('2. Verify your project ID and region are correct');
    console.log('3. Ensure the Vertex AI API is enabled in your project');
    console.log('4. Try using a different Gemini model (e.g., gemini-1.5-pro-002)');
    console.log('5. Check the health endpoint: /api/health/gemini');
  }

  return { success, results };
}

/**
 * Quick test function for CLI usage
 */
export async function quickGeminiTest(): Promise<boolean> {
  console.log('🚀 Quick Gemini Test');
  logEnvironmentInfo();
  
  try {
    const health = await checkGeminiHealth();
    console.log('Health Status:', health);
    
    if (!health.healthy) {
      console.error('❌ Gemini service is not healthy');
      return false;
    }
    
    const response = await generateTextWithGemini('Say "Hello from Gemini!"', {
      temperature: 0,
      timeout: 10000
    });
    
    console.log('✅ Gemini Response:', response);
    return true;
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return false;
  }
}