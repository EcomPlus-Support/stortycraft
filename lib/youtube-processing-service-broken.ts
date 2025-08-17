import { logger } from '@/lib/logger'
import { RetryService, CircuitBreaker } from '@/lib/retry-service'
import { processingMonitor } from '@/lib/processing-monitor'
import { intelligentCache, IntelligentCache } from '@/lib/intelligent-cache'

export interface ProcessingResult {
  id: string
  videoId: string | null
  contentType: 'shorts' | 'video' | 'unknown'
  title: string
  description: string
  duration?: number
  thumbnail?: string
  transcript?: string
  confidence: number
  processingStrategy: string
  metadata?: Record<string, any>
  warning?: string
  error?: string
  shortsAnalysis?: ShortsAnalysis
  viralPotential?: ViralPotential
  optimizationHints?: string[]
}

export interface ShortsAnalysis {
  style: 'quick_tips' | 'story' | 'viral' | 'educational' | 'entertainment'
  hooks: string[]
  callToAction: string[]
  engagementPrediction: number
}

export interface ViralPotential {
  score: number
  factors: string[]
  recommendations: string[]
}

export interface VideoMetadata {
  id: string
  title: string
  description: string
  duration: number
  thumbnail: string
  publishedAt: string
  channelTitle: string
  tags?: string[]
  viewCount?: number
  likeCount?: number
}

// Enhanced processing pipeline
export class YouTubeProcessingService {
  private retryService: RetryService
  private circuitBreaker: CircuitBreaker
  
