/**
 * Content analysis and classification for adaptive token management
 */

export enum ContentType {
  YOUTUBE_LONG_FORM = 'youtube_long_form',     // >300秒的影片
  YOUTUBE_SHORTS = 'youtube_shorts',           // ≤60秒的影片
  YOUTUBE_MEDIUM = 'youtube_medium',           // 60-300秒的影片
  TEXT_INPUT = 'text_input',                   // 文字輸入
  AUDIO_UPLOAD = 'audio_upload'                // 音檔上傳
}

export enum ShortsStyle {
  QUICK_TIPS = 'quick_tips',
  STORY = 'story', 
  VIRAL = 'viral',
  EDUCATIONAL = 'educational',
  ENTERTAINMENT = 'entertainment'
}

export interface ContentComplexity {
  contentType: ContentType
  isShorts: boolean
  shortsStyle?: ShortsStyle
  duration: number
  hasTranscript: boolean
  transcriptLength: number
  descriptionLength: number
  topicsComplexity: 'simple' | 'moderate' | 'complex'
  visualComplexity: 'static' | 'dynamic' | 'highly_dynamic'
  narrativeStructure: 'linear' | 'multi_layered' | 'abstract'
}

export interface ReferenceSource {
  id: string
  type: 'youtube' | 'audio_upload' | 'text_input'
  url?: string
  title?: string
  description?: string
  duration?: number
  thumbnail?: string
  transcript?: string
  processingStatus: 'pending' | 'processing' | 'completed' | 'error'
  errorMessage?: string
}

/**
 * Detect content type based on source characteristics
 */
export function detectContentType(source: ReferenceSource): ContentType {
  if (source.type === 'youtube') {
    const duration = source.duration || 0
    
    if (duration <= 60) {
      return ContentType.YOUTUBE_SHORTS
    } else if (duration <= 300) {
      return ContentType.YOUTUBE_MEDIUM
    } else {
      return ContentType.YOUTUBE_LONG_FORM
    }
  }
  
  return source.type === 'text_input' ? 
    ContentType.TEXT_INPUT : ContentType.AUDIO_UPLOAD
}

/**
 * Detect YouTube Shorts style based on content analysis
 */
export function detectShortsStyle(source: ReferenceSource): ShortsStyle {
  const title = source.title?.toLowerCase() || ''
  const description = source.description?.toLowerCase() || ''
  const content = title + ' ' + description
  
  // 教學類關鍵字
  if (content.includes('how to') || 
      content.includes('教學') || 
      content.includes('tips') ||
      content.includes('tutorial') ||
      content.includes('guide') ||
      content.includes('步驟')) {
    return ShortsStyle.QUICK_TIPS
  }
  
  // 故事類關鍵字
  if (content.includes('story') || 
      content.includes('故事') || 
      content.includes('journey') ||
      content.includes('experience') ||
      content.includes('adventure') ||
      content.includes('經歷')) {
    return ShortsStyle.STORY
  }
  
  // 病毒式內容關鍵字
  if (content.includes('viral') || 
      content.includes('trending') || 
      content.includes('爆紅') ||
      content.includes('amazing') ||
      content.includes('incredible') ||
      content.includes('shocking')) {
    return ShortsStyle.VIRAL
  }
  
  // 教育類關鍵字
  if (content.includes('learn') || 
      content.includes('學習') || 
      content.includes('education') ||
      content.includes('knowledge') ||
      content.includes('explain') ||
      content.includes('科學') ||
      content.includes('研究')) {
    return ShortsStyle.EDUCATIONAL
  }
  
  // 預設為娛樂類
  return ShortsStyle.ENTERTAINMENT
}

/**
 * Analyze content complexity for token calculation
 */
export function analyzeContentComplexity(source: ReferenceSource): ContentComplexity {
  const contentType = detectContentType(source)
  const isShorts = contentType === ContentType.YOUTUBE_SHORTS
  const shortsStyle = isShorts ? detectShortsStyle(source) : undefined
  
  // 分析主題複雜度
  const topicsComplexity = analyzeTopicsComplexity(source)
  
  // 分析視覺複雜度
  const visualComplexity = analyzeVisualComplexity(source)
  
  // 分析敘事結構
  const narrativeStructure = analyzeNarrativeStructure(source)
  
  return {
    contentType,
    isShorts,
    shortsStyle,
    duration: source.duration || 0,
    hasTranscript: Boolean(source.transcript && source.transcript.length > 0),
    transcriptLength: source.transcript?.length || 0,
    descriptionLength: source.description?.length || 0,
    topicsComplexity,
    visualComplexity,
    narrativeStructure
  }
}

