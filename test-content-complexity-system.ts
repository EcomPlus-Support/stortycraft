#!/usr/bin/env bun
/**
 * 🧪 Content Complexity System Test
 * 
 * 測試新的內容複雜度評估和適應性處理系統
 */

import { extractYouTubeMetadata, processReferenceContent } from './app/actions/process-reference';

// 測試用的不同複雜度 YouTube Shorts URLs
const TEST_CASES = [
  {
    name: '簡單視頻 (Simple)',
    url: 'https://www.youtube.com/shorts/VgdCsCqvQdk',
    expectedComplexity: 'simple',
    description: '魷魚遊戲短片，預期角色少、場景簡單'
  },
  {
    name: '中等複雜度視頻 (Moderate)', 
    url: 'https://www.youtube.com/shorts/xXKiIFbO95Y',
    expectedComplexity: 'moderate',
    description: '人生統計講解，預期內容較豐富但處理得當'
  },
  // 可以添加更多測試案例
];

interface TestResult {
  testName: string;
  url: string;
  success: boolean;
  complexityAnalysis?: any;
  processingTime: number;
  pitchQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
  errors: string[];
  warnings: string[];
  details: {
    metadataExtraction: boolean;
    complexityEvaluation: boolean;
    adaptiveProcessing: boolean;
    pitchGeneration: boolean;
  };
}

async function testComplexitySystem() {
  console.log('🧪 Testing Content Complexity System');
  console.log('=' .repeat(70));
  
  const results: TestResult[] = [];
  
  for (const testCase of TEST_CASES) {
    console.log(`\n🎯 Testing: ${testCase.name}`);
    console.log(`📹 URL: ${testCase.url}`);
    console.log(`📝 Description: ${testCase.description}`);
    console.log(`🔮 Expected Complexity: ${testCase.expectedComplexity}`);
    console.log('-' .repeat(50));
    
    const result: TestResult = {
      testName: testCase.name,
      url: testCase.url,
      success: false,
      processingTime: 0,
      pitchQuality: 'poor',
      errors: [],
      warnings: [],
      details: {
        metadataExtraction: false,
        complexityEvaluation: false,
        adaptiveProcessing: false,
        pitchGeneration: false
      }
    };
    
    const startTime = Date.now();
    
    try {
      // Step 1: 提取元數據
      console.log('📋 Step 1: Extracting metadata...');
      const metadata = await extractYouTubeMetadata(testCase.url);
      result.details.metadataExtraction = true;
      
      if (metadata.processingStatus === 'error') {
        result.errors.push(`Metadata extraction failed: ${metadata.errorMessage}`);
        results.push(result);
        continue;
      }
      
      console.log(`✅ Metadata extracted successfully`);
      console.log(`   - Title: ${metadata.title}`);
      console.log(`   - Duration: ${metadata.duration}s`);
      console.log(`   - Video Analysis: ${metadata.hasVideoAnalysis ? 'Yes' : 'No'}`);
      console.log(`   - Characters: ${metadata.videoAnalysis?.characters?.length || 0}`);
      console.log(`   - Scenes: ${metadata.videoAnalysis?.sceneBreakdown?.length || 0}`);
      
      // Step 2: 檢查是否有複雜度分析 (新功能)
      console.log('\n📊 Step 2: Checking complexity analysis...');
      
      // 這裡我們需要檢查是否實作了複雜度分析
      if (metadata.videoAnalysis && typeof (metadata as any).complexityMetrics !== 'undefined') {
        result.details.complexityEvaluation = true;
        result.complexityAnalysis = (metadata as any).complexityMetrics;
        console.log(`✅ Complexity analysis available`);
        console.log(`   - Complexity Level: ${result.complexityAnalysis?.level}`);
        console.log(`   - Total Score: ${result.complexityAnalysis?.totalScore}`);
        console.log(`   - Token Budget: ${result.complexityAnalysis?.recommendedTokenBudget}`);
      } else {
        result.warnings.push('Complexity analysis not yet implemented');
        console.log(`⚠️  Complexity analysis not available (expected for initial implementation)`);
      }
      
      // 準備處理
      if (!metadata.id) {
        metadata.id = `test-complexity-${Date.now().toString(36)}`;
      }
      if (!metadata.type) {
        metadata.type = 'youtube';
      }
      
      // Step 3: 處理內容
      console.log('\n🔄 Step 3: Processing content with adaptive strategy...');
      const processResult = await processReferenceContent(
        metadata as any,
        'cinematic',
        'zh-TW',
        true
      );
      
      result.details.pitchGeneration = true;
      const endTime = Date.now();
      result.processingTime = endTime - startTime;
      
      console.log(`✅ Content processed in ${result.processingTime}ms`);
      console.log(`   - Pitch length: ${processResult.generatedPitch.length}`);
      console.log(`   - Content quality: ${processResult.contentQuality}`);
      console.log(`   - Warning: ${processResult.warning || 'None'}`);
      
      // 評估結果品質
      if (processResult.generatedPitch.length >= 500 && processResult.contentQuality === 'full') {
        result.pitchQuality = 'excellent';
      } else if (processResult.generatedPitch.length >= 300 && processResult.contentQuality !== 'metadata-only') {
        result.pitchQuality = 'good';
      } else if (processResult.generatedPitch.length >= 200) {
        result.pitchQuality = 'acceptable';
      } else {
        result.pitchQuality = 'poor';
      }
      
      // 檢查處理時間
      if (result.processingTime > 60000) { // 60秒
        result.warnings.push(`Processing time too long: ${result.processingTime}ms`);
      }
      
      // 檢查是否使用了適應性處理 (如果實作了)
      if (processResult.contentQuality === 'full' && result.processingTime < 30000) {
        result.details.adaptiveProcessing = true;
      }
      
      result.success = result.details.metadataExtraction && result.details.pitchGeneration;
      
      console.log('\n📊 Test Result Summary:');
      console.log(`   ✅ Success: ${result.success}`);
      console.log(`   ⏱️  Processing Time: ${result.processingTime}ms`);
      console.log(`   🌟 Pitch Quality: ${result.pitchQuality}`);
      console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
      console.log(`   ❌ Errors: ${result.errors.length}`);
      
    } catch (error) {
      const endTime = Date.now();
      result.processingTime = endTime - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));
      
      console.error(`❌ Test failed after ${result.processingTime}ms:`, error);
    }
    
    results.push(result);
  }
  
  return results;
}

