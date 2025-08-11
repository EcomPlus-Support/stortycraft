/**
 * Simple JavaScript test runner for JSON parsing system
 * Tests the three-tier parsing strategy and AEGIS content
 */

// Import the necessary modules (simplified for Node.js execution)
const fs = require('fs');
const path = require('path');

// Define test data based on AEGIS firefighting content from logs
const AEGIS_FIREFIGHTING_CONTENT = {
  malformedJson: `\`\`\`json
{
 "scenario": "一場加州深山野火迅速蔓延，攝影機從火苗近景拉遠，展示火焰吞噬森林的駭人景象。傳統的應變措施緩慢展開：消防局接到緊急通知，調度人力與消防車艱難地從遠方駛向火場，而空拍鏡頭則突顯了路途遙遠與火勢的失控。就在危機達到頂點時，畫面切換到「AEGIS Autonomous Emergency Guardian Integrated System」的字樣。隨後，AEGIS系統啟動，遍布深山的感測器閃爍紅光，精準偵測火場的溫度、風向與風勢，並發出即時預警。緊接著，數十架AEGIS無人機組成的龐大機隊以驚人的速度衝向火場，遠超地面消防車的速度。第一批無人機精準抵達火勢最猛烈的區域，在預定間隔引爆特製滅火彈，瞬間壓制火勢。緊隨其後，第二批無人機攜帶大量蓄水抵達，對殘餘火點進行精準撲滅，防止火勢復燃。最終，畫面顯示「Detected in Seconds. Extinguished with Precision.」，並以黑底白字的「AEGIS」標誌完美收尾。",
 "genre": "Cinematic",
 "mood": "Inspirational",`,
  
  referenceContent: `\`\`\`json
{
  "analysis": {
    "keyTopics": ["emergency response", "autonomous systems", "firefighting technology", "precision rescue"],
    "sentiment": "inspirational",
    "coreMessage": "AEGIS autonomous emergency response system revolutionizes wildfire suppression through precision technology",
    "targetAudience": "Technology enthusiasts and emergency services professionals"
  },
  "generatedPitch": "一場加州深山野火迅速蔓延，攝影機從火苗近景拉遠，展示火焰吞噬森林的駭人景象。傳統的應變措施緩慢展開：消防局接到緊急通知，調度人力與消防車艱難地從遠方駛向火場，而空拍鏡頭則突顯了路途遙遠與火勢的失控。就在危機達到頂點時，畫面切換到「AEGIS Autonomous Emergency Guardian Integrated System」的字樣。隨後，AEGIS系統啟動，遍布深山的感測器閃爍紅光，精準偵測火場的溫度、風向與風勢，並發出即時預警。緊接著，數十架AEGIS無人機組成的龐大機隊以驚人的速度衝向火場，遠超地面消防車的速度。第一批無人機精準抵達火勢最猛烈的區域，在預定間隔引爆特製滅火彈，瞬間壓制火勢。緊隨其後，第二批無人機攜帶大量蓄水抵達，對殘餘火點進行精準撲滅，防止火勢復燃。最終，畫面顯示「Detected in Seconds. Extinguished with Precision.」，並以黑底白字的「AEGIS」標誌完美收尾。",
  "rationale": "This pitch showcases cutting-edge autonomous emergency response technology through dramatic visual storytelling"
}
\`\`\``
};

// Simplified three-tier parsing strategy implementation
function cleanJsonResponse(text) {
  if (!text || typeof text !== 'string') {
    return '{}';
  }
  
  console.log('Cleaning JSON response, original length:', text.length);
  
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').replace(/```/g, '').trim();
  
  // Remove any potential markdown artifacts
  cleaned = cleaned.replace(/^[\s\n]*```[\s\n]*/g, '').replace(/[\s\n]*```[\s\n]*$/g, '');
  
  // Find JSON object boundaries
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  
  // Remove trailing commas
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  
  return cleaned.trim();
}

