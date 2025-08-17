#!/usr/bin/env bun
/**
 * 🔍 Specific Shorts Error Test
 * 
 * Testing the failing YouTube Shorts URL to identify root cause
 * URL: https://www.youtube.com/shorts/xXKiIFbO95Y
 */

import { extractYouTubeMetadata, processReferenceContent } from './app/actions/process-reference';

// 测试失败的 YouTube Shorts URL
const FAILING_URL = 'https://www.youtube.com/shorts/xXKiIFbO95Y';

async function testFailingShorts() {
  console.log('🔍 Testing Failing Shorts URL');
  console.log('=' .repeat(60));
  console.log(`🎯 Testing URL: ${FAILING_URL}`);
  
  try {
    console.log('\n📋 Step 1: Extracting YouTube metadata...');
    
    const startTime = Date.now();
    const metadata = await extractYouTubeMetadata(FAILING_URL);
    const extractionTime = Date.now() - startTime;
    
    console.log('\n✅ Metadata extraction completed in', extractionTime + 'ms');
    console.log('📊 Metadata structure:');
    console.log(`  - Title: ${metadata.title || 'NOT_SET'}`);
    console.log(`  - Description length: ${metadata.description?.length || 0}`);
    console.log(`  - Duration: ${metadata.duration || 'NOT_SET'}`);
    console.log(`  - Has transcript: ${!!metadata.transcript}`);
    console.log(`  - Transcript length: ${metadata.transcript?.length || 0}`);
    console.log(`  - Processing status: ${metadata.processingStatus}`);
    console.log(`  - Error message: ${metadata.errorMessage || 'None'}`);
    console.log(`  - Has video analysis: ${!!metadata.hasVideoAnalysis}`);
    console.log(`  - Video analysis quality: ${metadata.videoAnalysisQuality || 'N/A'}`);
    console.log(`  - Characters found: ${metadata.videoAnalysis?.characters?.length || 0}`);
    console.log(`  - Scenes found: ${metadata.videoAnalysis?.sceneBreakdown?.length || 0}`);
    
    // Show video analysis details if available
    if (metadata.videoAnalysis) {
      console.log('\n🎬 Video Analysis Details:');
      console.log(`  - Confidence: ${metadata.videoAnalysis.confidence}`);
      console.log(`  - Generated transcript preview: ${metadata.videoAnalysis.generatedTranscript?.substring(0, 200) || 'N/A'}...`);
      
      if (metadata.videoAnalysis.characters && metadata.videoAnalysis.characters.length > 0) {
        console.log('\n👥 Characters Found:');
        metadata.videoAnalysis.characters.forEach((char, index) => {
          console.log(`  ${index + 1}. ${char.name}: ${char.description}`);
          console.log(`     Role: ${char.role}, Characteristics: ${char.characteristics}`);
        });
      }
      
      if (metadata.videoAnalysis.sceneBreakdown && metadata.videoAnalysis.sceneBreakdown.length > 0) {
        console.log('\n🎭 Scenes Found:');
        metadata.videoAnalysis.sceneBreakdown.forEach((scene, index) => {
          console.log(`  ${index + 1}. ${scene.startTime}s-${scene.endTime}s: ${scene.description}`);
          console.log(`     Setting: ${scene.setting}, Actions: ${scene.actions.join(', ')}`);
        });
      }
    }
    
    // Check if metadata extraction failed
    if (metadata.processingStatus === 'error') {
      console.log('\n❌ ISSUE IDENTIFIED: Metadata extraction failed');
      console.log(`   Error: ${metadata.errorMessage}`);
      return metadata;
    }
    
    // Prepare for pitch generation
    if (!metadata.id) {
      metadata.id = 'test-failing-' + Date.now().toString(36);
    }
    if (!metadata.type) {
      metadata.type = 'youtube';
    }
    
    console.log('\n📋 Step 2: Processing reference content for pitch generation...');
    
    const pitchStartTime = Date.now();
    const result = await processReferenceContent(
      metadata as any,  // Cast to ReferenceSource
      'cinematic',      // targetStyle
      'zh-TW',          // targetLanguage
      true              // useStructuredOutput
    );
    const pitchTime = Date.now() - pitchStartTime;
    
    console.log('\n✅ Pitch generation completed in', pitchTime + 'ms');
    console.log('📊 Result structure:');
    console.log(`  - Generated pitch length: ${result.generatedPitch.length}`);
    console.log(`  - Content quality: ${result.contentQuality}`);
    console.log(`  - Warning: ${result.warning || 'None'}`);
    console.log(`  - Is structured output: ${result.isStructuredOutput || false}`);
    console.log(`  - Structured pitch available: ${!!result.structuredPitch}`);
    
    console.log('\n📝 Generated Pitch Preview:');
    console.log('-' .repeat(40));
    console.log(result.generatedPitch.substring(0, 500) + (result.generatedPitch.length > 500 ? '...' : ''));
    console.log('-' .repeat(40));
    
    // Analysis for potential issues
    console.log('\n🔍 Issue Analysis:');
    
    if (result.generatedPitch.length < 200) {
      console.log('❌ ISSUE: Generated pitch is too short (< 200 chars)');
    } else {
      console.log('✅ Pitch length is adequate');
    }
    
    if (result.warning) {
      console.log(`⚠️  WARNING DETECTED: ${result.warning}`);
    }
    
    if (result.contentQuality === 'metadata-only') {
      console.log('❌ ISSUE: Content quality is metadata-only (very limited data)');
    } else {
      console.log(`✅ Content quality is acceptable: ${result.contentQuality}`);
    }
    
    // Check if pitch contains generic fallback language
    const genericPatterns = [
      'live-action',
      'For the baby, gi-hun risks all',
      '影片內容分析',
      '分析失敗',
      'fallback',
      'Very limited information available'
    ];
    
    let hasGenericContent = false;
    genericPatterns.forEach(pattern => {
      if (result.generatedPitch.includes(pattern) || (result.warning && result.warning.includes(pattern))) {
        console.log(`❌ GENERIC CONTENT DETECTED: Contains "${pattern}"`);
        hasGenericContent = true;
      }
    });
    
    if (!hasGenericContent) {
      console.log('✅ Pitch appears to be specifically generated (no generic patterns detected)');
    }
    
    return result;
    
  } catch (error) {
    console.error('\n💥 ERROR OCCURRED:', error);
    
    if (error instanceof Error) {
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error message: ${error.message}`);
      
      // Check for specific error patterns
      if (error.message.includes('quota exceeded')) {
        console.log('\n🔍 ROOT CAUSE: YouTube API quota exceeded');
      } else if (error.message.includes('not found')) {
        console.log('\n🔍 ROOT CAUSE: Video not found or not accessible');
      } else if (error.message.includes('API key')) {
        console.log('\n🔍 ROOT CAUSE: YouTube API configuration issue');
      } else if (error.message.includes('JSON')) {
        console.log('\n🔍 ROOT CAUSE: JSON parsing failure in video analysis or pitch generation');
      } else if (error.message.includes('timeout')) {
        console.log('\n🔍 ROOT CAUSE: Timeout during processing');
      } else if (error.message.includes('Gemini')) {
        console.log('\n🔍 ROOT CAUSE: Gemini API issue during pitch generation');
      } else if (error.message.includes('download')) {
        console.log('\n🔍 ROOT CAUSE: Video download failed');
      } else {
        console.log('\n🔍 ROOT CAUSE: Unknown error - needs investigation');
      }
      
      if (error.stack) {
        console.error('\nStack trace (first 10 lines):');
        console.error(error.stack.split('\n').slice(0, 10).join('\n'));
      }
    }
    
    throw error;
  }
}

// 主执行函数
async function main() {
  console.log('🚀 Starting Specific Shorts Error Analysis\n');
  
  try {
    const result = await testFailingShorts();
    
    console.log('\n🎯 Final Analysis Summary:');
    console.log('=' .repeat(60));
    
    if (result && result.generatedPitch && result.generatedPitch.length > 200) {
      console.log('✅ SUCCESS: Video processed successfully with good pitch quality');
      console.log('   - This URL may not be failing anymore, or the issue was intermittent');
    } else {
      console.log('❌ CONFIRMED ISSUE: Video processing failed or produced poor results');
    }
    
  } catch (error) {
    console.error('\n💥 CONFIRMED FAILURE: Video processing failed');
    console.log('\n📋 Recommended Investigation Areas:');
    console.log('1. Check YouTube API access and quotas');
    console.log('2. Verify video accessibility and region restrictions');
    console.log('3. Review video download compatibility');
    console.log('4. Check Gemini API stability and token limits');
    console.log('5. Examine JSON parsing robustness');
    console.log('6. Test with different retry strategies');
  }
}

// 如果直接运行此文件
if (import.meta.main) {
  main().catch(console.error);
}

export { testFailingShorts };