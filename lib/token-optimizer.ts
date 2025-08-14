/**
 * Token optimization logic for adaptive content processing
 */

import { ContentComplexity, ContentType, ShortsStyle } from './content-analyzer'

// Configuration constants - can be moved to environment variables later
export const TOKEN_CONFIG = {
  BASE_TOKENS: 2000,
  MAX_TOKENS: 8000,
  SHORTS_MAX_TOKENS: 3200,
  MIN_TOKENS: 1000,
  BASE_TIMEOUT: 60000,
  EXTENDED_TIMEOUT: 90000,
  BASE_TEMPERATURE: 0.3,
  CREATIVE_TEMPERATURE: 0.4,
  MAX_TRANSCRIPT_BONUS: 1500,
  MAX_DESCRIPTION_BONUS: 400
}

export interface TokenAllocation {
  maxTokens: number
  temperature: number
  timeout: number
  reasoning: string
}

/**
 * Calculate optimal token allocation based on content complexity
 */
export function calculateOptimalTokens(complexity: ContentComplexity): TokenAllocation {
  try {
    // Validate input
    if (!complexity || typeof complexity !== 'object') {
      throw new Error('Invalid complexity object')
    }
    
    let baseTokens = TOKEN_CONFIG.BASE_TOKENS
    let temperature = TOKEN_CONFIG.BASE_TEMPERATURE
    let timeout = TOKEN_CONFIG.BASE_TIMEOUT
    let reasoning = ''
    
    // YouTube Shorts 特殊處理
    if (complexity.isShorts) {
      const allocation = calculateShortsTokens(complexity)
      return {
        ...allocation,
        reasoning: `YouTube Shorts (${complexity.shortsStyle}): ${allocation.reasoning}`
      }
    }
    
    // 一般影片處理 - 使用配置常數
    switch (complexity.contentType) {
      case ContentType.YOUTUBE_MEDIUM:
        baseTokens = Math.round(TOKEN_CONFIG.BASE_TOKENS * 1.75) // 3500
        reasoning = 'Medium YouTube video (60-300s)'
        break
        
      case ContentType.YOUTUBE_LONG_FORM:
        const durationMinutes = Math.max(0, complexity.duration) / 60
        baseTokens = durationMinutes > 20 ? 
          Math.round(TOKEN_CONFIG.BASE_TOKENS * 3) : // 6000
          Math.round(TOKEN_CONFIG.BASE_TOKENS * 2.25) // 4500
        reasoning = `Long-form YouTube video (${Math.round(durationMinutes)}min)`
        break
        
      case ContentType.TEXT_INPUT:
        baseTokens = Math.round(TOKEN_CONFIG.BASE_TOKENS * 2) // 4000
        reasoning = 'Text input content'
        break
        
      case ContentType.AUDIO_UPLOAD:
        baseTokens = Math.round(TOKEN_CONFIG.BASE_TOKENS * 2.25) // 4500
        reasoning = 'Audio upload content'
        break
        
      default:
        baseTokens = Math.round(TOKEN_CONFIG.BASE_TOKENS * 1.5) // 3000
        reasoning = 'Default allocation'
    }
    
    // 複雜度調整 - 使用安全的邊界檢查
    const adjustments = calculateComplexityAdjustments(complexity)
    const finalTokens = Math.max(
      TOKEN_CONFIG.MIN_TOKENS,
      Math.min(baseTokens + adjustments.tokenBonus, TOKEN_CONFIG.MAX_TOKENS)
    )
    
    // 溫度調整 - 複雜內容使用稍高溫度增加創意
    if (complexity.topicsComplexity === 'complex') {
      temperature = TOKEN_CONFIG.CREATIVE_TEMPERATURE
    }
    
    // 超時調整 - 複雜內容需要更多時間
    if (finalTokens > 5000) {
      timeout = TOKEN_CONFIG.EXTENDED_TIMEOUT
    }
    
    return {
      maxTokens: finalTokens,
      temperature,
      timeout,
      reasoning: `${reasoning} + ${adjustments.reasoning} = ${finalTokens} tokens`
    }
  } catch (error) {
    console.warn('Error calculating optimal tokens:', error)
    // Return safe fallback allocation
    return {
      maxTokens: TOKEN_CONFIG.BASE_TOKENS,
      temperature: TOKEN_CONFIG.BASE_TEMPERATURE,
      timeout: TOKEN_CONFIG.BASE_TIMEOUT,
      reasoning: 'Fallback allocation due to calculation error'
    }
  }
}