function parseWithFallback(text) {
  console.log('🔄 Starting three-tier parsing strategy...');
  
  // Tier 1: Strict parsing
  try {
    console.log('📋 Trying strict parsing...');
    const strictCleaned = cleanJsonResponse(text);
    const strictResult = JSON.parse(strictCleaned);
    console.log('✅ Strict parsing successful');
    return { success: true, data: strictResult };
  } catch (e1) {
    console.warn('⚠️ Strict parsing failed:', e1.message);
  }
  
  // Tier 2: Main branch parsing
  try {
    console.log('📋 Trying main branch parsing...');
    const mainBranchCleaned = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
    const mainBranchResult = JSON.parse(mainBranchCleaned);
    console.log('✅ Main branch parsing successful');
    return { success: true, data: mainBranchResult };
  } catch (e2) {
    console.warn('⚠️ Main branch parsing failed:', e2.message);
  }
  
  // Tier 3: Intelligent repair
  try {
    console.log('📋 Trying intelligent repair...');
    let standardized = text.replace(/```json|```/g, '').trim();
    
    const jsonStart = standardized.indexOf('{');
    const jsonEnd = standardized.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      let repaired = standardized.substring(jsonStart, jsonEnd + 1);
      
      // Smart repair of common issues
      repaired = repaired
        .replace(/,\s*([}\]])/g, '$1')  // Remove trailing commas
        .replace(/\n/g, '\\n')          // Fix line breaks in strings
        .replace(/\r/g, '\\r')          // Fix carriage returns
        .replace(/\t/g, '\\t');         // Fix tabs
      
      const repairedResult = JSON.parse(repaired);
      console.log('✅ Intelligent repair successful');
      return { success: true, data: repairedResult };
    }
  } catch (e3) {
    console.error('❌ All parsing methods failed:', e3.message);
  }
  
  return { 
    success: false, 
    error: {
      title: 'JSON Parsing Failed',
      message: 'Could not parse AI response with any method',
      actionable: 'Will use fallback content generation'
    }
  };
}

