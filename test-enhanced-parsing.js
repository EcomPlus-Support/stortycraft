/**
 * Enhanced JSON parsing system test with improved repair strategies
 * Focus on fixing the AEGIS malformed content issue
 */

const fs = require('fs');

// Enhanced AEGIS test content with various malformed scenarios
const TEST_CASES = {
  aegisComplete: `\`\`\`json
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
\`\`\``,
  
  aegisMalformed: `\`\`\`json
{
 "scenario": "一場加州深山野火迅速蔓延，攝影機從火苗近景拉遠，展示火焰吞噬森林的駭人景象。傳統的應變措施緩慢展開：消防局接到緊急通知，調度人力與消防車艱難地從遠方駛向火場，而空拍鏡頭則突顯了路途遙遠與火勢的失控。就在危機達到頂點時，畫面切換到「AEGIS Autonomous Emergency Guardian Integrated System」的字樣。隨後，AEGIS系統啟動，遍布深山的感測器閃爍紅光，精準偵測火場的溫度、風向與風勢，並發出即時預警。緊接著，數十架AEGIS無人機組成的龐大機隊以驚人的速度衝向火場，遠超地面消防車的速度。第一批無人機精準抵達火勢最猛烈的區域，在預定間隔引爆特製滅火彈，瞬間壓制火勢。緊隨其後，第二批無人機攜帶大量蓄水抵達，對殘餘火點進行精準撲滅，防止火勢復燃。最終，畫面顯示「Detected in Seconds. Extinguished with Precision.」，並以黑底白字的「AEGIS」標誌完美收尾。",
 "genre": "Cinematic",
 "mood": "Inspirational",`,
  
  aegisIncomplete: `{
 "scenario": "AEGIS emergency response system test",
 "genre": "Cinematic"`,
  
  aegisWithExtraText: `Here's the JSON response:
{
  "analysis": {
    "keyTopics": ["AEGIS", "firefighting"],
    "sentiment": "positive"
  },
  "generatedPitch": "AEGIS system test pitch"
}
End of response.`,
  
  // Lenient validation test cases
  minimalValid: `{
    "analysis": {
      "keyTopics": ["test"],
      "sentiment": "neutral",
      "coreMessage": "Test message",
      "targetAudience": "General"
    },
    "generatedPitch": "This is a minimal but valid pitch that meets all requirements."
  }`,
  
  withExtraFields: `{
    "analysis": {
      "keyTopics": ["test", "extra"],
      "sentiment": "positive",
      "coreMessage": "Test with extra fields",
      "targetAudience": "Testers",
      "extraField": "should be ignored"
    },
    "generatedPitch": "This pitch has extra fields that should be handled gracefully.",
    "rationale": "Test rationale",
    "unknownField": "ignore me"
  }`,
  
  // Main branch compatibility tests
  simpleJson: `{"test": "value", "number": 123}`,
  trailingComma: `{"test": "value", "number": 123,}`,
  markdownWrapped: `\`\`\`json
{"test": "markdown wrapped", "status": "ok"}
\`\`\``,
  
  // Edge cases
  emptyInput: ``,
  whitespaceOnly: `   \n\t  `,
  invalidSyntax: `This is not JSON at all`,
  largeContent: JSON.stringify({
    analysis: {
      keyTopics: Array(100).fill("keyword"),
      sentiment: "neutral",
      coreMessage: "Large content test".repeat(100),
      targetAudience: "Performance testers"
    },
    generatedPitch: "This is a very long pitch. ".repeat(200)
  })
};