/**
 * Calculate token allocation specifically for YouTube Shorts
 */
function calculateShortsTokens(complexity: ContentComplexity): Omit<TokenAllocation, 'reasoning'> & { reasoning: string } {
  try {
    let baseTokens = TOKEN_CONFIG.BASE_TOKENS
    let temperature = TOKEN_CONFIG.BASE_TEMPERATURE
    let reasoning = ''
    
    // 基於 Shorts 類型的基礎分配 - 使用配置常數
    switch (complexity.shortsStyle) {
      case ShortsStyle.QUICK_TIPS:
        baseTokens = Math.round(TOKEN_CONFIG.BASE_TOKENS * 1.2) // 2400
        reasoning = 'Quick tips need detailed step descriptions'
        break
        
      case ShortsStyle.STORY:
        baseTokens = Math.round(TOKEN_CONFIG.BASE_TOKENS * 1.4) // 2800
        reasoning = 'Story format requires complete narrative arc'
        temperature = TOKEN_CONFIG.CREATIVE_TEMPERATURE // 故事需要更多創意
        break
        
      case ShortsStyle.VIRAL:
        baseTokens = TOKEN_CONFIG.BASE_TOKENS // 2000
        reasoning = 'Viral content focuses on hook and shareability'
        break
        
      case ShortsStyle.EDUCATIONAL:
        baseTokens = Math.round(TOKEN_CONFIG.BASE_TOKENS * 1.3) // 2600
        reasoning = 'Educational content needs clear explanations'
        break
        
      case ShortsStyle.ENTERTAINMENT:
        baseTokens = Math.round(TOKEN_CONFIG.BASE_TOKENS * 1.2) // 2400
        reasoning = 'Entertainment content balances fun and engagement'
        temperature = TOKEN_CONFIG.CREATIVE_TEMPERATURE
        break
        
      default:
        baseTokens = Math.round(TOKEN_CONFIG.BASE_TOKENS * 1.2) // 2400
        reasoning = 'Default Shorts allocation'
    }
    
    // Shorts 特定調整 - 使用安全的邊界檢查
    if (complexity.hasTranscript) {
      baseTokens += 300
      reasoning += ' +300 (has transcript)'
    }
    
    const descriptionLength = Math.max(0, complexity.descriptionLength || 0)
    if (descriptionLength > 200) {
      const bonus = Math.min(200, Math.floor(descriptionLength / 10))
      baseTokens += bonus
      reasoning += ` +${bonus} (detailed description)`
    }
    
    if (complexity.topicsComplexity === 'complex') {
      baseTokens += 400
      reasoning += ' +400 (complex topics)'
    } else if (complexity.topicsComplexity === 'moderate') {
      baseTokens += 200
      reasoning += ' +200 (moderate complexity)'
    }
    
    // Shorts 嚴格限制和邊界檢查
    const finalTokens = Math.max(
      TOKEN_CONFIG.MIN_TOKENS,
      Math.min(baseTokens, TOKEN_CONFIG.SHORTS_MAX_TOKENS)
    )
    
    return {
      maxTokens: finalTokens,
      temperature,
      timeout: TOKEN_CONFIG.BASE_TIMEOUT,
      reasoning
    }
  } catch (error) {
    console.warn('Error calculating Shorts tokens:', error)
    // Return safe fallback for Shorts
    return {
      maxTokens: Math.round(TOKEN_CONFIG.BASE_TOKENS * 1.1), // 2200
      temperature: TOKEN_CONFIG.BASE_TEMPERATURE,
      timeout: TOKEN_CONFIG.BASE_TIMEOUT,
      reasoning: 'Fallback Shorts allocation due to calculation error'
    }
  }
}

/**
 * Calculate complexity-based adjustments for regular content
 */
