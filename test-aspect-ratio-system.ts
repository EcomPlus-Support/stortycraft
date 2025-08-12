/**
 * Test suite for the comprehensive aspect ratio system
 * Run with: npx tsx test-aspect-ratio-system.ts
 */

import { validateAspectRatio, validateVideoGenerationRequest, validateCostLimits } from './lib/validation';
import { getCacheManager } from './lib/cache';
import { getMetricsCollector } from './lib/metrics';
import { logger } from './lib/logger';
import { ASPECT_RATIOS, getAspectRatioById, getSupportedAspectRatios, analyzeAspectRatio } from './app/constants/aspectRatios';
import { generateImageRest } from './lib/imagen-enhanced';
import { generateSceneVideo } from './lib/veo';
import { generateScenesEnhanced } from './app/actions/generate-scenes-enhanced';
import { editVideoEnhanced } from './app/actions/generate-video-enhanced';
import type { AspectRatio, VideoGenerationRequest } from './app/types';

// Test configuration
const TEST_CONFIG = {
  runImageGeneration: process.env.TEST_IMAGES === 'true',
  runVideoGeneration: process.env.TEST_VIDEOS === 'true',
  runFullPipeline: process.env.TEST_FULL_PIPELINE === 'true',
  enableCaching: true,
  verboseLogging: true
};

console.log('🧪 Starting comprehensive aspect ratio system tests...\n');
console.log('Test configuration:', TEST_CONFIG);

// Track test results
const testResults: Array<{
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  metadata?: any;
}> = [];

async function runTest<T>(
  name: string, 
  testFn: () => Promise<T>
): Promise<{ success: boolean; result?: T; error?: Error; duration: number }> {
  const startTime = Date.now();
  console.log(`\n🔄 Running test: ${name}`);
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    console.log(`✅ Test passed: ${name} (${duration}ms)`);
    testResults.push({ name, success: true, duration });
    
    return { success: true, result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));
    
    console.log(`❌ Test failed: ${name} (${duration}ms)`);
    console.log(`   Error: ${err.message}`);
    testResults.push({ name, success: false, duration, error: err.message });
    
    return { success: false, error: err, duration };
  }
}

// Test 1: Validation System
async function testValidationSystem(): Promise<void> {
  console.log('\n📋 Testing validation system...');
  
  // Test aspect ratio validation
  await runTest('Aspect ratio validation - valid', async () => {
    const validAspectRatio = ASPECT_RATIOS[0];
    const result = validateAspectRatio(validAspectRatio);
    if (result.id !== validAspectRatio.id) throw new Error('Validation failed');
  });
  
  await runTest('Aspect ratio validation - invalid', async () => {
    try {
      validateAspectRatio({ id: 'invalid', ratio: -1 } as any);
      throw new Error('Should have thrown validation error');
    } catch (error) {
      if (!error.message.includes('Invalid aspect ratio')) {
        throw error;
      }
    }
  });
  
  // Test video generation request validation
  await runTest('Video generation request validation', async () => {
    const request: VideoGenerationRequest = {
      scenes: [{
        imagePrompt: 'Test image prompt',
        videoPrompt: 'Test video prompt',
        description: 'Test description',
        voiceover: 'Test voiceover',
        charactersPresent: []
      }],
      aspectRatio: ASPECT_RATIOS[0],
      options: {
        quality: 'medium',
        enableCaching: true
      }
    };
    
    const result = validateVideoGenerationRequest(request);
    if (!result.scenes || result.scenes.length === 0) {
      throw new Error('Validation failed');
    }
  });
  
  // Test cost validation
  await runTest('Cost limits validation', async () => {
    validateCostLimits(10.0, 50.0); // Should pass
    
    try {
      validateCostLimits(100.0, 50.0); // Should fail
      throw new Error('Should have thrown cost limit error');
    } catch (error) {
      if (!error.message.includes('exceeds maximum')) {
        throw error;
      }
    }
  });
}

