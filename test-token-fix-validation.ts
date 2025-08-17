#!/usr/bin/env npx tsx

/**
 * Test script to validate the token fix and ensure no fallback issues
 */

import { generateTextWithGemini } from './lib/gemini-service'

async function testTokenFix() {
  console.log('🧪 Testing Token Fix - Validation');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Simple Chinese story generation
    console.log('\n📝 Test 1: Simple Chinese Story Generation');
    console.log('-'.repeat(40));
    
    const simplePrompt = `請根據以下內容創作一個引人入勝的故事：

主題：科技創新改變生活
要求：
1. 使用繁體中文
2. 故事長度約200-300字
3. 包含具體的角色和情節
4. 展現正面的科技影響

請開始創作：`;

    const startTime1 = Date.now();
    const result1 = await generateTextWithGemini(simplePrompt, {
      temperature: 0.7,
      maxTokens: 4000
    });
    const responseTime1 = Date.now() - startTime1;
    
    console.log('✅ Story generated successfully');
    console.log(`   Response time: ${responseTime1}ms`);
    console.log(`   Story length: ${result1.length} characters`);
    console.log(`   Story preview: "${result1.substring(0, 100)}..."`);
    
    if (result1.length < 100) {
      console.log('❌ Story too short - might indicate token issues');
    } else if (result1.includes('基於您提供的')) {
      console.log('❌ Using fallback template - token fix may not be working');
    } else {
      console.log('✅ Story appears to be properly generated (no fallback)');
    }

    // Test 2: Complex YouTube-style prompt
    console.log('\n📺 Test 2: YouTube-style Complex Prompt');
    console.log('-'.repeat(40));
    
    const complexPrompt = `基於以下YouTube內容，創作一個引人入勝的故事：

標題: "AI革命：未來生活的無限可能"
描述: "探索人工智能如何徹底改變我們的日常生活，從智能家居到自動駕駛，看見科技創新的驚人力量。"
內容類型: YouTube Shorts
目標語言: 繁體中文

請創作一個完整的故事，要求：
- 長度約250-400字
- 包含具體的主角和情節發展
- 展現AI技術的實際應用場景
- 情節生動有趣，適合視覺化呈現
- 結尾要有啟發性

創作一個能夠吸引觀眾並且適合製作成視頻的故事內容。`;

    const startTime2 = Date.now();
    const result2 = await generateTextWithGemini(complexPrompt, {
      temperature: 0.8,
      maxTokens: 4000
    });
    const responseTime2 = Date.now() - startTime2;
    
    console.log('✅ Complex story generated successfully');
    console.log(`   Response time: ${responseTime2}ms`);
    console.log(`   Story length: ${result2.length} characters`);
    console.log(`   Story preview: "${result2.substring(0, 150)}..."`);
    
    // Quality analysis
    const qualityMetrics = {
      hasProperLength: result2.length >= 250,
      containsCharacter: result2.includes('主角') || result2.includes('角色') || /[A-Za-z\u4e00-\u9fff]{2,4}(?=的|說|想|做)/.test(result2),
      containsAI: result2.includes('AI') || result2.includes('人工智能') || result2.includes('智能'),
      notFallback: !result2.includes('基於您提供的') && !result2.includes('這是一個關於'),
      hasNarrative: result2.includes('故事') || result2.includes('情節') || result2.includes('發生')
    };
    
    console.log('\n📊 Quality Metrics:');
    Object.entries(qualityMetrics).forEach(([key, value]) => {
      console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
    });
    
    const qualityScore = Object.values(qualityMetrics).filter(Boolean).length;
    console.log(`\n🎯 Overall Quality Score: ${qualityScore}/5`);
    
    if (qualityScore >= 4) {
      console.log('✅ High quality story generation - token fix appears successful');
    } else if (qualityScore >= 3) {
      console.log('⚠️  Moderate quality - some improvement needed');
    } else {
      console.log('❌ Low quality - token fix may need further adjustment');
    }

    // Test 3: Edge case - very long prompt
    console.log('\n🚀 Test 3: Long Content Processing');
    console.log('-'.repeat(40));
    
    const longPrompt = `基於以下詳細的YouTube內容，創作一個引人入勝的故事：

標題: "數位轉型時代：小企業的生存與突破"
描述: "在這個快速變化的數位世界中，傳統小企業如何運用科技創新，從困境中找到新的商機與發展方向。"
詳細內容: "影片展示了一位年輕創業者李明，如何運用人工智能、大數據分析、社群媒體行銷等現代科技工具，將其家族經營50年的傳統文具店轉型為現代化的線上線下整合商店。過程中遇到了技術學習的困難、員工抗拒改變、資金投入的壓力，但最終透過持續學習和創新思維，成功開創了新的商業模式，不僅保留了傳統文具店的人情味，更融入了現代科技的便利性。"
主要角色: 李明（28歲，第二代接班人）、李爸（55歲，傳統思維）、小雅（25歲，數位原住民）
關鍵場景: 老店面、現代辦公室、線上會議、顧客服務場景
核心訊息: 傳統與創新的完美結合，科技賦能小企業
目標語言: 繁體中文

請創作一個完整的故事，要求：
- 長度約400-600字
- 詳細描述角色性格和成長變化
- 展現傳統與科技融合的過程
- 包含具體的衝突和解決方案
- 情節要有張力和轉折
- 結尾要有深刻的啟發和希望

創作一個能夠深深打動觀眾，展現創業精神和科技力量的精彩故事。`;

    const startTime3 = Date.now();
    const result3 = await generateTextWithGemini(longPrompt, {
      temperature: 0.8,
      maxTokens: 4000
    });
    const responseTime3 = Date.now() - startTime3;
    
    console.log('✅ Long content story generated successfully');
    console.log(`   Response time: ${responseTime3}ms`);
    console.log(`   Story length: ${result3.length} characters`);
    console.log(`   Expected range: 400-600 characters`);
    console.log(`   Length adequate: ${result3.length >= 400 ? '✅' : '❌'}`);
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('🏁 Token Fix Validation Summary');
    console.log('='.repeat(50));
    
    const allTests = [
      { name: 'Simple Generation', length: result1.length, time: responseTime1 },
      { name: 'Complex Generation', length: result2.length, time: responseTime2 },
      { name: 'Long Content', length: result3.length, time: responseTime3 }
    ];
    
    console.log('\n📊 Test Results:');
    allTests.forEach((test, index) => {
      const adequate = test.length >= 200;
      const fast = test.time < 15000;
      console.log(`   Test ${index + 1} (${test.name}):`);
      console.log(`     ${adequate ? '✅' : '❌'} Length: ${test.length} chars (adequate: ${adequate})`);
      console.log(`     ${fast ? '✅' : '⚠️'} Speed: ${test.time}ms (fast: ${fast})`);
    });
    
    const allLengthsAdequate = allTests.every(t => t.length >= 200);
    const noFallbacks = ![result1, result2, result3].some(r => r.includes('基於您提供的'));
    
    console.log('\n🎯 Overall Assessment:');
    console.log(`   ${allLengthsAdequate ? '✅' : '❌'} All stories have adequate length`);
    console.log(`   ${noFallbacks ? '✅' : '❌'} No fallback templates detected`);
    console.log(`   Average length: ${Math.round(allTests.reduce((sum, t) => sum + t.length, 0) / allTests.length)} characters`);
    
    if (allLengthsAdequate && noFallbacks) {
      console.log('\n🎉 SUCCESS: Token fix validation passed!');
      console.log('   Ready for user testing - fallback issues should be resolved.');
    } else {
      console.log('\n⚠️  NEEDS REVIEW: Some issues detected');
      console.log('   May need further token adjustment or prompt optimization.');
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

testTokenFix().catch(console.error);