/**
 * Analyze topics complexity based on content
 */
function analyzeTopicsComplexity(source: ReferenceSource): 'simple' | 'moderate' | 'complex' {
  try {
    // Sanitize and validate input
    const title = sanitizeInput(source.title || '')
    const description = sanitizeInput(source.description || '')
    const transcript = sanitizeInput(source.transcript || '')
    
    const content = `${title} ${description} ${transcript}`.toLowerCase()
    const contentLength = content.length
    
    // Validate content length bounds
    if (contentLength === 0) return 'simple'
    if (contentLength > 100000) return 'complex' // Cap at 100KB for performance
    
    // Use compiled regex for better performance
    const complexPattern = /\b(algorithm|technology|science|research|analysis|theory|演算法|科技|科學|研究|分析|理論|技術|策略)\b/g
    const simplePattern = /\b(basic|simple|easy|quick|fun|cute|簡單|容易|快速|有趣|可愛|基本)\b/g
    
    const complexMatches = (content.match(complexPattern) || []).length
    const simpleMatches = (content.match(simplePattern) || []).length
    
    if (complexMatches > 2 || contentLength > 2000) {
      return 'complex'
    } else if (simpleMatches > 2 || contentLength < 500) {
      return 'simple'
    } else {
      return 'moderate'
    }
  } catch (error) {
    console.warn('Error analyzing topics complexity:', error)
    return 'moderate' // Safe fallback
  }
}

/**
 * Sanitize input to prevent injection attacks
 */
function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  
  // Remove potentially dangerous characters and limit length
  return input
    .replace(/[<>\"'&]/g, '') // Remove HTML/script injection chars
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, 10000) // Limit to 10KB per field
    .trim()
}

/**
 * Analyze visual complexity
 */
function analyzeVisualComplexity(source: ReferenceSource): 'static' | 'dynamic' | 'highly_dynamic' {
  try {
    const title = sanitizeInput(source.title || '')
    const description = sanitizeInput(source.description || '')
    const content = `${title} ${description}`.toLowerCase()
    
    if (content.length === 0) return 'dynamic' // Safe default
    
    // Use regex patterns for better performance
    const highlyDynamicPattern = /\b(action|dance|sport|game|adventure|chase|動作|舞蹈|運動|遊戲|冒險|追逐)\b/g
    const staticPattern = /\b(talk|interview|lecture|discussion|presentation|談話|訪談|講座|討論|演講)\b/g
    
    const highMatches = (content.match(highlyDynamicPattern) || []).length
    const staticMatches = (content.match(staticPattern) || []).length
    
    if (highMatches > 0) return 'highly_dynamic'
    if (staticMatches > 0) return 'static'
    return 'dynamic'
  } catch (error) {
    console.warn('Error analyzing visual complexity:', error)
    return 'dynamic' // Safe fallback
  }
}

/**
 * Analyze narrative structure
 */
function analyzeNarrativeStructure(source: ReferenceSource): 'linear' | 'multi_layered' | 'abstract' {
  try {
    const title = sanitizeInput(source.title || '')
    const description = sanitizeInput(source.description || '')
    const content = `${title} ${description}`.toLowerCase()
    
    if (content.length === 0) return 'linear' // Safe default
    
    // Use regex patterns for better performance
    const multiLayeredPattern = /\b(part|chapter|series|episode|comparison|vs|部分|章節|系列|集數|比較|對比)\b/g
    const abstractPattern = /\b(concept|idea|philosophy|theory|abstract|metaphor|概念|想法|哲學|理論|抽象|比喻)\b/g
    
    const multiMatches = (content.match(multiLayeredPattern) || []).length
    const abstractMatches = (content.match(abstractPattern) || []).length
    
    if (abstractMatches > 0) return 'abstract'
    if (multiMatches > 0) return 'multi_layered'
    return 'linear'
  } catch (error) {
    console.warn('Error analyzing narrative structure:', error)
    return 'linear' // Safe fallback
  }
}