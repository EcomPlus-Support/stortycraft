#!/usr/bin/env bun
/**
 * 修復視頻分析提示以避免截斷
 */

// 測試更簡潔的提示
const CONCISE_PROMPT = `
分析此YouTube Shorts視頻，以JSON格式回答。保持簡潔但完整：

{
  "generatedTranscript": "視頻中的對話和旁白內容",
  "sceneBreakdown": [
    {
      "time": "0-10s",
      "description": "場景內容",
      "key": "關鍵元素"
    }
  ],
  "characters": [
    {
      "name": "角色名或描述",
      "trait": "主要特徵"
    }
  ],
  "mood": "整體氛圍",
  "contentSummary": "50字內的核心內容總結",
  "confidence": 0.9
}

重要：保持輸出簡潔，總字數控制在5000字內。
`;

console.log('📝 New Concise Prompt:');
console.log(CONCISE_PROMPT);
console.log('\n字符數:', CONCISE_PROMPT.length);

// 建議的修改
console.log('\n🔧 建議的修改方案：');
console.log('1. 簡化分析提示，減少要求的細節');
console.log('2. 設置合理的token限制（8192）');
console.log('3. 實施分段分析策略');
console.log('4. 優化JSON結構，去除冗餘欄位');

export { CONCISE_PROMPT };