  constructor() {
    this.retryService = new RetryService()
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000
    })
  }

  async processYouTubeContent(
    url: string,
    contentType: 'shorts' | 'video' | 'auto' = 'auto'
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    const eventId = processingMonitor.recordProcessingStart(url, contentType)
    
    try {
      const videoId = this.extractVideoId(url)
      
      if (!videoId) {
        const error = this.createErrorResult(url, 'Unable to extract video ID from URL')
        processingMonitor.recordProcessingComplete(eventId, 'error', startTime, false)
        return error
      }
      
      // Check cache first
      const cacheKey = IntelligentCache.createYouTubeKey(videoId, contentType)
      const cached = intelligentCache.get<ProcessingResult>(cacheKey)
      
      if (cached) {
        logger.info(`Cache hit for ${videoId}`)
        processingMonitor.recordProcessingComplete(eventId, 'cache_hit', startTime, true)
        return cached
      }

    // Multi-tier processing strategy with circuit breaker
    try {
      return await this.circuitBreaker.execute(
        async () => {
          // Tier 1: Standard API approach with retry
          const metadata = await this.retryService.executeWithRetry(
            () => this.extractStandardMetadata(videoId),
            'YouTube metadata extraction',
            { maxAttempts: 3 }
          )
          
          // Tier 2: Enhanced processing based on content type
          let result: ProcessingResult
          
          if (contentType === 'shorts' || this.isLikelyShorts(url)) {
            result = await this.enhancedShortsProcessing(metadata, videoId, url)
          } else {
            result = await this.standardVideoProcessing(metadata, videoId, url)
          }
          
          // Cache the successful result
          intelligentCache.set(cacheKey, result, result.contentType)
          
          // Record success metrics
          processingMonitor.recordProcessingComplete(
            eventId,
            result.processingStrategy,
            startTime,
            true
          )
          
          return result
        },
        // Fallback when circuit is open
        async () => {
          logger.warn('Circuit breaker open, using fallback processing')
          return await this.fallbackProcessing(videoId, url, new Error('Service temporarily unavailable'))
        }
      )
    } catch (error) {
      // Tier 3: Fallback processing
      logger.error('Primary processing failed, attempting fallback', { error, videoId })
      
      try {
        const result = await this.fallbackProcessing(videoId, url, error as Error)
        
        // Record failure metrics
        processingMonitor.recordProcessingComplete(
          eventId,
          result.processingStrategy,
          startTime,
          false,
          error as Error
        )
        
        // Cache even fallback results (with shorter TTL)
        intelligentCache.set(cacheKey, result, 'fallback')
        
        return result
      } catch (fallbackError) {
        // If fallback also fails, return error result
        logger.error('Fallback processing also failed', { fallbackError })
        processingMonitor.recordProcessingComplete(eventId, 'critical_error', startTime, false, fallbackError as Error)
        return this.createErrorResult(url, 'All processing methods failed')
      }
    } catch (error) {
      // Handle any errors from the outer try block
      logger.error('Unexpected error in processYouTubeContent', { error })
      processingMonitor.recordProcessingComplete(eventId, 'critical_error', startTime, false, error as Error)
      return this.createErrorResult(url, 'Unexpected processing error')
    }
  }

  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
      /youtube\.com\/live\/([^&\n?#]+)/,
      /m\.youtube\.com\/watch\?v=([^&\n?#]+)/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1].split('?')[0]
      }
    }
    
    return null
  }

  private isLikelyShorts(url: string): boolean {
    return /youtube\.com\/shorts\//.test(url)
  }

  private async extractStandardMetadata(videoId: string): Promise<VideoMetadata> {
    // Use YouTube Data API v3 to get metadata
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      throw new Error('YouTube API key not configured')
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`,
      {
        headers: {
          'User-Agent': 'StoryCraft/1.0'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('YouTube API quota exceeded or invalid key')
      }
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const video = data.items?.[0]

    if (!video) {
      throw new Error('Video not found or not accessible')
    }

    // Parse duration from ISO 8601 format (PT4M13S)
    const duration = this.parseDuration(video.contentDetails.duration)

    return {
      id: videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      duration,
      thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
      publishedAt: video.snippet.publishedAt,
      channelTitle: video.snippet.channelTitle,
      tags: video.snippet.tags,
      viewCount: parseInt(video.statistics?.viewCount || '0'),
      likeCount: parseInt(video.statistics?.likeCount || '0')
    }
  }

  private parseDuration(duration: string): number {
    // Convert ISO 8601 duration (PT4M13S) to seconds
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0
    
    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')
    
    return hours * 3600 + minutes * 60 + seconds
  }

  private async enhancedShortsProcessing(
    metadata: VideoMetadata,
    videoId: string,
    url: string
  ): Promise<ProcessingResult> {
    const shortsAnalysis = await this.analyzeShortsContent(metadata)
    const viralPotential = this.calculateViralPotential(metadata, shortsAnalysis)
    const optimizationHints = this.generateShortsOptimizationHints(metadata, shortsAnalysis)
    
    return {
      id: this.generateId(),
      videoId,
      contentType: 'shorts',
      title: metadata.title,
      description: metadata.description,
      duration: metadata.duration,
      thumbnail: metadata.thumbnail,
      confidence: 0.95,
      processingStrategy: 'enhanced_shorts',
      shortsAnalysis,
      viralPotential,
      optimizationHints,
      metadata: {
        channelTitle: metadata.channelTitle,
        publishedAt: metadata.publishedAt,
        viewCount: metadata.viewCount,
        likeCount: metadata.likeCount
      }
    }
  }

  private async standardVideoProcessing(
    metadata: VideoMetadata,
    videoId: string,
    url: string
  ): Promise<ProcessingResult> {
    return {
      id: this.generateId(),
      videoId,
      contentType: 'video',
      title: metadata.title,
      description: metadata.description,
      duration: metadata.duration,
      thumbnail: metadata.thumbnail,
      confidence: 0.95,
      processingStrategy: 'standard_video',
      metadata: {
        channelTitle: metadata.channelTitle,
        publishedAt: metadata.publishedAt,
        viewCount: metadata.viewCount,
        likeCount: metadata.likeCount
      }
    }
  }

  private async analyzeShortsContent(metadata: VideoMetadata): Promise<ShortsAnalysis> {
    // Analyze content style based on title, description, and duration
    const style = this.detectShortsStyle(metadata)
    const hooks = this.extractHooks(metadata)
    const callToAction = this.extractCallToAction(metadata)
    const engagementPrediction = this.predictEngagement(metadata)
    
    return {
      style,
      hooks,
      callToAction,
      engagementPrediction
    }
  }

  private detectShortsStyle(metadata: VideoMetadata): ShortsAnalysis['style'] {
    const title = metadata.title.toLowerCase()
    const description = metadata.description.toLowerCase()
    
    if (title.includes('tip') || title.includes('hack') || title.includes('how to')) {
      return 'quick_tips'
    } else if (title.includes('story') || title.includes('storytime')) {
      return 'story'
    } else if (title.includes('viral') || title.includes('trend')) {
      return 'viral'
    } else if (title.includes('learn') || title.includes('tutorial')) {
      return 'educational'
    }
    
    return 'entertainment'
  }

  private extractHooks(metadata: VideoMetadata): string[] {
    const hooks: string[] = []
    
    // Extract potential hooks from title
    const titleHooks = [
      /^(Did you know|You won't believe|This is why|Here's how)/i,
      /(secret|hack|trick|tip)/i,
      /(\d+\s+ways?|\d+\s+things?)/i
    ]
    
    titleHooks.forEach(pattern => {
      const match = metadata.title.match(pattern)
      if (match) hooks.push(match[0])
    })
    
    return hooks
  }

  private extractCallToAction(metadata: VideoMetadata): string[] {
    const ctas: string[] = []
    const description = metadata.description.toLowerCase()
    
    if (description.includes('subscribe')) ctas.push('Subscribe for more')
    if (description.includes('follow')) ctas.push('Follow for updates')
    if (description.includes('comment')) ctas.push('Comment your thoughts')
    if (description.includes('share')) ctas.push('Share with friends')
    
    return ctas
  }

  private predictEngagement(metadata: VideoMetadata): number {
    let score = 50 // Base score
    
    // Adjust based on view/like ratio
    if (metadata.viewCount && metadata.likeCount) {
      const likeRatio = metadata.likeCount / metadata.viewCount
      score += likeRatio * 100
    }
    
    // Adjust based on title characteristics
    if (metadata.title.includes('?')) score += 10 // Questions increase engagement
    if (metadata.title.length < 60) score += 5 // Concise titles perform better
    
    // Adjust based on duration (shorter is generally better for Shorts)
    if (metadata.duration && metadata.duration <= 30) score += 15
    else if (metadata.duration && metadata.duration <= 45) score += 10
    
    return Math.min(Math.max(score, 0), 100)
  }

  private calculateViralPotential(
    metadata: VideoMetadata,
    shortsAnalysis: ShortsAnalysis
  ): ViralPotential {
    const factors: string[] = []
    let score = 0
    
    // Check viral factors
    if (shortsAnalysis.engagementPrediction > 70) {
      factors.push('High engagement prediction')
      score += 30
    }
    
    if (shortsAnalysis.hooks.length > 0) {
      factors.push(`Strong hooks (${shortsAnalysis.hooks.length})`)
      score += 20
    }
    
    if (metadata.duration && metadata.duration <= 30) {
      factors.push('Optimal duration for virality')
      score += 20
    }
    
    if (shortsAnalysis.style === 'viral' || shortsAnalysis.style === 'quick_tips') {
      factors.push('Viral-friendly content style')
      score += 20
    }
    
    const recommendations = this.generateViralRecommendations(score, shortsAnalysis)
    
    return {
      score: Math.min(score, 100),
      factors,
      recommendations
    }
  }

  private generateViralRecommendations(score: number, analysis: ShortsAnalysis): string[] {
    const recommendations: string[] = []
    
    if (score < 50) {
      recommendations.push('Add a strong hook in the first 3 seconds')
      recommendations.push('Keep duration under 30 seconds')
      recommendations.push('Use trending audio or effects')
    }
    
    if (analysis.hooks.length === 0) {
      recommendations.push('Start with a question or surprising statement')
    }
    
    if (analysis.callToAction.length === 0) {
      recommendations.push('Add clear call-to-action at the end')
    }
    
    return recommendations
  }

  private generateShortsOptimizationHints(
    metadata: VideoMetadata,
    analysis: ShortsAnalysis
  ): string[] {
    const hints: string[] = []
    
    // Duration optimization
    if (metadata.duration && metadata.duration > 45) {
      hints.push('Consider shortening to under 45 seconds for better retention')
    }
    
    // Title optimization
    if (metadata.title.length > 60) {
      hints.push('Shorten title for better mobile visibility')
    }
    
    // Content style hints
    switch (analysis.style) {
      case 'quick_tips':
        hints.push('Number your tips for clarity')
        hints.push('Use text overlays for key points')
        break
      case 'story':
        hints.push('Start with the climax, then explain')
        hints.push('Use cliffhangers to increase watch time')
        break
      case 'viral':
        hints.push('Jump on trends within 24-48 hours')
        hints.push('Add your unique twist to stand out')
        break
    }
    
    return hints
  }

  private createErrorResult(url: string, errorMessage: string): ProcessingResult {
    return {
      id: this.generateId(),
      videoId: null,
      contentType: 'unknown',
      title: 'Processing Error',
      description: errorMessage,
      confidence: 0,
      processingStrategy: 'error',
      error: errorMessage,
      warning: 'Unable to process the provided URL'
    }
  }

  private generateId(): string {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Fallback processing strategies
  async fallbackProcessing(
    videoId: string | null,
    url: string,
    originalError: Error
  ): Promise<ProcessingResult> {
    const fallbackStrategies = [
      () => this.metadataOnlyProcessing(videoId, url),
      () => this.urlPatternBasedProcessing(url),
      () => this.staticShortsTemplate(url),
      () => this.emergencyFallback(url, originalError)
    ]

    for (const strategy of fallbackStrategies) {
      try {
        const result = await strategy()
        if (result && result.confidence > 0.3) {
          return {
            ...result,
            processingStrategy: 'fallback',
            warning: 'Generated using fallback processing due to API limitations'
          }
        }
      } catch (fallbackError) {
        logger.warn('Fallback strategy failed', { error: fallbackError })
      }
    }

    return this.emergencyFallback(url, originalError)
  }

  private async metadataOnlyProcessing(
    videoId: string | null,
    url: string
  ): Promise<ProcessingResult> {
    if (!videoId) throw new Error('No video ID available')
    
    const isShorts = this.isLikelyShorts(url)
    
    return {
      id: this.generateId(),
      videoId,
      contentType: isShorts ? 'shorts' : 'video',
      title: `YouTube ${isShorts ? 'Shorts' : 'Video'}`,
      description: 'Content processing with limited metadata',
      confidence: 0.5,
      processingStrategy: 'metadata_only'
    }
  }

  private async urlPatternBasedProcessing(url: string): Promise<ProcessingResult> {
    const isShorts = this.isLikelyShorts(url)
    const videoId = this.extractVideoId(url)
    
    return {
      id: this.generateId(),
      videoId,
      contentType: isShorts ? 'shorts' : 'video',
      title: `${isShorts ? 'YouTube Shorts' : 'YouTube Video'} Content`,
      description: 'Content extracted from URL pattern analysis',
      confidence: 0.4,
      processingStrategy: 'url_pattern',
      warning: 'Limited processing available - results based on URL analysis only'
    }
  }

  private async staticShortsTemplate(url: string): Promise<ProcessingResult> {
    const videoId = this.extractVideoId(url)
    
    return {
      id: this.generateId(),
      videoId,
      contentType: 'shorts',
      title: 'YouTube Shorts Content',
      description: 'Quick-form vertical video content',
      confidence: 0.35,
      processingStrategy: 'static_template',
      shortsAnalysis: {
        style: 'entertainment',
        hooks: [],
        callToAction: [],
        engagementPrediction: 50
      },
      warning: 'Using generic template due to processing limitations'
    }
  }

  private emergencyFallback(url: string, error: Error): ProcessingResult {
    return {
      id: this.generateId(),
      videoId: this.extractVideoId(url),
      contentType: 'unknown',
      title: 'Content Unavailable',
      description: 'Unable to process this content at the moment',
      confidence: 0,
      processingStrategy: 'emergency_fallback',
      error: error.message,
      warning: 'All processing methods failed. Please try again later.'
    }
  }
}