function calculateComplexityAdjustments(complexity: ContentComplexity): {
  tokenBonus: number
  reasoning: string
} {
  try {
    let tokenBonus = 0
    const adjustments: string[] = []
    
    // 字幕獎勵 - 有完整字幕的內容可以生成更詳細的pitch
    // 使用安全的邊界檢查和配置常數
    if (complexity.hasTranscript && complexity.transcriptLength > 0) {
      const safeTranscriptLength = Math.max(0, Math.min(complexity.transcriptLength, 100000)) // Cap at 100KB
      const transcriptBonus = Math.min(
        Math.floor(safeTranscriptLength / 200), 
        TOKEN_CONFIG.MAX_TRANSCRIPT_BONUS
      )
      tokenBonus += transcriptBonus
      adjustments.push(`+${transcriptBonus} (transcript: ${safeTranscriptLength} chars)`)
    }
    
    // 主題複雜度獎勵 - 使用配置常數
    switch (complexity.topicsComplexity) {
      case 'complex':
        tokenBonus += 1000
        adjustments.push('+1000 (complex topics)')
        break
      case 'moderate':
        tokenBonus += 500
        adjustments.push('+500 (moderate complexity)')
        break
    }
    
    // 敘事結構獎勵
    switch (complexity.narrativeStructure) {
      case 'multi_layered':
        tokenBonus += 800
        adjustments.push('+800 (multi-layered narrative)')
        break
      case 'abstract':
        tokenBonus += 600
        adjustments.push('+600 (abstract concepts)')
        break
    }
    
    // 視覺複雜度獎勵
    if (complexity.visualComplexity === 'highly_dynamic') {
      tokenBonus += 300
      adjustments.push('+300 (highly dynamic visuals)')
    }
    
    // 描述長度獎勵 - 詳細描述幫助生成更好的pitch
    // 使用安全的邊界檢查
    const safeDescriptionLength = Math.max(0, complexity.descriptionLength || 0)
    if (safeDescriptionLength > 500) {
      const descBonus = Math.min(
        Math.floor(safeDescriptionLength / 100), 
        TOKEN_CONFIG.MAX_DESCRIPTION_BONUS
      )
      tokenBonus += descBonus
      adjustments.push(`+${descBonus} (detailed description)`)
    }
    
    // 總額安全檢查
    const safeTotalBonus = Math.max(0, Math.min(tokenBonus, TOKEN_CONFIG.MAX_TOKENS / 2))
    
    return {
      tokenBonus: safeTotalBonus,
      reasoning: adjustments.length > 0 ? adjustments.join(' ') : 'No complexity adjustments'
    }
  } catch (error) {
    console.warn('Error calculating complexity adjustments:', error)
    return {
      tokenBonus: 0,
      reasoning: 'Error in complexity calculation - using base tokens'
    }
  }
}

/**
 * Generate content-type specific prompts
 */
export function generateOptimizedPrompt(
  complexity: ContentComplexity,
  basePrompt: string,
  targetStyle?: string,
  targetLanguage?: string
): string {
  // Language mapping for proper instructions
  const languageInstructions: Record<string, string> = {
    '繁體中文': 'Generate all content in Traditional Chinese (繁體中文)',
    '简体中文': 'Generate all content in Simplified Chinese (简体中文)',
    'English': 'Generate all content in English',
    'zh-TW': 'Generate all content in Traditional Chinese (繁體中文)',
    'zh-CN': 'Generate all content in Simplified Chinese (简体中文)',
    'en-US': 'Generate all content in English'
  }
  
  const languageInstruction = languageInstructions[targetLanguage || ''] || 'Generate all content in English'
  
  // YouTube Shorts 專用 prompt 增強
  if (complexity.isShorts) {
    return generateShortsPrompt(complexity, basePrompt, targetStyle, targetLanguage)
  }
  
  // 一般內容的 prompt 優化
  let enhancedPrompt = basePrompt + `\n\nIMPORTANT: ${languageInstruction}`
  
  // 根據內容複雜度調整指令
  if (complexity.topicsComplexity === 'complex') {
    enhancedPrompt += `\n\nADDITIONAL GUIDANCE for complex content:
- Break down complex concepts into digestible visual narratives
- Focus on the emotional and human impact of technical/complex topics  
- Use analogies and metaphors that translate well to visual storytelling
- Ensure the pitch captures both the intellectual depth and emotional resonance`
  }
  
  // 根據敘事結構調整
  if (complexity.narrativeStructure === 'multi_layered') {
    enhancedPrompt += `\n\nNARRATIVE GUIDANCE:
- This content has multiple layers/parts - weave them into a cohesive story arc
- Identify the overarching theme that connects different elements
- Create a pitch that promises viewers will see how different pieces connect`
  }
  
  // Add final language reminder
  enhancedPrompt += `\n\nREMEMBER: ${languageInstruction}`
  
  return enhancedPrompt
}

