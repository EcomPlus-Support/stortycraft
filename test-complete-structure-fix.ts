#!/usr/bin/env npx tsx

/**
 * Test script to validate the complete story structure fix
 */

import { generateTextWithGemini } from './lib/gemini-service'

async function testCompleteStructureFix() {
  console.log('🧪 Testing Complete Story Structure Fix');
  console.log('='.repeat(60));
  
  try {
    // Test with YouTube Shorts format
    console.log('\n📺 Test: YouTube Shorts Complete Structure');
    console.log('-'.repeat(40));
    
    const testTitle = '好奇產品賺多少？用這方法馬上知道 #ecomplus #亞馬遜賣家 #跨境電商 #新手必看 #產品利潤 #選品技巧';
    const testContent = '產品利潤怎麼查？公開超低成本貨源。亞馬遜產品月銷78萬，成本僅0.35美金，售價15.99美金。場景: 男子講述利潤, 場景: 男子講述利潤數據. 角色: 男性講者 - 電商專家，分享選品技巧';
    const targetLanguage = '繁體中文';
    const isShorts = true;
    
    const prompt = `你是專業的故事創作專家，需要根據以下YouTube${isShorts ? ' Shorts' : ''}影片內容創作完整的視覺故事腳本：

影片標題：${testTitle}
影片內容：${testContent}
影片類型：${isShorts ? 'YouTube Shorts (30秒以內)' : 'YouTube 長影片'}
目標語言：${targetLanguage}

請創作一個包含以下完整結構的故事腳本：

**角色設定：**
- 主角：年齡、職業、性格特徵、動機目標
- 配角或背景人物：相關角色描述
- 角色關係：人物間的互動動態

**場景描述：**
${isShorts ? `
1. 開場吸引 (0-3秒)：強烈的視覺衝擊或問題提出
2. 內容展開 (3-12秒)：核心信息展示和故事發展  
3. 高潮轉折 (12-22秒)：關鍵發現或情感高點
4. 呼籲行動 (22-30秒)：結論總結和互動引導` : `
1. 開場場景 (0-15秒)：建立背景和吸引注意
2. 發展場景 (15-60秒)：深入展開核心內容
3. 高潮場景 (60-90秒)：關鍵轉折或重要發現
4. 結尾場景 (90-120秒)：總結要點和行動呼籲`}

**視覺風格與拍攝手法：**
- 攝影技巧：鏡頭運用、構圖方式、景深效果
- 色彩搭配：主色調、輔助色彩、情緒營造
- 剪接節奏：快慢節奏搭配、轉場效果
- 特效運用：文字動畫、圖形元素、音效配合

**劇情大綱：**
詳細描述故事的起承轉合，包括：
- 故事背景設定
- 主要衝突或問題
- 解決方案或發現過程
- 最終結果或啟發

**情感曲線設計：**
描述觀眾從開始到結束的情感變化歷程，如：
好奇 → 專注 → 驚喜 → 滿足 → 分享慾望

**病毒傳播潛力：**
- 分享動機：為什麼觀眾會想分享這個內容
- 互動元素：評論引導、參與方式
- 系列潛力：是否適合製作後續內容
- 目標受眾：最有可能產生共鳴的群體

**製作建議：**
- 關鍵拍攝要點
- 後製重點提醒  
- 發布策略建議

請確保內容豐富詳細，字數約400-800字，適合製作成引人入勝的視頻內容。使用${targetLanguage}創作。`;

    const startTime = Date.now();
    const result = await generateTextWithGemini(prompt, {
      temperature: 0.7,
      maxTokens: 4000
    });
    const responseTime = Date.now() - startTime;
    
    console.log('✅ Complete structure generation successful');
    console.log(`   Response time: ${responseTime}ms`);
    console.log(`   Content length: ${result.length} characters`);
    console.log(`   Expected range: 400-800 words (800-2400 chars)`);
    
    // Quality analysis
    const structureElements = {
      hasCharacterSettings: result.includes('角色設定') || result.includes('主角'),
      hasSceneDescription: result.includes('場景描述') || result.includes('開場'),
      hasVisualStyle: result.includes('視覺風格') || result.includes('攝影'),
      hasPlotOutline: result.includes('劇情大綱') || result.includes('故事背景'),
      hasEmotionalCurve: result.includes('情感曲線') || result.includes('好奇'),
      hasViralPotential: result.includes('病毒傳播') || result.includes('分享動機'),
      hasProductionTips: result.includes('製作建議') || result.includes('拍攝要點'),
      isDetailedLength: result.length >= 1000
    };
    
    console.log('\n📊 Structure Elements Analysis:');
    Object.entries(structureElements).forEach(([key, value]) => {
      console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
    });
    
    const structureScore = Object.values(structureElements).filter(Boolean).length;
    console.log(`\n🎯 Structure Completeness Score: ${structureScore}/8`);
    
    if (structureScore >= 7) {
      console.log('✅ Excellent structure - contains all major elements');
    } else if (structureScore >= 5) {
      console.log('⚠️  Good structure - missing some elements');
    } else {
      console.log('❌ Poor structure - major elements missing');
    }
    
    // Show content preview
    console.log('\n📖 Content Preview (first 500 characters):');
    console.log('-'.repeat(40));
    console.log(result.substring(0, 500) + '...');
    
    // Check for specific detailed elements
    console.log('\n🔍 Detailed Elements Check:');
    const detailedElements = {
      hasAgeAndProfession: /\d+歲|年齡|職業|專家|達人/.test(result),
      hasTimeBreakdown: /\d+-\d+秒|\d+秒/.test(result),
      hasSpecificTechniques: /鏡頭|構圖|色彩|剪接/.test(result),
      hasEmotionFlow: /好奇.*專注.*驚喜|情感.*變化/.test(result),
      hasActionableAdvice: /建議|要點|技巧|方法/.test(result)
    };
    
    Object.entries(detailedElements).forEach(([key, value]) => {
      console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
    });
    
    const detailScore = Object.values(detailedElements).filter(Boolean).length;
    console.log(`\n📝 Detail Quality Score: ${detailScore}/5`);
    
    if (structureScore >= 7 && detailScore >= 4 && result.length >= 1000) {
      console.log('\n🎉 SUCCESS: Complete story structure is working perfectly!');
      console.log('   Ready for user testing - should have all required elements.');
    } else {
      console.log('\n⚠️  NEEDS REVIEW: Some elements may need adjustment');
      if (structureScore < 7) console.log('   - Missing structural elements');
      if (detailScore < 4) console.log('   - Lacks detailed content');
      if (result.length < 1000) console.log('   - Content too short');
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

testCompleteStructureFix().catch(console.error);