// Test execution
function runTests() {
  console.log('🧪 Enhanced JSON Parsing System - Comprehensive Test Suite');
  console.log('='.repeat(80));
  
  const results = [];
  let totalTests = 0;
  let passedTests = 0;
  
  // Test 1: Valid JSON (should pass strict parsing)
  console.log('\n🔬 Test 1: Valid JSON - Strict Parsing');
  console.log('-'.repeat(40));
  totalTests++;
  const validJson = '{"test": "value", "number": 123}';
  const startTime1 = Date.now();
  const result1 = parseWithFallback(validJson);
  const time1 = Date.now() - startTime1;
  
  if (result1.success) {
    passedTests++;
    console.log(`✅ PASS - Valid JSON parsed in ${time1}ms`);
    results.push({ test: 'Valid JSON', status: 'PASS', time: time1, strategy: 'strict' });
  } else {
    console.log(`❌ FAIL - Valid JSON failed: ${result1.error?.message}`);
    results.push({ test: 'Valid JSON', status: 'FAIL', time: time1, strategy: 'none', error: result1.error?.message });
  }
  
  // Test 2: AEGIS Content (reference format)
  console.log('\n🔬 Test 2: AEGIS Reference Content');
  console.log('-'.repeat(40));
  totalTests++;
  const startTime2 = Date.now();
  const result2 = parseWithFallback(AEGIS_FIREFIGHTING_CONTENT.referenceContent);
  const time2 = Date.now() - startTime2;
  
  if (result2.success) {
    passedTests++;
    console.log(`✅ PASS - AEGIS reference content parsed in ${time2}ms`);
    console.log('   Data keys:', Object.keys(result2.data));
    if (result2.data.generatedPitch) {
      console.log(`   Pitch length: ${result2.data.generatedPitch.length} characters`);
      console.log(`   Contains AEGIS: ${result2.data.generatedPitch.includes('AEGIS') ? 'Yes' : 'No'}`);
    }
    results.push({ test: 'AEGIS Reference Content', status: 'PASS', time: time2, strategy: 'tier-fallback' });
  } else {
    console.log(`❌ FAIL - AEGIS reference content failed: ${result2.error?.message}`);
    results.push({ test: 'AEGIS Reference Content', status: 'FAIL', time: time2, strategy: 'none', error: result2.error?.message });
  }
  
  // Test 3: AEGIS Malformed Content (the actual failing case)
  console.log('\n🔬 Test 3: AEGIS Malformed Content (Critical Test)');
  console.log('-'.repeat(40));
  totalTests++;
  const startTime3 = Date.now();
  const result3 = parseWithFallback(AEGIS_FIREFIGHTING_CONTENT.malformedJson);
  const time3 = Date.now() - startTime3;
  
  if (result3.success) {
    passedTests++;
    console.log(`✅ PASS - AEGIS malformed content repaired in ${time3}ms`);
    console.log('   Data keys:', Object.keys(result3.data));
    if (result3.data.scenario) {
      console.log(`   Scenario length: ${result3.data.scenario.length} characters`);
      console.log(`   Contains AEGIS: ${result3.data.scenario.includes('AEGIS') ? 'Yes' : 'No'}`);
    }
    results.push({ test: 'AEGIS Malformed Content', status: 'PASS', time: time3, strategy: 'intelligent-repair' });
  } else {
    console.log(`❌ FAIL - AEGIS malformed content failed: ${result3.error?.message}`);
    results.push({ test: 'AEGIS Malformed Content', status: 'FAIL', time: time3, strategy: 'none', error: result3.error?.message });
  }
  
  // Test 4: Main Branch Compatibility
  console.log('\n🔬 Test 4: Main Branch Compatibility');
  console.log('-'.repeat(40));
  totalTests++;
  const mainBranchFormat = '```json\n{"test": "value", "trailing": "comma",}\n```';
  const startTime4 = Date.now();
  const result4 = parseWithFallback(mainBranchFormat);
  const time4 = Date.now() - startTime4;
  
  if (result4.success) {
    passedTests++;
    console.log(`✅ PASS - Main branch format parsed in ${time4}ms`);
    results.push({ test: 'Main Branch Compatibility', status: 'PASS', time: time4, strategy: 'main-branch' });
  } else {
    console.log(`❌ FAIL - Main branch format failed: ${result4.error?.message}`);
    results.push({ test: 'Main Branch Compatibility', status: 'FAIL', time: time4, strategy: 'none', error: result4.error?.message });
  }
  
  // Test 5: Edge Case - Completely Invalid
  console.log('\n🔬 Test 5: Edge Case - Invalid Content');
  console.log('-'.repeat(40));
  totalTests++;
  const invalidContent = 'This is definitely not JSON at all!!!';
  const startTime5 = Date.now();
  const result5 = parseWithFallback(invalidContent);
  const time5 = Date.now() - startTime5;
  
  if (!result5.success) {
    passedTests++; // Success means it correctly failed
    console.log(`✅ PASS - Invalid content correctly rejected in ${time5}ms`);
    results.push({ test: 'Invalid Content Edge Case', status: 'PASS', time: time5, strategy: 'correctly-failed' });
  } else {
    console.log(`❌ FAIL - Invalid content incorrectly parsed: ${JSON.stringify(result5.data)}`);
    results.push({ test: 'Invalid Content Edge Case', status: 'FAIL', time: time5, strategy: 'false-positive', error: 'Should have failed but succeeded' });
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  const successRate = (passedTests / totalTests) * 100;
  const totalTime = results.reduce((sum, r) => sum + r.time, 0);
  const avgTime = totalTime / totalTests;
  
  console.log(`\n🎯 Overall Results:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests} ✅`);
  console.log(`   Failed: ${totalTests - passedTests} ❌`);
  console.log(`   Success Rate: ${successRate.toFixed(2)}%`);
  console.log(`   Total Time: ${totalTime}ms`);
  console.log(`   Average Time: ${avgTime.toFixed(2)}ms`);
  
  console.log(`\n📈 Detailed Results:`);
  results.forEach((result, index) => {
    const status = result.status === 'PASS' ? '🟢' : '🔴';
    console.log(`   ${status} Test ${index + 1}: ${result.test}`);
    console.log(`      Strategy: ${result.strategy}, Time: ${result.time}ms`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  });
  
  // Critical Analysis
  console.log(`\n🔍 Critical Analysis:`);
  
  // Check AEGIS tests specifically
  const aegisResults = results.filter(r => r.test.includes('AEGIS'));
  const aegisPassRate = (aegisResults.filter(r => r.status === 'PASS').length / aegisResults.length) * 100;
  
  console.log(`   AEGIS Firefighting Content: ${aegisPassRate.toFixed(0)}% success rate`);
  
  if (aegisPassRate === 100) {
    console.log(`   ✅ AEGIS content parsing RESOLVED - Previously failing content now works!`);
  } else {
    console.log(`   ⚠️ AEGIS content parsing still has issues`);
  }
  
  // Check three-tier strategy effectiveness
  const strategies = {};
  results.forEach(r => {
    strategies[r.strategy] = (strategies[r.strategy] || 0) + 1;
  });
  
  console.log(`   Three-Tier Strategy Usage:`);
  Object.entries(strategies).forEach(([strategy, count]) => {
    console.log(`      ${strategy}: ${count} tests`);
  });
  
  // Performance analysis
  if (avgTime < 50) {
    console.log(`   ✅ Excellent performance: ${avgTime.toFixed(2)}ms average`);
  } else if (avgTime < 200) {
    console.log(`   🟡 Good performance: ${avgTime.toFixed(2)}ms average`);
  } else {
    console.log(`   🔴 Performance needs improvement: ${avgTime.toFixed(2)}ms average`);
  }
  
  // Final verdict
  console.log(`\n🏁 Final Verdict:`);
  if (successRate >= 90 && aegisPassRate >= 100) {
    console.log(`   🎉 EXCELLENT - System ready for production deployment`);
    console.log(`   ✅ AEGIS firefighting content parsing issue RESOLVED`);
  } else if (successRate >= 80) {
    console.log(`   🟡 GOOD - System performing well with minor issues`);
  } else {
    console.log(`   🔴 NEEDS IMPROVEMENT - Critical issues must be addressed`);
  }
  
  console.log('='.repeat(80));
  
  return {
    totalTests,
    passedTests,
    successRate,
    totalTime,
    avgTime,
    results,
    aegisPassRate
  };
}

// Execute tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests, parseWithFallback, cleanJsonResponse };