/**
 * Generate YouTube Shorts specific prompt
 */
function generateShortsPrompt(
  complexity: ContentComplexity,
  basePrompt: string,
  targetStyle?: string,
  targetLanguage?: string
): string {
  // Language mapping for proper instructions
  const languageInstructions: Record<string, string> = {
    '繁體中文': 'Generate all content in Traditional Chinese (繁體中文)',
    '简体中文': 'Generate all content in Simplified Chinese (简体中文)',
    'English': 'Generate all content in English',
    'zh-TW': 'Generate all content in Traditional Chinese (繁體中文)',
    'zh-CN': 'Generate all content in Simplified Chinese (简体中文)',
    'en-US': 'Generate all content in English'
  }
  
  const languageInstruction = languageInstructions[targetLanguage || ''] || 'Generate all content in English'
  
  const shortsGuidance = `
YOUTUBE SHORTS SPECIFIC REQUIREMENTS:
This is YouTube Shorts content (≤60 seconds) requiring special attention to:
- 極速吸引注意力的開場鉤子 (前3秒決定一切)
- 濃縮但完整的故事弧 (即使在短時間內也要有起承轉合)  
- 強烈的視覺衝擊力和行動裝置友好性
- 高分享潛力和話題性元素
- 清晰的行動呼籲或互動誘因`

  const styleSpecificGuidance = {
    [ShortsStyle.QUICK_TIPS]: `
QUICK TIPS STYLE:
- 專注於清晰的步驟說明和實用價值
- 確保每個步驟都可以視覺化呈現
- 強調「學會這個你就能...」的價值主張
- 包含可操作的行動步驟`,

    [ShortsStyle.STORY]: `
STORY STYLE:
- 確保故事有完整的起承轉合，即使在短時間內
- 開頭建立情境衝突，中間展現轉折，結尾提供解決
- 強調情感共鳴和人物關係
- 留下令人想分享的感動或驚喜`,

    [ShortsStyle.VIRAL]: `
VIRAL STYLE:
- 強調話題性、爭議性或令人驚訝的元素
- 專注於「你絕對想不到...」的驚喜因子
- 包含能引發討論或分享的爭議點
- 創造「必須告訴朋友」的迫切感`,

    [ShortsStyle.EDUCATIONAL]: `
EDUCATIONAL STYLE:
- 平衡教育價值與娛樂性
- 用簡單比喻解釋複雜概念
- 強調「3分鐘學會專家級知識」的價值
- 包含記憶點和可分享的知識點`,

    [ShortsStyle.ENTERTAINMENT]: `
ENTERTAINMENT STYLE:
- 優先考慮娛樂性和觀眾參與度
- 包含幽默、驚喜或情感高潮點
- 強調觀看體驗的愉悅感
- 創造讓人想重複觀看的元素`
  }

  const specificGuidance = styleSpecificGuidance[complexity.shortsStyle!] || ''

  return `${basePrompt}

${shortsGuidance}

${specificGuidance}

SHORTS PITCH REQUIREMENTS:
生成一個完整的 Shorts pitch，必須包含：
1. 強力開場鉤子 (吸引點擊的理由)
2. 核心內容概述 (主要看點/衝突)  
3. 情感或驚喜高潮 (分享動機)
4. 結尾鉤子 (互動誘因或懸念)

確保 pitch 適合行動裝置快速瀏覽，語言簡潔有力，每句話都有存在的必要性。

FINAL INSTRUCTION: ${languageInstruction}`
}