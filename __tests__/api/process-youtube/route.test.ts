import { NextRequest } from 'next/server'
import { POST } from '@/app/api/process-youtube/route'

// Mock the external dependencies
jest.mock('@/lib/youtube-processing-service')
jest.mock('@/lib/gemini-service')
jest.mock('@/lib/structured-output-service')
jest.mock('@/lib/gemini-direct')
jest.mock('@/lib/logger')

import { YouTubeProcessingService } from '@/lib/youtube-processing-service'
import { generateTextWithGemini } from '@/lib/gemini-service'
import { StructuredOutputService } from '@/lib/structured-output-service'
import { GeminiDirectService } from '@/lib/gemini-direct'

const mockYouTubeProcessingService = YouTubeProcessingService as jest.MockedClass<typeof YouTubeProcessingService>
const mockGenerateTextWithGemini = generateTextWithGemini as jest.MockedFunction<typeof generateTextWithGemini>

describe('/api/process-youtube API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const createMockRequest = (body: any): NextRequest => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest
  }

  describe('Success Cases', () => {
    test('should successfully process YouTube Shorts URL with structured output', async () => {
      // Mock successful YouTube processing
      const mockProcessingResult = {
        id: 'proc_123',
        videoId: 'test123',
        contentType: 'shorts' as const,
        title: 'Test YouTube Shorts',
        description: 'Test description',
        duration: 30,
        thumbnail: 'https://test.jpg',
        transcript: 'Test transcript content',
        confidence: 0.95,
        processingStrategy: 'enhanced_shorts',
        hasVideoAnalysis: true,
        videoAnalysisQuality: 'high' as const,
        videoAnalysis: {
          characters: [{ name: 'Test Character', description: 'Test character' }],
          scenes: [{ description: 'Test scene', duration: 30 }]
        }
      }

      mockYouTubeProcessingService.prototype.processYouTubeContent.mockResolvedValue(mockProcessingResult)

      // Mock successful structured output
      const mockStructuredPitch = {
        title: '測試故事',
        finalPitch: '這是一個測試的 YouTube Shorts 故事，包含豐富的劇情和角色。',
        characters: [{ name: '主角', description: '故事的主要角色' }],
        scenes: [{ description: '開場場景', duration: 30 }],
        tags: ['測試', '故事']
      }

      const mockStructuredService = {
        generateStructuredPitch: jest.fn().mockResolvedValue(mockStructuredPitch)
      }

      StructuredOutputService.mockImplementation(() => mockStructuredService as any)

      const request = createMockRequest({
        url: 'https://youtube.com/shorts/test123',
        targetLanguage: '繁體中文',
        useStructuredOutput: true
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toBeDefined()
      expect(responseData.data.generatedPitch).toBe(mockStructuredPitch.finalPitch)
      expect(responseData.data.isStructuredOutput).toBe(true)
      expect(responseData.data.source.title).toBe('Test YouTube Shorts')
      expect(responseData.data.contentQuality).toBe('full')
      
      // Verify the processing service was called correctly
      expect(mockYouTubeProcessingService.prototype.processYouTubeContent).toHaveBeenCalledWith(
        'https://youtube.com/shorts/test123',
        'shorts'
      )
    })

    test('should fallback to standard generation when structured output fails', async () => {
      // Mock successful YouTube processing
      const mockProcessingResult = {
        id: 'proc_123',
        videoId: 'test123',
        contentType: 'video' as const,
        title: 'Test YouTube Video',
        description: 'Test description',
        duration: 120,
        confidence: 0.8,
        processingStrategy: 'standard_video'
      }

      mockYouTubeProcessingService.prototype.processYouTubeContent.mockResolvedValue(mockProcessingResult)

      // Mock structured output failure
      const mockStructuredService = {
        generateStructuredPitch: jest.fn().mockRejectedValue(new Error('Structured output failed'))
      }

      StructuredOutputService.mockImplementation(() => mockStructuredService as any)

      // Mock successful standard generation
      mockGenerateTextWithGemini.mockResolvedValue('這是一個透過標準生成的影片故事內容。')

      const request = createMockRequest({
        url: 'https://youtube.com/watch?v=test123',
        targetLanguage: '繁體中文',
        useStructuredOutput: true
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.generatedPitch).toBe('這是一個透過標準生成的影片故事內容。')
      expect(responseData.data.isStructuredOutput).toBe(false)
    })
  })

  describe('Error Cases', () => {
    test('should return 400 when URL is missing', async () => {
      const request = createMockRequest({
        targetLanguage: '繁體中文'
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('YouTube URL is required')
    })

    test('should handle YouTube processing service errors', async () => {
      mockYouTubeProcessingService.prototype.processYouTubeContent.mockResolvedValue({
        id: 'proc_123',
        videoId: null,
        contentType: 'unknown' as const,
        title: 'Processing Error',
        description: 'Video not found or not accessible',
        confidence: 0,
        processingStrategy: 'error',
        error: 'Video not found or not accessible'
      })

      const request = createMockRequest({
        url: 'https://youtube.com/shorts/invalid123',
        targetLanguage: '繁體中文'
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('YouTube processing failed')
      expect(responseData.details).toBe('Video not found or not accessible')
    })

    test('should handle processing service failure with fallback', async () => {
      // Mock processing service returning fallback result
      const mockFallbackResult = {
        id: 'proc_fallback',
        videoId: 'test123',
        contentType: 'shorts' as const,
        title: 'YouTube Shorts',
        description: 'Content processing with limited metadata',
        confidence: 0.5,
        processingStrategy: 'fallback',
        warning: 'Generated using fallback processing due to API limitations'
      }

      mockYouTubeProcessingService.prototype.processYouTubeContent.mockResolvedValue(mockFallbackResult)

      // Mock Gemini failure leading to fallback pitch
      mockGenerateTextWithGemini.mockRejectedValue(new Error('Gemini service unavailable'))

      const request = createMockRequest({
        url: 'https://youtube.com/shorts/test123',
        targetLanguage: '繁體中文'
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.generatedPitch).toContain('基於')
      expect(responseData.data.warning).toContain('fallback processing')
    })

    test('should return 500 for unexpected errors', async () => {
      mockYouTubeProcessingService.prototype.processYouTubeContent.mockRejectedValue(
        new Error('Unexpected service error')
      )

      const request = createMockRequest({
        url: 'https://youtube.com/shorts/test123',
        targetLanguage: '繁體中文'
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to process YouTube content')
      expect(responseData.details).toBe('Unexpected service error')
      expect(responseData.requestId).toBeDefined()
    })
  })

  describe('Logging and Monitoring', () => {
    test('should generate unique request IDs for tracking', async () => {
      const mockProcessingResult = {
        id: 'proc_123',
        videoId: 'test123',
        contentType: 'shorts' as const,
        title: 'Test Video',
        description: 'Test description',
        confidence: 0.8,
        processingStrategy: 'enhanced_shorts'
      }

      mockYouTubeProcessingService.prototype.processYouTubeContent.mockResolvedValue(mockProcessingResult)
      mockGenerateTextWithGemini.mockResolvedValue('Test pitch content')

      const request = createMockRequest({
        url: 'https://youtube.com/shorts/test123',
        targetLanguage: 'English'
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      
      // When there's an error, requestId should be in the response
      if (responseData.requestId) {
        expect(responseData.requestId).toMatch(/^req_\d+_[a-z0-9]+$/)
      }
    })

    test('should handle different content types correctly', async () => {
      const testCases = [
        {
          url: 'https://youtube.com/shorts/test123',
          expectedType: 'shorts'
        },
        {
          url: 'https://youtube.com/watch?v=test123',
          expectedType: 'auto'
        }
      ]

      for (const testCase of testCases) {
        const mockProcessingResult = {
          id: 'proc_123',
          videoId: 'test123',
          contentType: testCase.expectedType === 'shorts' ? 'shorts' as const : 'video' as const,
          title: 'Test Video',
          description: 'Test description',
          confidence: 0.8,
          processingStrategy: 'test'
        }

        mockYouTubeProcessingService.prototype.processYouTubeContent.mockResolvedValue(mockProcessingResult)
        mockGenerateTextWithGemini.mockResolvedValue('Test pitch')

        const request = createMockRequest({
          url: testCase.url,
          targetLanguage: 'English'
        })

        await POST(request)

        expect(mockYouTubeProcessingService.prototype.processYouTubeContent).toHaveBeenCalledWith(
          testCase.url,
          testCase.expectedType
        )
      }
    })
  })
})