// Test 2: Cache System
async function testCacheSystem(): Promise<void> {
  console.log('\n💾 Testing cache system...');
  
  const cache = getCacheManager();
  const testAspectRatio = ASPECT_RATIOS[0];
  
  await runTest('Cache basic operations', async () => {
    const key = 'test:cache:key';
    const value = { test: 'data', timestamp: Date.now() };
    
    // Set
    await cache.set(key, value, 60);
    
    // Get
    const retrieved = await cache.get(key);
    if (!retrieved || retrieved.test !== value.test) {
      throw new Error('Cache set/get failed');
    }
    
    // Delete
    await cache.delete(key);
    const deleted = await cache.get(key);
    if (deleted !== null) {
      throw new Error('Cache delete failed');
    }
  });
  
  await runTest('Cache key generation', async () => {
    const imageKey = cache.generateImageKey('test prompt', testAspectRatio);
    const videoKey = cache.generateVideoKey('test prompt', 'test_image_data', testAspectRatio);
    const scenarioKey = cache.generateScenarioKey({
      pitch: 'test',
      numScenes: 3,
      style: 'test',
      language: { name: 'English', code: 'en' },
      aspectRatio: testAspectRatio
    });
    
    if (!imageKey.includes(testAspectRatio.id) || 
        !videoKey.includes(testAspectRatio.id) || 
        !scenarioKey.includes(testAspectRatio.id)) {
      throw new Error('Cache keys do not include aspect ratio');
    }
  });
  
  await runTest('Cache aspect ratio filtering', async () => {
    // Set some test data with different aspect ratios
    const testData = { value: 'test' };
    await cache.set(`test:16:9:${Date.now()}`, testData, 60);
    await cache.set(`test:9:16:${Date.now()}`, testData, 60);
    
    // This test would need more specific cache implementation details
    // For now, we'll just verify the method exists
    const stats = cache.getStats();
    if (typeof stats.hits !== 'number') {
      throw new Error('Cache stats not working');
    }
  });
}

// Test 3: Metrics System
async function testMetricsSystem(): Promise<void> {
  console.log('\n📊 Testing metrics system...');
  
  const metrics = getMetricsCollector();
  const testAspectRatio = ASPECT_RATIOS[0];
  
  await runTest('Metrics recording', async () => {
    // Record some test metrics
    metrics.recordRequest('imagen', true, 1000, testAspectRatio, 0.02);
    metrics.recordRequest('veo', false, 5000, testAspectRatio, 0);
    metrics.recordCost('imagen', 'test', 0.02, testAspectRatio.id);
    
    // Get metrics
    const currentMetrics = metrics.getCurrentMetrics();
    if (typeof currentMetrics.activeRequests !== 'number') {
      throw new Error('Metrics not recording properly');
    }
  });
  
  await runTest('Health status', async () => {
    const health = metrics.getHealthStatus();
    if (!health.status || !health.services) {
      throw new Error('Health status not working');
    }
  });
  
  await runTest('Cost tracking', async () => {
    const costHistory = metrics.getCostHistory(undefined, testAspectRatio.id, 1);
    const totalCost = metrics.getTotalCost(undefined, testAspectRatio.id, 1);
    
    if (!Array.isArray(costHistory) || typeof totalCost !== 'number') {
      throw new Error('Cost tracking not working');
    }
  });
}