// Enhanced parsing functions
function advancedCleanJsonResponse(text) {
  if (!text || typeof text !== 'string') {
    return '{}';
  }
  
  console.log(`🧹 Cleaning JSON response (length: ${text.length})`);
  
  // Step 1: Remove markdown blocks
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').replace(/```/g, '').trim();
  
  // Step 2: Remove leading/trailing non-JSON text
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  
  // Step 3: Handle trailing commas more aggressively
  cleaned = cleaned
    .replace(/,(\s*[}\]])/g, '$1')  // Standard trailing comma removal
    .replace(/,\s*$/, '');          // Trailing comma at end of content
  
  // Step 4: Fix incomplete JSON structures
  if (cleaned.endsWith(',')) {
    cleaned = cleaned.slice(0, -1); // Remove final trailing comma
  }
  
  // Step 5: Balance braces if incomplete
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;
  
  if (openBraces > closeBraces) {
    const missing = Math.min(openBraces - closeBraces, 3); // Limit to prevent runaway
    cleaned += '}'.repeat(missing);
    console.log(`🔧 Added ${missing} closing brace(s)`);
  }
  
  return cleaned.trim();
}

function enhancedThreeTierParsing(text) {
  console.log('🔄 Starting enhanced three-tier parsing strategy...');
  const repairs = [];
  
  // Tier 1: Strict parsing
  try {
    console.log('📋 Tier 1: Strict parsing...');
    const strictResult = JSON.parse(text);
    console.log('✅ Tier 1 successful (no cleaning needed)');
    return { success: true, data: strictResult, strategy: 'strict', repairs };
  } catch (e1) {
    console.log(`⚠️ Tier 1 failed: ${e1.message.substring(0, 50)}...`);
    repairs.push(`Tier 1 error: ${e1.message}`);
  }
  
  // Tier 2: Basic cleaning
  try {
    console.log('📋 Tier 2: Basic cleaning...');
    const basicCleaned = advancedCleanJsonResponse(text);
    const basicResult = JSON.parse(basicCleaned);
    console.log('✅ Tier 2 successful (basic cleaning)');
    return { success: true, data: basicResult, strategy: 'basic-cleaning', repairs };
  } catch (e2) {
    console.log(`⚠️ Tier 2 failed: ${e2.message.substring(0, 50)}...`);
    repairs.push(`Tier 2 error: ${e2.message}`);
  }
  
  // Tier 3: Advanced repair
  try {
    console.log('📋 Tier 3: Advanced repair...');
    let repaired = text;
    
    // Remove all markdown
    repaired = repaired.replace(/```json|```/g, '').trim();
    
    // Find and extract JSON boundaries more aggressively
    let jsonStart = repaired.indexOf('{');
    let jsonEnd = repaired.lastIndexOf('}');
    
    // If we can't find proper boundaries, try to construct them
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      console.log('🔧 Attempting to construct JSON boundaries...');
      
      // Look for key-value patterns to construct partial JSON
      const patterns = [
        /"[^"]+"\s*:\s*"[^"]*"/g,  // "key": "value"
        /"[^"]+"\s*:\s*\d+/g,      // "key": number
        /"[^"]+"\s*:\s*\[[^\]]*\]/g // "key": [array]
      ];
      
      let reconstructed = '{';
      patterns.forEach(pattern => {
        const matches = repaired.match(pattern);
        if (matches) {
          reconstructed += matches.join(',') + ',';
        }
      });
      
      if (reconstructed.length > 2) {
        reconstructed = reconstructed.slice(0, -1) + '}'; // Remove last comma and close
        repaired = reconstructed;
        console.log('🔧 Reconstructed JSON from patterns');
      }
    } else {
      repaired = repaired.substring(jsonStart, jsonEnd + 1);
    }
    
    // Advanced cleaning
    repaired = repaired
      .replace(/,\s*([}\]])/g, '$1')     // Remove trailing commas
      .replace(/,\s*$/, '')             // Remove trailing comma at end
      .replace(/([^\\])"/g, '$1"')       // Fix unescaped quotes (basic)
      .replace(/\n/g, '\\n')            // Escape newlines in strings
      .replace(/\r/g, '\\r')            // Escape carriage returns
      .replace(/\t/g, '\\t');           // Escape tabs
    
    // Balance braces
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    
    if (openBraces > closeBraces) {
      repaired += '}'.repeat(Math.min(openBraces - closeBraces, 3));
    }
    
    console.log(`🔧 Advanced repair produced: ${repaired.substring(0, 100)}...`);
    
    const repairedResult = JSON.parse(repaired);
    console.log('✅ Tier 3 successful (advanced repair)');
    return { success: true, data: repairedResult, strategy: 'advanced-repair', repairs };
  } catch (e3) {
    console.log(`❌ Tier 3 failed: ${e3.message.substring(0, 50)}...`);
    repairs.push(`Tier 3 error: ${e3.message}`);
  }
  
  console.log('❌ All tiers failed');
  return { 
    success: false, 
    strategy: 'all-failed',
    repairs,
    error: 'All parsing strategies failed'
  };
}

