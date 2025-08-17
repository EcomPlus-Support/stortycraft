#!/usr/bin/env bun
/**
 * 🐛 Pitch Generation Bug 测试脚本
 * 
 * 测试为什么 YouTube Shorts 的 Pitch 生成很简短，并且显示 "Pitch is empty: false" 和 "Is loading: false"
 */

import { extractYouTubeMetadata, processReferenceContent } from './app/actions/process-reference';

// 测试用的 YouTube Shorts URL
const TEST_URL = 'https://www.youtube.com/shorts/VgdCsCqvQdk';
const TEST_ID_SUFFIX = '_character_fix_' + Date.now();

async function testPitchGenerationBug() {
  console.log('🐛 Testing Pitch Generation Bug');
  console.log('=' .repeat(60));
  console.log(`🎯 Testing URL: ${TEST_URL}`);
  
  try {
    // 模拟完整的处理流程
    console.log('\n📋 Step 1: Extracting YouTube metadata...');
    
    const metadata = await extractYouTubeMetadata(TEST_URL);
    console.log('\n✅ Metadata extraction completed');
    console.log('📊 Metadata structure:');
    console.log(`  - Title: ${metadata.title}`);
    console.log(`  - Has transcript: ${!!metadata.transcript}`);
    console.log(`  - Transcript length: ${metadata.transcript?.length || 0}`);
    console.log(`  - Has video analysis: ${!!metadata.hasVideoAnalysis}`);
    console.log(`  - Video analysis quality: ${metadata.videoAnalysisQuality}`);
    console.log(`  - Characters found: ${metadata.videoAnalysis?.characters?.length || 0}`);
    console.log(`  - Scenes found: ${metadata.videoAnalysis?.sceneBreakdown?.length || 0}`);
    
    if (!metadata.id) {
      metadata.id = 'test-' + Date.now().toString(36) + TEST_ID_SUFFIX;
    } else {
      metadata.id = metadata.id + TEST_ID_SUFFIX; // Force new cache key
    }
    if (!metadata.type) {
      metadata.type = 'youtube';
    }
    
    console.log('\n📋 Step 2: Processing reference content...');
    
    const result = await processReferenceContent(
      metadata as any,  // Cast to ReferenceSource
      'cinematic',      // targetStyle
      'zh-TW',          // targetLanguage
      true              // useStructuredOutput
    );
    
    console.log('\n✅ Step 2 completed');
    console.log('📊 Result structure:');
    console.log(`  - ID: ${result.id}`);
    console.log(`  - Source title: ${result.source.title}`);
    console.log(`  - Source type: ${result.source.type}`);
    console.log(`  - Has transcript: ${!!result.source.transcript}`);
    console.log(`  - Transcript length: ${result.source.transcript?.length || 0}`);
    console.log(`  - Generated pitch length: ${result.generatedPitch.length}`);
    console.log(`  - Warning: ${result.warning || 'None'}`);
    
    console.log('\n📝 Generated Pitch:');
    console.log('-' .repeat(40));
    console.log(result.generatedPitch);
    console.log('-' .repeat(40));
    
    // 分析问题
    console.log('\n🔍 Analysis:');
    
    if (result.generatedPitch.length < 200) {
      console.log('❌ ISSUE: Pitch is too short (< 200 chars)');
    }
    
    if (result.warning) {
      console.log(`⚠️  WARNING: ${result.warning}`);
    }
    
    if (result.generatedPitch.includes('For the baby, gi-hun risks all')) {
      console.log('❌ ISSUE: Pitch contains original title instead of detailed analysis');
    }
    
    if (result.generatedPitch.includes('live-action')) {
      console.log('❌ ISSUE: Using fallback template language');
    }
    
    // 检查视频分析质量
    console.log('\n🎬 Video Analysis Quality Check:');
    if (result.source.videoAnalysis) {
      console.log(`  ✅ Video analysis available`);
      console.log(`  - Confidence: ${result.source.videoAnalysis.confidence}`);
      console.log(`  - Quality: ${result.source.videoAnalysisQuality}`);
      console.log(`  - Has video analysis: ${result.source.hasVideoAnalysis}`);
      console.log(`  - Transcript from video: ${result.source.videoAnalysis.generatedTranscript?.substring(0, 100)}...`);
    } else {
      console.log(`  ❌ No video analysis data available`);
    }
    
    // 检查内容质量评分
    console.log('\n📈 Content Quality Analysis:');
    console.log(`  - Content quality: ${result.contentQuality}`);
    console.log(`  - Source processing status: ${result.source.processingStatus}`);
    
    return result;
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    
    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`);
      if (error.stack) {
        console.error('Stack trace:', error.stack.split('\n').slice(0, 10).join('\n'));
      }
    }
    
    throw error;
  }
}

// 测试特定的fallback逻辑
async function testFallbackLogic() {
  console.log('\n🔄 Testing Fallback Logic');
  console.log('=' .repeat(60));
  
  // 检查是否使用了enhanced fallback
  console.log('🔍 Checking fallback triggers...');
  
  // 这里可以添加更多特定的fallback测试
  console.log('📋 Potential fallback reasons:');
  console.log('  1. Video analysis JSON parsing failed');
  console.log('  2. Gemini returned incomplete response');
  console.log('  3. Enhanced fallback activated');
  console.log('  4. Content quality too low');
}

// 对比测试：真实分析 vs 实际pitch生成
async function compareAnalysisVsPitch() {
  console.log('\n🔄 Comparison: Video Analysis vs Generated Pitch');
  console.log('=' .repeat(60));
  
  try {
    const result = await testPitchGenerationBug();
    
    console.log('\n📊 Comparison Results:');
    
    // 检查视频分析的详细程度
    if (result.source.videoAnalysis) {
      const analysis = result.source.videoAnalysis;
      console.log('\n🎬 Video Analysis Details:');
      console.log(`  - Characters found: ${analysis.characters?.length || 0}`);
      console.log(`  - Scenes analyzed: ${analysis.sceneBreakdown?.length || 0}`);
      console.log(`  - Dialogues captured: ${analysis.dialogues?.length || 0}`);
      console.log(`  - Key moments: ${analysis.keyMoments?.length || 0}`);
      console.log(`  - Confidence: ${analysis.confidence}`);
      
      // 对比pitch内容
      console.log('\n📝 Pitch vs Analysis Comparison:');
      
      // 检查是否pitch使用了分析结果
      const pitchUsesAnalysis = 
        analysis.characters?.some(char => 
          result.generatedPitch.includes(char.name) || 
          result.generatedPitch.includes(char.description)
        ) ||
        analysis.sceneBreakdown?.some(scene => 
          result.generatedPitch.includes(scene.description.substring(0, 30))
        );
      
      if (pitchUsesAnalysis) {
        console.log('  ✅ Pitch incorporates video analysis');
      } else {
        console.log('  ❌ Pitch does NOT use video analysis data');
        console.log('  🔍 This suggests the issue is in the pitch generation step, not video analysis');
      }
    }
    
  } catch (error) {
    console.error('Comparison test failed:', error);
  }
}

// 主执行函数
async function main() {
  console.log('🚀 Starting Pitch Generation Bug Analysis\n');
  
  try {
    await testPitchGenerationBug();
    await testFallbackLogic();
    await compareAnalysisVsPitch();
    
    console.log('\n🎯 Bug Analysis Summary:');
    console.log('=' .repeat(60));
    console.log('Based on the test results, the issue is likely in one of these areas:');
    console.log('1. 📄 JSON parsing failure in video analysis → fallback activated');
    console.log('2. 🎯 Pitch generation not using video analysis data');
    console.log('3. 🔄 Enhanced fallback using template instead of analysis');
    console.log('4. ⚙️  Content processing pipeline missing connections');
    
  } catch (error) {
    console.error('💥 Critical test failure:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (import.meta.main) {
  main().catch(console.error);
}

export { testPitchGenerationBug, compareAnalysisVsPitch };