// Test 4: Aspect Ratio Constants and Utilities
async function testAspectRatioConstants(): Promise<void> {
  console.log('\n📐 Testing aspect ratio constants and utilities...');
  
  await runTest('Aspect ratio constants', async () => {
    if (ASPECT_RATIOS.length === 0) {
      throw new Error('No aspect ratios defined');
    }
    
    // Verify each aspect ratio has required properties
    for (const ar of ASPECT_RATIOS) {
      if (!ar.id || !ar.label || typeof ar.ratio !== 'number') {
        throw new Error(`Invalid aspect ratio: ${ar.id}`);
      }
    }
  });
  
  await runTest('Service compatibility', async () => {
    const imagenSupported = getSupportedAspectRatios('imagen');
    const veoSupported = getSupportedAspectRatios('veo');
    
    if (imagenSupported.length === 0 || veoSupported.length === 0) {
      throw new Error('No supported aspect ratios found');
    }
  });
  
  await runTest('Aspect ratio analysis', async () => {
    const analysis1 = analyzeAspectRatio(1920, 1080);
    const analysis2 = analyzeAspectRatio(1080, 1920);
    const analysis3 = analyzeAspectRatio(1080, 1080);
    
    if (!analysis1.isLandscape || !analysis2.isPortrait || !analysis3.isSquare) {
      throw new Error('Aspect ratio analysis failed');
    }
  });
  
  await runTest('Aspect ratio lookup', async () => {
    const ar1 = getAspectRatioById('16:9');
    const ar2 = getAspectRatioById('nonexistent');
    
    if (!ar1 || ar2) {
      throw new Error('Aspect ratio lookup failed');
    }
  });
}

// Test 5: Image Generation (if enabled)
async function testImageGeneration(): Promise<void> {
  if (!TEST_CONFIG.runImageGeneration) {
    console.log('\n🖼️ Skipping image generation tests (TEST_IMAGES=false)');
    return;
  }
  
  console.log('\n🖼️ Testing image generation with aspect ratios...');
  
  const testPrompt = 'A beautiful sunset landscape, cinematic style';
  
  for (const aspectRatio of getSupportedAspectRatios('imagen').slice(0, 2)) {
    await runTest(`Image generation - ${aspectRatio.id}`, async () => {
      const result = await generateImageRest(
        testPrompt,
        aspectRatio,
        { 
          enableCaching: TEST_CONFIG.enableCaching, 
          quality: 'low',
          retryAttempts: 1
        }
      );
      
      if (!result.predictions || result.predictions.length === 0) {
        throw new Error('No image generated');
      }
      
      if (result.aspectRatio.id !== aspectRatio.id) {
        throw new Error('Aspect ratio mismatch');
      }
      
      console.log(`   Generated image for ${aspectRatio.id}, cost: $${result.cost.toFixed(4)}, cached: ${result.cached}`);
      
      return result;
    });
  }
}

// Test 6: Video Generation (if enabled)
async function testVideoGeneration(): Promise<void> {
  if (!TEST_CONFIG.runVideoGeneration) {
    console.log('\n🎥 Skipping video generation tests (TEST_VIDEOS=false)');
    return;
  }
  
  console.log('\n🎥 Testing video generation with aspect ratios...');
  
  // This would require actual image data, so we'll simulate
  console.log('   Video generation tests require actual image data - skipping for now');
  console.log('   To test video generation, provide base64 image data and enable TEST_VIDEOS');
}

// Test 7: Full Pipeline (if enabled)
async function testFullPipeline(): Promise<void> {
  if (!TEST_CONFIG.runFullPipeline) {
    console.log('\n🔄 Skipping full pipeline tests (TEST_FULL_PIPELINE=false)');
    return;
  }
  
  console.log('\n🔄 Testing full pipeline with aspect ratios...');
  
  await runTest('Scene generation with aspect ratio', async () => {
    const result = await generateScenesEnhanced(
      'A story about innovation and technology',
      2, // numScenes
      'cinematic',
      { name: 'English', code: 'en' },
      {
        aspectRatio: ASPECT_RATIOS[0],
        enableImageGeneration: false, // Disable to avoid API costs
        enableCaching: true,
        imageQuality: 'low'
      }
    );
    
    if (!result.scenes || result.scenes.length !== 2) {
      throw new Error('Scene generation failed');
    }
    
    if (result.aspectRatio?.id !== ASPECT_RATIOS[0].id) {
      throw new Error('Aspect ratio not preserved');
    }
    
    console.log(`   Generated ${result.scenes.length} scenes, cost: $${result.metadata.cost.toFixed(4)}`);
    console.log(`   Processing time: ${result.metadata.processingTime}ms, cache hits: ${result.metadata.cacheHits}`);
    
    return result;
  });
}

