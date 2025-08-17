#!/usr/bin/env bun
/**
 * 直接測試視頻分析API的JSON完整性
 */

import { GeminiVideoAnalyzer } from './lib/gemini-video-analyzer';
import { Storage } from '@google-cloud/storage';

async function testDirectVideoAnalysis() {
  console.log('🎬 Direct Video Analysis Test');
  console.log('=' .repeat(60));
  
  const analyzer = new GeminiVideoAnalyzer();
  const storage = new Storage({
    projectId: 'fechen-aifactory'
  });
  
  try {
    // 使用一個測試視頻文件（如果存在）
    const testVideoPath = '/Users/shouian99/Desktop/macmbp/saas_app/storycraft-main/temp/shorts/test-video.mp4';
    const testGcsUri = 'gs://storycraft-video-temp/test/sample-video.mp4';
    
    // 創建一個簡化的分析提示
    const simplePrompt = `
分析這個視頻並用JSON格式回答。請確保JSON完整且可解析：

{
  "generatedTranscript": "視頻的完整腳本或對話內容",
  "sceneBreakdown": [
    {
      "startTime": 0,
      "endTime": 10,
      "description": "場景描述",
      "setting": "場景設定",
      "actions": ["動作1"],
      "visualDetails": "視覺細節"
    }
  ],
  "characters": [
    {
      "name": "角色名",
      "description": "外觀描述",
      "role": "角色定位",
      "appearances": [{"startTime": 0, "endTime": 15}],
      "characteristics": "特徵"
    }
  ],
  "contentSummary": "視頻內容總結",
  "confidence": 0.95
}
`;

    // 直接調用內部方法測試
    console.log('📤 Testing with simple prompt...');
    const response = await analyzer['callGeminiVideoAPI'](testGcsUri, simplePrompt, 'test-video');
    
    console.log('\n📊 Response Analysis:');
    console.log(`  - Response length: ${response.length} characters`);
    console.log(`  - Starts with: ${response.substring(0, 50)}...`);
    console.log(`  - Ends with: ...${response.slice(-50)}`);
    console.log(`  - Contains complete JSON: ${response.trim().endsWith('}')}`);
    
    // 嘗試解析
    try {
      const cleanedResponse = response
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
        
      const parsed = JSON.parse(cleanedResponse);
      console.log('\n✅ JSON Parsing Success!');
      console.log(`  - Has transcript: ${!!parsed.generatedTranscript}`);
      console.log(`  - Scenes: ${parsed.sceneBreakdown?.length || 0}`);
      console.log(`  - Characters: ${parsed.characters?.length || 0}`);
      
    } catch (parseError) {
      console.error('\n❌ JSON Parsing Failed');
      console.error('Error:', parseError.message);
      
      // 找出截斷位置
      const lastValidJson = response.lastIndexOf('}');
      const lastOpenBrace = response.lastIndexOf('{');
      console.log(`\n🔍 JSON Structure Analysis:`);
      console.log(`  - Last '}' at position: ${lastValidJson}`);
      console.log(`  - Last '{' at position: ${lastOpenBrace}`);
      console.log(`  - Likely truncated at: ${response.length}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    
    // 如果是因為沒有測試視頻，創建一個模擬測試
    console.log('\n🔄 Running simulation test instead...');
    await runSimulationTest();
  }
}

async function runSimulationTest() {
  console.log('\n🧪 Simulation Test: Testing JSON generation capacity');
  
  const { getVertexAIConfig } = await import('./lib/config');
  const { getAuthManager } = await import('./lib/auth');
  
  const config = getVertexAIConfig();
  const authManager = getAuthManager();
  const accessToken = await authManager.getAccessToken();
  
  // 測試不同大小的JSON生成
  const testSizes = [
    { name: 'Small', targetChars: 5000 },
    { name: 'Medium', targetChars: 10000 },
    { name: 'Large', targetChars: 20000 },
    { name: 'Extra Large', targetChars: 30000 }
  ];
  
  for (const test of testSizes) {
    console.log(`\n📏 Testing ${test.name} JSON (target: ~${test.targetChars} chars)`);
    
    const prompt = `生成一個大約${test.targetChars}字符的完整JSON，描述一個虛構的視頻分析結果。確保JSON格式正確且完整。`;
    
    const response = await fetch(
      `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 32000,
            topP: 0.8,
            topK: 40
          }
        })
      }
    );
    
    const result = await response.json();
    
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = result.candidates[0].content.parts[0].text;
      console.log(`  ✓ Generated: ${text.length} chars`);
      console.log(`  ✓ Complete: ${text.trim().endsWith('}')}`);
      console.log(`  ✓ Tokens used: ${result.usageMetadata?.candidatesTokenCount || 'N/A'}`);
      
      if (!text.trim().endsWith('}')) {
        console.log(`  ⚠️ WARNING: JSON appears truncated!`);
      }
    }
  }
}

async function main() {
  try {
    await testDirectVideoAnalysis();
    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}