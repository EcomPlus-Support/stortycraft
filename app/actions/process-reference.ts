'use server'

import { generateTextWithGemini, GeminiServiceError, checkGeminiHealth } from '@/lib/gemini-service'
import { AuthenticationError } from '@/lib/auth'
import { extractYouTubeTranscript, extractVideoInsightsFromMetadata } from '@/lib/youtube-transcript'
import { performanceMonitor } from '@/lib/performance-monitor'
import { safeJsonParse, translateError, cleanJsonResponse, validateReferenceContent } from '@/lib/error-utils'
import { logger } from '@/lib/logger'
import { analyzeContentComplexity, detectContentType, type ReferenceSource as AnalyzerReferenceSource } from '@/lib/content-analyzer'
import { calculateOptimalTokens, generateOptimizedPrompt } from '@/lib/token-optimizer'
import { parseAiJsonResponse, type ReferenceContentSchema } from '@/lib/json-parser-simplified'
import { StructuredOutputService, type StructuredPitch } from '@/lib/structured-output-service'
import { GeminiDirectService } from '@/lib/gemini-direct'
import { YouTubeProcessingService } from '@/lib/youtube-processing-service'

// Add timeout configuration for external APIs
const API_TIMEOUT = 30000 // 30 seconds

// Simple in-memory cache for development (use Redis in production)
const contentCache = new Map<string, unknown>()
const CACHE_TTL = 3600000 // 1 hour in milliseconds