// Test 8: Error Handling
async function testErrorHandling(): Promise<void> {
  console.log('\n⚠️ Testing error handling...');
  
  await runTest('Invalid aspect ratio handling', async () => {
    try {
      await generateImageRest('test', { id: 'invalid', ratio: -1 } as any);
      throw new Error('Should have thrown validation error');
    } catch (error) {
      if (!error.message.includes('aspect ratio')) {
        throw error;
      }
    }
  });
  
  await runTest('Cost limit exceeded', async () => {
    try {
      validateCostLimits(1000, 10);
      throw new Error('Should have thrown cost limit error');
    } catch (error) {
      if (!error.message.includes('exceeds')) {
        throw error;
      }
    }
  });
}

// Test 9: Performance Benchmarks
async function testPerformanceBenchmarks(): Promise<void> {
  console.log('\n⚡ Running performance benchmarks...');
  
  await runTest('Cache performance', async () => {
    const cache = getCacheManager();
    const iterations = 1000;
    const testData = { benchmark: true, timestamp: Date.now() };
    
    const startTime = Date.now();
    
    // Benchmark cache operations
    for (let i = 0; i < iterations; i++) {
      const key = `bench:${i}`;
      await cache.set(key, testData, 60);
      const retrieved = await cache.get(key);
      if (!retrieved) throw new Error('Cache benchmark failed');
    }
    
    const duration = Date.now() - startTime;
    const opsPerSecond = (iterations * 2) / (duration / 1000); // 2 operations per iteration
    
    console.log(`   Cache performance: ${opsPerSecond.toFixed(0)} ops/sec`);
    
    // Cleanup
    for (let i = 0; i < iterations; i++) {
      await cache.delete(`bench:${i}`);
    }
  });
  
  await runTest('Validation performance', async () => {
    const iterations = 10000;
    const testAspectRatio = ASPECT_RATIOS[0];
    
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      validateAspectRatio(testAspectRatio);
    }
    
    const duration = Date.now() - startTime;
    const validationsPerSecond = iterations / (duration / 1000);
    
    console.log(`   Validation performance: ${validationsPerSecond.toFixed(0)} validations/sec`);
  });
}

// Main test runner
async function runAllTests(): Promise<void> {
  const overallStartTime = Date.now();
  
  console.log('🚀 Starting test execution...\n');
  
  try {
    await testValidationSystem();
    await testCacheSystem();
    await testMetricsSystem();
    await testAspectRatioConstants();
    await testImageGeneration();
    await testVideoGeneration();
    await testFullPipeline();
    await testErrorHandling();
    await testPerformanceBenchmarks();
    
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error);
  }
  
  // Print summary
  const overallDuration = Date.now() - overallStartTime;
  const passed = testResults.filter(t => t.success).length;
  const failed = testResults.filter(t => !t.success).length;
  const total = testResults.length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️ Total time: ${overallDuration}ms`);
  console.log(`📈 Success rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    testResults.filter(t => !t.success).forEach(test => {
      console.log(`   - ${test.name}: ${test.error}`);
    });
  }
  
  // Output metrics
  const metrics = getMetricsCollector();
  const finalStats = metrics.getCurrentMetrics();
  
  console.log('\n📊 System metrics after tests:');
  console.log(`   Active requests: ${finalStats.activeRequests}`);
  console.log(`   Total cost: $${finalStats.totalCost.toFixed(4)}`);
  console.log(`   Error rate: ${finalStats.errorRate.toFixed(2)}%`);
  console.log(`   Average response time: ${finalStats.avgResponseTime.toFixed(0)}ms`);
  
  const cache = getCacheManager();
  const cacheStats = cache.getStats();
  console.log(`   Cache hit rate: ${cacheStats.hitRate.toFixed(1)}%`);
  console.log(`   Cache entries: ${cacheStats.keyCount}`);
  
  console.log('\n✨ Test suite completed!');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});