// Lenient validation function
function validateLenient(data) {
  const warnings = [];
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { isValid: false, errors, warnings };
  }
  
  // Check for generatedPitch (most critical)
  if (!data.generatedPitch) {
    errors.push('Missing generatedPitch field');
  } else if (typeof data.generatedPitch !== 'string') {
    errors.push('generatedPitch must be a string');
  } else if (data.generatedPitch.length < 20) {
    warnings.push('generatedPitch is quite short (less than 20 characters)');
  }
  
  // Check analysis object (lenient)
  if (!data.analysis) {
    warnings.push('Missing analysis object - will use defaults');
  } else {
    if (!Array.isArray(data.analysis.keyTopics)) {
      warnings.push('keyTopics should be an array - will extract from content');
    }
    if (!data.analysis.sentiment) {
      warnings.push('Missing sentiment - will default to neutral');
    }
    if (!data.analysis.coreMessage) {
      warnings.push('Missing coreMessage - will generate from content');
    }
    if (!data.analysis.targetAudience) {
      warnings.push('Missing targetAudience - will default to general audience');
    }
  }
  
  // Allow extra fields with warning
  const expectedFields = ['analysis', 'generatedPitch', 'rationale'];
  const extraFields = Object.keys(data).filter(key => !expectedFields.includes(key));
  if (extraFields.length > 0) {
    warnings.push(`Extra fields found (will be ignored): ${extraFields.join(', ')}`);
  }
  
  const isValid = errors.length === 0;
  return { isValid, errors, warnings };
}