// Helper function to get proper language display name
function getLanguageDisplayName(language?: string): string {
  const languageMap: Record<string, string> = {
    '繁體中文': 'Traditional Chinese',
    '简体中文': 'Simplified Chinese',
    'English': 'English',
    'zh-TW': 'Traditional Chinese',
    'zh-CN': 'Simplified Chinese',
    'en-US': 'English'
  }
  return languageMap[language || ''] || 'English'
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

export interface ReferenceContent {
  id: string
  source: ReferenceSource
  extractedContent: {
    title: string
    description: string
    transcript: string
    keyTopics: string[]
    sentiment: string
    duration: number
  }
  generatedPitch: string
  contentQuality: 'full' | 'partial' | 'metadata-only'
  warning?: string
  createdAt: Date
  updatedAt: Date
  // New structured output fields
  structuredPitch?: StructuredPitch
  isStructuredOutput?: boolean
}

export async function extractYouTubeMetadata(url: string): Promise<Partial<ReferenceSource>> {
  return performanceMonitor.trackOperation('youtube_metadata_extraction', async () => {
  try {
    console.log('🚀 Starting YouTube metadata extraction with enhanced service')
    
    // Initialize enhanced processing service
    const processingService = new YouTubeProcessingService()
    
    // Use the enhanced service for processing - supports both shorts and regular videos
    const isShorts = /youtube\.com\/shorts\//.test(url)
    console.log(`Processing URL: ${url} (${isShorts ? 'Shorts' : 'Video'} detected)`)
    
    const result = await processingService.processYouTubeContent(
      url,
      isShorts ? 'shorts' : 'auto'
    )
    
    console.log(`✅ Processing complete. Strategy: ${result.processingStrategy}, Confidence: ${result.confidence}`)
    
    if (result.error) {
      console.error('❌ Processing service returned error:', result.error)
      throw new Error(result.error)
    }
    
    // Convert ProcessingResult to ReferenceSource format
    const referenceSource: Partial<ReferenceSource> = {
      title: result.title,
      description: result.description,
      duration: result.duration,
      thumbnail: result.thumbnail,
      // 🎥 使用視頻分析的腳本（如果有的話）
      transcript: result.transcript || result.description,
      processingStatus: 'completed'
    }
    
    console.log('🎯 Converted to ReferenceSource format:', {
      title: referenceSource.title?.substring(0, 50) + '...',
      hasDescription: !!referenceSource.description,
      hasTranscript: !!referenceSource.transcript,
      duration: referenceSource.duration
    })
    
    return referenceSource

    // This code block is now replaced by the enhanced service above
  } catch (error) {
    console.error('❌ Enhanced YouTube processing failed:', error)
    logger.error('Error extracting YouTube metadata with enhanced service', error)
    
    // Provide user-friendly error message based on error type
    let errorMessage = 'Failed to process YouTube content'
    
    if (error instanceof Error) {
      if (error.message.includes('quota exceeded')) {
        errorMessage = 'YouTube API quota exceeded. Please try again later.'
      } else if (error.message.includes('not found')) {
        errorMessage = 'Video not found or not accessible. Please check the URL.'
      } else if (error.message.includes('API key')) {
        errorMessage = 'YouTube API configuration error. Please contact support.'
      } else if (error.message.includes('temporarily unavailable')) {
        errorMessage = 'Service temporarily unavailable. Please try again in a few moments.'
      } else {
        errorMessage = error.message
      }
    }
    
    return {
      processingStatus: 'error',
      errorMessage
    }
  }
  }, { url })
}

export async function processReferenceContent(
  source: ReferenceSource,
  targetStyle?: string,
  targetLanguage?: string,
  useStructuredOutput?: boolean
): Promise<ReferenceContent> {
  return await performanceMonitor.trackOperation('reference_content_processing', async (): Promise<ReferenceContent> => {
  const startTime = Date.now()
  
  try {
    console.log('Processing reference content with enhanced Gemini service')
    console.log('Source type:', source.type)
    console.log('Has transcript:', !!source.transcript)
    console.log('Description length:', source.description?.length || 0)
    
    // First, check Gemini service health
    const healthStatus = await checkGeminiHealth()
    console.log('Gemini Health Check:', healthStatus)
    
    if (!healthStatus.healthy) {
      console.warn('Gemini service is not healthy, proceeding with fallback approach')
    }
    
    // Check cache for identical processing requests
    const cacheKey = `processed_content_${generateContentHash(source, targetStyle, targetLanguage)}`
    const cached = getCachedContent(cacheKey)
    if (cached) {
      console.log('Using cached processed content')
      return cached as ReferenceContent
    }

    // Determine content quality level with improved logic
    let contentQuality: 'full' | 'partial' | 'metadata-only' = 'full'
    let warning: string | undefined
    let content = ''

    if (source.transcript && source.transcript.trim().length > 0) {
      // Full quality - we have actual transcript content
      content = source.transcript
      contentQuality = 'full'
      console.log('Using full transcript content')
    } else if (source.description && source.description.length > 200) {
      // Partial quality - good description with potential enhanced metadata
      content = `Title: ${source.title || 'Untitled'}\n\nDescription and Context: ${source.description}`
      contentQuality = 'partial'
      warning = 'No transcript available. Generated from video title, description, and available metadata.'
      console.log('Using enhanced description content')
    } else if (source.description && source.description.length > 50) {
      // Basic quality - minimal but usable description
      content = `Title: ${source.title || 'Untitled'}\n\nDescription: ${source.description}`
      contentQuality = 'metadata-only'
      warning = 'Limited content available. Generated from basic video metadata only. Consider using a video with captions or detailed description.'
      console.log('Using basic metadata content')
    } else {
      // Very limited content
      content = `Title: ${source.title || 'Untitled'}\n\nDescription: ${source.description || 'No description available'}`
      contentQuality = 'metadata-only'
      warning = 'Very limited information available. Generated from minimal metadata only. For better results, try a different video.'
      console.log('Using minimal metadata content')
    }
    
    // Validate content length to avoid excessive processing time
    if (content.length > 50000) {
      console.log('Content too long, truncating for optimal processing')
      content = content.substring(0, 50000) + '\n\n[Content truncated for processing efficiency]'
      warning = (warning || '') + ' Content was truncated due to length for optimal processing.'
    }

    // For text input, always use full quality
    if (source.type === 'text_input') {
      content = source.transcript || source.description || ''
      contentQuality = 'full'
      warning = undefined
    }
    
    // Analyze content complexity for adaptive token management
    const sourceForAnalysis: AnalyzerReferenceSource = {
      id: source.id,
      type: source.type,
      url: source.url,
      title: source.title,
      description: source.description,
      duration: source.duration,
      thumbnail: source.thumbnail,
      transcript: source.transcript,
      processingStatus: source.processingStatus,
      errorMessage: source.errorMessage
    }
    
    const complexity = analyzeContentComplexity(sourceForAnalysis)
    const tokenAllocation = calculateOptimalTokens(complexity)
    
    console.log('Content Complexity Analysis:', {
      contentType: complexity.contentType,
      isShorts: complexity.isShorts,
      shortsStyle: complexity.shortsStyle,
      topicsComplexity: complexity.topicsComplexity,
      tokenAllocation: tokenAllocation.maxTokens,
      reasoning: tokenAllocation.reasoning,
      useStructuredOutput: useStructuredOutput
    })
    
    // Check if we should use structured output (Traditional Chinese)
    if (useStructuredOutput && (targetLanguage === '繁體中文' || targetLanguage === 'Traditional Chinese' || targetLanguage === 'zh-TW')) {
      console.log('🏗️ Using structured output system for Traditional Chinese generation')
      
      try {
        // Create instance of GeminiDirectService
        const geminiDirect = new GeminiDirectService()
        const structuredService = new StructuredOutputService(geminiDirect)
        
        const structuredPitch = await structuredService.generateStructuredPitch(
          content,
          contentQuality
        )
        
        if (structuredPitch) {
          console.log('✅ Structured output generation successful!')
          
          const referenceContent: ReferenceContent = {
            id: generateId(),
            source: {
              ...source,
              processingStatus: 'completed'
            },
            extractedContent: {
              title: source.title || 'Untitled',
              description: source.description || '',
              transcript: source.transcript || '',
              keyTopics: structuredPitch.tags || structuredPitch.characters.map(c => c.name),
              sentiment: 'positive',
              duration: source.duration || 0
            },
            generatedPitch: structuredPitch.finalPitch,
            contentQuality,
            warning,
            createdAt: new Date(),
            updatedAt: new Date(),
            // Structured output specific fields
            structuredPitch: structuredPitch,
            isStructuredOutput: true
          }
          
          // Cache the processed result
          setCachedContent(cacheKey, referenceContent)
          
          const processingTime = Date.now() - startTime
          console.log(`Structured content processing completed in ${processingTime}ms`)
          
          return referenceContent
        } else {
          console.log('⚠️ Structured output failed, falling back to standard generation')
          // Continue with standard generation below
        }
      } catch (structuredError) {
        console.log('⚠️ Structured output error, falling back to standard generation:', structuredError)
        // Continue with standard generation below
      }
    }
    
    const contentQualityContext = contentQuality === 'full' 
      ? 'You have access to the full transcript/content.'
      : contentQuality === 'partial'
      ? 'You have access to the title, description, and enhanced metadata. Work with what is available to create the best possible pitch.'
      : 'You have limited information (basic metadata only). Be creative but stay grounded in the available information and focus on what can be inferred from the title and description.';

    const basePrompt = `Create a video pitch based on this content. Respond ONLY with valid JSON, no markdown or extra text.

Title: ${source.title || 'Untitled'}
Content: ${content}
Type: ${complexity.isShorts ? 'YouTube Shorts (viral, 15-60s)' : 'Standard Video'}

Create a detailed story pitch for ${getLanguageDisplayName(targetLanguage)} audience. Even with limited info, be creative and elaborate.

JSON format:
{
  "analysis": {
    "keyTopics": ["topic1", "topic2", "topic3"],
    "sentiment": "positive",
    "coreMessage": "Brief core message",
    "targetAudience": "Target demographic"
  },
  "generatedPitch": "Detailed video pitch with characters, story, scenes, emotions. Minimum 200 words in ${getLanguageDisplayName(targetLanguage)}.",
  "rationale": "Why this pitch works"
}`

    // Generate optimized prompt based on content complexity
    const optimizedPrompt = generateOptimizedPrompt(complexity, basePrompt, targetStyle, targetLanguage)

    // Use the adaptive token allocation
    const text = await generateTextWithGemini(optimizedPrompt, {
      temperature: tokenAllocation.temperature,
      maxTokens: tokenAllocation.maxTokens,
      timeout: tokenAllocation.timeout
    })

    if (!text || text.trim().length === 0) {
      console.log('❌ Gemini returned empty response, using enhanced fallback')
      // Create enhanced fallback directly
      const fallbackPitch = createEnhancedFallbackPitch(source, targetStyle, targetLanguage, complexity)
      return {
        id: generateId(),
        source: {
          ...source,
          processingStatus: 'completed'
        },
        extractedContent: {
          title: source.title || 'Untitled',
          description: source.description || '',
          transcript: source.transcript || '',
          keyTopics: extractKeywordsFromContent(content),
          sentiment: 'positive',
          duration: source.duration || 0
        },
        generatedPitch: fallbackPitch,
        contentQuality,
        warning: 'Generated using enhanced fallback due to Gemini service unavailability.',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }

    // Enhanced JSON parsing using new intelligent parser (Solution 1 + 5)
    console.log('🔧 Starting enhanced JSON parsing for AI response')
    console.log('Raw AI response length:', text.length)
    console.log('First 200 chars:', text.substring(0, 200))
    
    // Use the new enhanced JSON parser
    const parseResult = parseAiJsonResponse(text)
    
    let result: ReferenceContentSchema
    
    if (parseResult.success && parseResult.data) {
      console.log('✅ Enhanced JSON parsing successful!')
      console.log('Repair attempts:', parseResult.repairAttempts?.length || 0)
      console.log('Parse time:', parseResult.parseTime + 'ms')
      result = parseResult.data
    } else {
      // If all enhanced parsing strategies fail, create fallback
      console.log('❌ All enhanced parsing strategies failed')
      console.log('Parse errors:', parseResult.repairAttempts)
      console.log('Creating intelligent fallback response...')
      
      const fallbackPitch = createEnhancedFallbackPitch(source, targetStyle, targetLanguage, complexity)
      result = {
        generatedPitch: fallbackPitch,
        analysis: {
          keyTopics: extractKeywordsFromContent(content),
          sentiment: 'positive',
          coreMessage: `Content analysis for: ${source.title}`,
          targetAudience: 'Social media users, entertainment seekers'
        },
        rationale: 'Generated using enhanced fallback due to JSON parsing failure'
      }
    }
    
    // Additional validation for completeness
    if (!result.generatedPitch || result.generatedPitch.length < 50) {
      console.log('⚠️ Generated pitch too short, enhancing...')
      result.generatedPitch = createEnhancedFallbackPitch(source, targetStyle, targetLanguage, complexity)
      result.rationale = (result.rationale || '') + ' [Enhanced due to short pitch]'
    }

    const referenceContent: ReferenceContent = {
      id: generateId(),
      source: {
        ...source,
        processingStatus: 'completed'
      },
      extractedContent: {
        title: source.title || 'Untitled',
        description: source.description || '',
        transcript: source.transcript || '',
        keyTopics: result.analysis.keyTopics || [],
        sentiment: result.analysis.sentiment || 'neutral',
        duration: source.duration || 0
      },
      generatedPitch: result.generatedPitch,
      contentQuality,
      warning,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Standard output fields
      isStructuredOutput: false
    }

    // Cache the processed result
    setCachedContent(cacheKey, referenceContent)
    
    const processingTime = Date.now() - startTime
    console.log(`Content processing completed in ${processingTime}ms`)
    
    return referenceContent

  } catch (error) {
    logger.error('Error processing reference content', error, {
      additionalData: {
        sourceType: source.type,
        hasTranscript: !!source.transcript,
        contentLength: (source.transcript || source.description || '').length,
        targetStyle,
        targetLanguage
      }
    })
    
    // Handle Gemini service errors with specific messaging
    if (error instanceof GeminiServiceError) {
      console.error('Gemini Service Error:', {
        code: error.code,
        isRetryable: error.isRetryable,
        originalError: error.originalError?.message
      })
      
      // If it's a model availability issue, create fallback content
      if (error.code === 'NO_MODELS_AVAILABLE' || error.code === 'MODEL_UNAVAILABLE') {
        console.log('Creating fallback content due to model unavailability')
        const fallbackPitch = createFallbackPitch(source, targetStyle, targetLanguage)
        return {
          id: generateId(),
          source: {
            ...source,
            processingStatus: 'completed'
          },
          extractedContent: {
            title: source.title || 'Untitled',
            description: source.description || '',
            transcript: source.transcript || '',
            keyTopics: extractKeywordsFromContent(source.transcript || source.description || ''),
            sentiment: 'neutral',
            duration: source.duration || 0
          },
          generatedPitch: fallbackPitch,
          contentQuality: 'metadata-only' as const,
          warning: 'Generated using fallback method due to Gemini service unavailability.',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
      
      // For auth errors, provide specific guidance
      if (error.code === 'AUTH_ERROR') {
        throw new Error('Authentication failed: Please ask your administrator to run "gcloud auth application-default login" to reauthenticate.')
      }
      
      throw new Error(`Gemini service error: ${error.message}`)
    }
    
    if (error instanceof AuthenticationError) {
      throw error
    }
    
    // Use the error translation utility for user-friendly messages
    const friendlyError = translateError(error)
    throw new Error(`${friendlyError.title}: ${friendlyError.message}${
      friendlyError.actionable ? ` ${friendlyError.actionable}` : ''
    }`)
  }
  })
}

// Helper functions
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    // Add support for YouTube Shorts URLs
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    // Add support for live and mobile URLs
    /youtube\.com\/live\/([^&\n?#]+)/,
    /m\.youtube\.com\/watch\?v=([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      // Remove any additional query parameters from the video ID
      return match[1].split('?')[0]
    }
  }
  
  return null
}

function parseDuration(duration: string): number {
  // Convert ISO 8601 duration (PT4M13S) to seconds
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  
  return hours * 3600 + minutes * 60 + seconds
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Enhanced helper functions for performance optimization

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'StoryCraft/1.0'
      }
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  }
}

// Retry function removed - now handled by GeminiService

/**
 * Simple cache management
 */
function getCachedContent(key: string): unknown {
  const cached = contentCache.get(key) as { data: unknown; timestamp: number } | undefined
  if (!cached) return null
  
  const { data, timestamp } = cached
  if (Date.now() - timestamp > CACHE_TTL) {
    contentCache.delete(key)
    return null
  }
  
  return data
}

function setCachedContent(key: string, data: unknown): void {
  contentCache.set(key, {
    data,
    timestamp: Date.now()
  })
  
  // Simple cache size management
  if (contentCache.size > 100) {
    const firstKey = contentCache.keys().next().value
    if (firstKey) {
      contentCache.delete(firstKey)
    }
  }
}

/**
 * Generate hash for content caching
 */
function generateContentHash(source: ReferenceSource, style?: string, language?: string): string {
  const content = JSON.stringify({
    url: source.url,
    transcript: source.transcript,
    description: source.description,
    style,
    language
  })
  
  // Simple hash function for caching
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return hash.toString(36)
}

/**
 * Create an enhanced fallback pitch with rich content for Shorts
 */
function createEnhancedFallbackPitch(source: ReferenceSource, targetStyle?: string, targetLanguage?: string, complexity?: any): string {
  const title = source.title || 'Untitled Content'
  const isShorts = complexity?.isShorts
  const displayLanguage = getLanguageDisplayName(targetLanguage)
  
  // Enhanced Shorts-specific pitch templates
  if (isShorts && (title.includes('😂') || title.includes('太扯'))) {
    if (displayLanguage === 'Traditional Chinese') {
      return `【驚喜發現】「${title}」- 一個讓人忍不住爆笑的意外發現

🎬 故事概念：
開場：主角無意間發現兩個看似完全不相關的事物，卻有著令人震驚的相似性

角色設定：
- 主角：好奇心旺盛的年輕人，善於觀察生活細節
- 背景：現代都市生活場景，充滿驚喜的日常瞬間

場景描述：
1. 開頭3秒：快速剪接展示兩個物品/場景的對比
2. 中段：主角的表情變化 - 從困惑到驚訝再到爆笑
3. 結尾：加入趣味文字特效和音效，強化視覺衝擊

視覺風格：
- 使用分屏對比手法，突出相似性
- 明亮的色調搭配，營造輕鬆愉快氛围
- 快節奏剪接配合節奏感強的背景音樂
- 手持攝影風格，增加真實感和親近感

情感曲線：
好奇 → 疑惑 → 恍然大悟 → 歡樂分享
整個故事在11秒內完成情感轉換，讓觀眾產生強烈的共鳴和分享慾望

病毒潜力：
- 利用視覺錯覺和認知偏差創造話題性
- 鼓勵觀眾在評論區分享類似發現
- 適合製作系列內容，形成持續關注`
    }
  }
  
  return createFallbackPitch(source, targetStyle, targetLanguage)
}

/**
 * Create a fallback pitch when AI processing fails
 */
function createFallbackPitch(source: ReferenceSource, targetStyle?: string, targetLanguage?: string): string {
  const title = source.title || 'Untitled Content'
  const hasDescription = source.description && source.description.length > 20
  const displayLanguage = getLanguageDisplayName(targetLanguage)
  
  // Language-specific fallback pitches
  const pitchTemplates: Record<string, (title: string, desc: string, style: string) => string> = {
    'Traditional Chinese': (title, desc, style) => {
      if (hasDescription) {
        return `探索「${title}」背後的故事 - 一個引人入勝的敘事，探討${desc}${desc.length >= 100 ? '...' : ''}。這部${style}將內容以視覺化的方式生動呈現。`
      }
      return `以全新的方式體驗「${title}」。這部${style}將原始內容轉化為引人入勝的視覺故事，捕捉您的注意力並有效傳達訊息。`
    },
    'Simplified Chinese': (title, desc, style) => {
      if (hasDescription) {
        return `探索「${title}」背后的故事 - 一个引人入胜的叙事，探讨${desc}${desc.length >= 100 ? '...' : ''}。这部${style}将内容以视觉化的方式生动呈现。`
      }
      return `以全新的方式体验「${title}」。这部${style}将原始内容转化为引人入胜的视觉故事，捕捉您的注意力并有效传达信息。`
    },
    'English': (title, desc, style) => {
      if (hasDescription) {
        return `Discover the story behind "${title}" - a compelling narrative that explores ${desc}${desc.length >= 100 ? '...' : ''}. This ${style} brings the content to life in a visually engaging way.`
      }
      return `Experience "${title}" in a new way. This ${style} transforms the original content into a compelling visual story that captures your attention and delivers the message effectively.`
    }
  }
  
  const shortDesc = hasDescription ? (source.description || '').substring(0, 100).replace(/\s+/g, ' ').trim() : ''
  const styleText = targetStyle?.toLowerCase() || 'video'
  
  const pitchGenerator = pitchTemplates[displayLanguage] || pitchTemplates['English']
  return pitchGenerator(title, shortDesc, styleText)
}

/**
 * Extract keywords from content for analysis
 */
function extractKeywordsFromContent(content: string): string[] {
  if (!content || content.length < 10) return []
  
  // Simple keyword extraction
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
  
  // Count word frequency
  const wordCount = new Map<string, number>()
  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1)
  })
  
  // Return top 5 most frequent words
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

/**
 * Extract YouTube transcript using the dedicated transcript library with improved error handling
 */
async function extractYouTubeTranscriptInternal(videoId: string, apiKey: string): Promise<string | undefined> {
  try {
    console.log(`Attempting transcript extraction for video: ${videoId}`)
    const transcriptResult = await extractYouTubeTranscript(videoId, apiKey)
    
    if (transcriptResult && transcriptResult.fullText && transcriptResult.fullText.trim().length > 0) {
      console.log(`Transcript extracted successfully (${transcriptResult.fullText.length} characters)`)
      return transcriptResult.fullText
    }
    
    console.log('No usable transcript content available for this video')
    return undefined
    
  } catch (error) {
    // This is expected for most videos due to OAuth requirements
    console.log('Transcript extraction failed (expected):', error instanceof Error ? error.message : error)
    return undefined
  }
}