async function generateTestReport(results: TestResult[]) {
  console.log('\n' + '=' .repeat(70));
  console.log('📊 CONTENT COMPLEXITY SYSTEM TEST REPORT');
  console.log('=' .repeat(70));
  
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const averageProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / totalTests;
  
  console.log(`\n📈 Overall Statistics:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Successful: ${successfulTests} (${Math.round(successfulTests/totalTests*100)}%)`);
  console.log(`   Average Processing Time: ${Math.round(averageProcessingTime)}ms`);
  
  console.log(`\n🎯 Individual Test Results:`);
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.testName}`);
    console.log(`   Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Processing Time: ${result.processingTime}ms`);
    console.log(`   Pitch Quality: ${result.pitchQuality}`);
    
    if (result.complexityAnalysis) {
      console.log(`   Complexity: ${result.complexityAnalysis.level} (${result.complexityAnalysis.totalScore})`);
    }
    
    console.log(`   Pipeline Status:`);
    console.log(`     - Metadata: ${result.details.metadataExtraction ? '✅' : '❌'}`);
    console.log(`     - Complexity: ${result.details.complexityEvaluation ? '✅' : '⚠️'}`);
    console.log(`     - Adaptive: ${result.details.adaptiveProcessing ? '✅' : '⚠️'}`);
    console.log(`     - Pitch: ${result.details.pitchGeneration ? '✅' : '❌'}`);
    
    if (result.warnings.length > 0) {
      console.log(`   Warnings: ${result.warnings.join(', ')}`);
    }
    
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`);
    }
  });
  
  console.log(`\n🔍 Analysis:`);
  const longProcessingTests = results.filter(r => r.processingTime > 30000);
  const poorQualityTests = results.filter(r => r.pitchQuality === 'poor');
  const complexityImplemented = results.some(r => r.details.complexityEvaluation);
  
  if (longProcessingTests.length > 0) {
    console.log(`   ⚠️  ${longProcessingTests.length} tests had slow processing (>30s)`);
  }
  
  if (poorQualityTests.length > 0) {
    console.log(`   ❌ ${poorQualityTests.length} tests had poor pitch quality`);
  }
  
  if (!complexityImplemented) {
    console.log(`   🚧 Complexity analysis system not yet implemented`);
  } else {
    console.log(`   ✅ Complexity analysis system working`);
  }
  
  console.log(`\n🎯 Recommendations:`);
  if (averageProcessingTime > 30000) {
    console.log(`   - Optimize processing speed (current avg: ${Math.round(averageProcessingTime)}ms)`);
  }
  
  if (successfulTests < totalTests) {
    console.log(`   - Fix failing test cases for better reliability`);
  }
  
  if (!complexityImplemented) {
    console.log(`   - Implement complexity analysis system as planned`);
  }
  
  return {
    totalTests,
    successfulTests,
    successRate: successfulTests / totalTests,
    averageProcessingTime,
    needsComplexitySystem: !complexityImplemented,
    needsOptimization: averageProcessingTime > 30000
  };
}

// 主執行函數
async function main() {
  console.log('🚀 Starting Content Complexity System Test\n');
  
  try {
    const results = await testComplexitySystem();
    const report = await generateTestReport(results);
    
    console.log('\n' + '=' .repeat(70));
    console.log(`📋 TEST COMPLETION STATUS: ${report.successRate === 1 ? '✅ ALL PASS' : '⚠️  NEEDS WORK'}`);
    console.log('=' .repeat(70));
    
    // 返回結果供後續分析
    return report;
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
}

// 如果直接運行此文件
if (import.meta.main) {
  main().catch(console.error);
}

export { testComplexitySystem, generateTestReport };