// Test execution
function runEnhancedTests() {
  console.log('🧪 Enhanced JSON Parsing System - Advanced Test Suite');
  console.log('='.repeat(80));
  
  const results = [];
  let totalTests = 0;
  let passedTests = 0;
  
  // Test all cases
  const testCases = [
    { name: 'AEGIS Complete Content', content: TEST_CASES.aegisComplete, critical: true },
    { name: 'AEGIS Malformed Content', content: TEST_CASES.aegisMalformed, critical: true },
    { name: 'AEGIS Incomplete Content', content: TEST_CASES.aegisIncomplete, critical: true },
    { name: 'AEGIS With Extra Text', content: TEST_CASES.aegisWithExtraText, critical: false },
    { name: 'Minimal Valid Schema', content: TEST_CASES.minimalValid, critical: false },
    { name: 'Schema With Extra Fields', content: TEST_CASES.withExtraFields, critical: false },
    { name: 'Simple JSON', content: TEST_CASES.simpleJson, critical: false },
    { name: 'Trailing Comma', content: TEST_CASES.trailingComma, critical: false },
    { name: 'Markdown Wrapped', content: TEST_CASES.markdownWrapped, critical: false },
    { name: 'Large Content', content: TEST_CASES.largeContent, critical: false },
    { name: 'Empty Input (should fail)', content: TEST_CASES.emptyInput, critical: false, shouldFail: true },
    { name: 'Invalid Syntax (should fail)', content: TEST_CASES.invalidSyntax, critical: false, shouldFail: true }
  ];
  
  testCases.forEach(testCase => {
    console.log(`\n🔬 Testing: ${testCase.name}`);
    console.log('-'.repeat(50));
    
    totalTests++;
    const startTime = Date.now();
    const result = enhancedThreeTierParsing(testCase.content);
    const parseTime = Date.now() - startTime;
    
    // Validate if parsing succeeded
    let validationResult = { isValid: true, errors: [], warnings: [] };
    if (result.success && result.data) {
      validationResult = validateLenient(result.data);
      
      // Show validation results
      if (validationResult.warnings.length > 0) {
        console.log('⚠️ Validation warnings:', validationResult.warnings);
      }
      if (validationResult.errors.length > 0) {
        console.log('❌ Validation errors:', validationResult.errors);
      }
    }
    
    const success = testCase.shouldFail ? 
      !result.success : // For tests that should fail, success means it correctly failed
      result.success && validationResult.isValid;
    
    if (success) {
      passedTests++;
      console.log(`✅ PASS - ${testCase.name}`);
      console.log(`   Strategy: ${result.strategy}, Time: ${parseTime}ms`);
      
      if (result.data && result.data.generatedPitch) {
        const pitchLength = result.data.generatedPitch.length;
        const hasAegis = result.data.generatedPitch.includes('AEGIS') || 
                        (result.data.scenario && result.data.scenario.includes('AEGIS'));
        console.log(`   Content: ${pitchLength} chars, Contains AEGIS: ${hasAegis ? 'Yes' : 'No'}`);
      }
      
      if (result.data && Object.keys(result.data).length > 0) {
        console.log(`   Data keys: ${Object.keys(result.data).join(', ')}`);
      }
    } else {
      console.log(`❌ FAIL - ${testCase.name}`);
      console.log(`   Strategy: ${result.strategy || 'none'}, Time: ${parseTime}ms`);
      console.log(`   Error: ${result.error || 'Unknown error'}`);
      
      if (result.repairs && result.repairs.length > 0) {
        console.log(`   Repair attempts: ${result.repairs.length}`);
      }
    }
    
    results.push({
      name: testCase.name,
      success,
      critical: testCase.critical,
      parseTime,
      strategy: result.strategy,
      contentLength: testCase.content.length,
      validationWarnings: validationResult.warnings.length,
      validationErrors: validationResult.errors.length,
      repairAttempts: result.repairs ? result.repairs.length : 0
    });
  });
  
  // Generate comprehensive summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 ENHANCED TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  const successRate = (passedTests / totalTests) * 100;
  const totalTime = results.reduce((sum, r) => sum + r.parseTime, 0);
  const avgTime = totalTime / totalTests;
  
  // Critical tests analysis
  const criticalTests = results.filter(r => r.critical);
  const criticalPassed = criticalTests.filter(r => r.success).length;
  const criticalSuccessRate = criticalTests.length > 0 ? (criticalPassed / criticalTests.length) * 100 : 100;
  
  // AEGIS specific analysis
  const aegisTests = results.filter(r => r.name.includes('AEGIS'));
  const aegisPassed = aegisTests.filter(r => r.success).length;
  const aegisSuccessRate = aegisTests.length > 0 ? (aegisPassed / aegisTests.length) * 100 : 100;
  
  console.log(`\n🎯 Overall Results:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests} ✅`);
  console.log(`   Failed: ${totalTests - passedTests} ❌`);
  console.log(`   Success Rate: ${successRate.toFixed(2)}%`);
  console.log(`   Average Parse Time: ${avgTime.toFixed(2)}ms`);
  
  console.log(`\n🔥 AEGIS Firefighting Tests:`);
  console.log(`   AEGIS Tests: ${aegisTests.length}`);
  console.log(`   AEGIS Passed: ${aegisPassed}`);
  console.log(`   AEGIS Success Rate: ${aegisSuccessRate.toFixed(2)}%`);
  
  if (aegisSuccessRate >= 100) {
    console.log(`   🎉 AEGIS ISSUE RESOLVED! All firefighting content tests passing`);
  } else if (aegisSuccessRate >= 75) {
    console.log(`   🟡 AEGIS partially resolved - some edge cases still failing`);
  } else {
    console.log(`   🔴 AEGIS issue persists - critical parsing failures remain`);
  }
  
  console.log(`\n⚡ Critical Tests:`);
  console.log(`   Critical Tests: ${criticalTests.length}`);
  console.log(`   Critical Passed: ${criticalPassed}`);
  console.log(`   Critical Success Rate: ${criticalSuccessRate.toFixed(2)}%`);
  
  // Strategy analysis
  const strategies = {};
  results.forEach(r => {
    strategies[r.strategy] = (strategies[r.strategy] || 0) + 1;
  });
  
  console.log(`\n🔧 Three-Tier Strategy Usage:`);
  Object.entries(strategies).forEach(([strategy, count]) => {
    const percentage = (count / totalTests * 100).toFixed(1);
    console.log(`   ${strategy}: ${count} tests (${percentage}%)`);
  });
  
  // Performance analysis
  console.log(`\n⚡ Performance Analysis:`);
  if (avgTime < 10) {
    console.log(`   🟢 Excellent performance: ${avgTime.toFixed(2)}ms average`);
  } else if (avgTime < 100) {
    console.log(`   🟡 Good performance: ${avgTime.toFixed(2)}ms average`);
  } else {
    console.log(`   🔴 Performance needs improvement: ${avgTime.toFixed(2)}ms average`);
  }
  
  const maxTime = Math.max(...results.map(r => r.parseTime));
  const minTime = Math.min(...results.map(r => r.parseTime));
  console.log(`   Time range: ${minTime}ms - ${maxTime}ms`);
  
  // Final assessment
  console.log(`\n🏁 Final Assessment:`);
  
  if (aegisSuccessRate >= 100 && criticalSuccessRate >= 90 && successRate >= 90) {
    console.log(`   🎉 EXCELLENT - All critical issues resolved, system ready for production`);
    console.log(`   ✅ AEGIS firefighting content parsing fully working`);
    console.log(`   ✅ Three-tier parsing strategy effective`);
    console.log(`   ✅ Main branch compatibility maintained`);
  } else if (aegisSuccessRate >= 75 && successRate >= 80) {
    console.log(`   🟡 GOOD - Major improvements achieved, minor issues remain`);
    if (aegisSuccessRate < 100) {
      console.log(`   ⚠️ AEGIS content partially resolved (${aegisSuccessRate.toFixed(0)}%)`);
    }
  } else {
    console.log(`   🔴 NEEDS WORK - Critical issues remain unresolved`);
    console.log(`   ❌ AEGIS content parsing still problematic`);
  }
  
  // Recommendations
  console.log(`\n📋 Recommendations:`);
  if (aegisSuccessRate < 100) {
    console.log(`   1. Improve handling of incomplete JSON structures`);
    console.log(`   2. Enhance pattern recognition for partial content reconstruction`);
    console.log(`   3. Add more sophisticated brace balancing algorithms`);
  }
  
  if (avgTime > 50) {
    console.log(`   4. Optimize parsing performance for better response times`);
  }
  
  if (successRate < 95) {
    console.log(`   5. Strengthen edge case handling`);
    console.log(`   6. Improve error recovery mechanisms`);
  }
  
  console.log('='.repeat(80));
  
  return {
    totalTests,
    passedTests,
    successRate,
    aegisSuccessRate,
    criticalSuccessRate,
    avgTime,
    results
  };
}

// Execute tests
if (require.main === module) {
  runEnhancedTests();
}

module.exports = { runEnhancedTests, enhancedThreeTierParsing, validateLenient };