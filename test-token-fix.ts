#!/usr/bin/env bun
/**
 * 🧪 Test Token Limit Fix
 * 
 * 測試加倍token限制是否修復了JSON截斷問題
 */

import { getVertexAIConfig } from './lib/config';
import { getAuthManager } from './lib/auth';
import { logger } from './lib/logger';

async function testTokenLimitFix() {
  console.log('🚀 Testing Token Limit Fix');
  console.log('=' .repeat(60));
  
  const config = getVertexAIConfig();
  const authManager = getAuthManager();
  
  try {
    // 獲取訪問令牌
    const accessToken = await authManager.getAccessToken();
    console.log('✅ Access token obtained');
    
    // 創建一個測試請求，要求生成長內容
    const testPrompt = `
請生成一個非常詳細的JSON格式的故事內容，包含以下所有元素。
這是為了測試token限制，請確保輸出盡可能詳細和完整：

{
  "title": "詳細的故事標題",
  "characters": [
    // 至少包含5個角色，每個角色需要詳細描述
  ],
  "scenes": [
    // 至少包含10個場景，每個場景需要完整描述
  ],
  "dialogues": [
    // 至少包含20段對話
  ],
  "visualElements": [
    // 至少包含15個視覺元素描述
  ],
  "detailedPlot": "非常詳細的劇情描述，至少2000字",
  "themes": ["主題1", "主題2", "主題3"],
  "mood": "詳細的氛圍描述",
  "technicalNotes": "技術拍攝建議的詳細說明"
}

請生成一個關於「魷魚遊戲」主題的完整內容，確保所有內容都是詳細且完整的。
`;

    // 使用新的16000 token限制調用API
    const requestBody = {
      contents: [{
        role: 'user',
        parts: [{ text: testPrompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 32000,  // 新的token限制
        topP: 0.8,
        topK: 40
      }
    };
    
    console.log('📤 Sending request with maxOutputTokens: 32000');
    
    const response = await fetch(
      `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
      const generatedText = result.candidates[0].content.parts[0].text;
      
      console.log('\\n📊 Response Analysis:');
      console.log(`  - Response length: ${generatedText.length} characters`);
      console.log(`  - Contains complete JSON: ${generatedText.trim().endsWith('}')}`);
      console.log(`  - Token usage: ${result.usageMetadata?.candidatesTokenCount || 'N/A'} tokens`);
      
      // 嘗試解析JSON
      try {
        const cleanedText = generatedText
          .replace(/```json\\s*/g, '')
          .replace(/```\\s*/g, '')
          .trim();
          
        const parsed = JSON.parse(cleanedText);
        
        console.log('\\n✅ JSON Parsing Success!');
        console.log(`  - Title: ${parsed.title || 'N/A'}`);
        console.log(`  - Characters: ${parsed.characters?.length || 0}`);
        console.log(`  - Scenes: ${parsed.scenes?.length || 0}`);
        console.log(`  - Dialogues: ${parsed.dialogues?.length || 0}`);
        console.log(`  - Plot length: ${parsed.detailedPlot?.length || 0} chars`);
        
        if (generatedText.length > 10000) {
          console.log('\\n🎉 SUCCESS: Generated content exceeds 10k chars without truncation!');
          console.log('The token limit increase has resolved the JSON truncation issue.');
        }
        
      } catch (parseError) {
        console.error('\\n❌ JSON Parsing Failed:', parseError);
        console.log('Last 200 chars:', generatedText.slice(-200));
        
        // 檢查是否在特定位置截斷
        if (parseError instanceof SyntaxError && parseError.message.includes('position')) {
          const position = parseError.message.match(/position (\\d+)/)?.[1];
          console.log(`\\n🔍 Error at position: ${position}`);
          if (position) {
            const errorPos = parseInt(position);
            console.log(`Context around error:`, generatedText.slice(errorPos - 50, errorPos + 50));
          }
        }
      }
      
    } else {
      console.error('❌ No valid response from API');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// 主執行函數
async function main() {
  console.log('🧪 Token Limit Fix Verification\\n');
  
  try {
    await testTokenLimitFix();
    
    console.log('\\n📝 Summary:');
    console.log('The token limit has been increased from 8000 to 16000.');
    console.log('This should prevent JSON truncation for video analysis responses.');
    
  } catch (error) {
    console.error('Critical failure:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}