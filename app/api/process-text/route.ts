import { NextRequest, NextResponse } from 'next/server'
import { generateTextWithGemini } from '@/lib/gemini-service'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const requestId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info(`🚀 [${requestId}] Starting text processing request`)
    
    const { text, targetLanguage = '繁體中文', style = 'tiktok-viral' } = await request.json()
    
    logger.info(`📝 [${requestId}] Request parameters:`, {
      textLength: text?.length || 0,
      targetLanguage,
      style,
      timestamp: new Date().toISOString()
    })
    
    if (!text || text.trim().length < 10) {
      logger.warn(`❌ [${requestId}] Text too short or missing`)
      return NextResponse.json(
        { error: 'Text content must be at least 10 characters long' },
        { status: 400 }
      )
    }

    // Generate pitch from text content
    logger.info(`🤖 [${requestId}] Generating pitch from text content`)
    
    const prompt = `Create a compelling video pitch based on this text content.

Text Content: ${text}
Target Language: ${targetLanguage}
Style: ${style}

Create an engaging story pitch that captures the essence of the content and would work well for video. Focus on creating a narrative structure with clear beginning, middle, and end.

Return a detailed pitch in ${targetLanguage} that tells a compelling story based on the provided text.`
    
    try {
      const generatedPitch = await generateTextWithGemini(prompt, {
        temperature: 0.7,
        maxTokens: 4000
      })
      
      if (!generatedPitch || generatedPitch.trim().length < 50) {
        throw new Error('Generated pitch too short')
      }
      
      // Extract simple keywords from text
      const keywords = text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s\u4e00-\u9fff]/g, ' ')
        .split(/\s+/)
        .filter((word: string) => word.length > 2)
        .slice(0, 5)
      
      const result = {
        id: `result_${Date.now()}`,
        source: {
          id: `text_${Date.now()}`,
          type: 'text_input' as const,
          title: 'Text Input',
          description: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          transcript: text,
          processingStatus: 'completed' as const
        },
        extractedContent: {
          title: 'Text Input',
          description: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          transcript: text,
          keyTopics: keywords,
          sentiment: 'positive',
          duration: 0
        },
        generatedPitch,
        contentQuality: 'full' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        isStructuredOutput: false
      }
      
      logger.info(`✅ [${requestId}] Text processing completed successfully`)
      
      return NextResponse.json({
        success: true,
        data: result
      })
      
    } catch (geminiError) {
      logger.error(`🤖 [${requestId}] Gemini generation failed:`, geminiError)
      
      // Fallback pitch
      const fallbackPitch = targetLanguage === '繁體中文' 
        ? `基於您提供的文字內容，這是一個引人入勝的故事。內容探討了${text.substring(0, 100)}的主題，適合轉化為視覺化的影片內容。`
        : `Based on your provided text content, this is an engaging story that explores themes from the original text and can be transformed into compelling visual content.`
      
      const result = {
        id: `result_${Date.now()}`,
        source: {
          id: `text_${Date.now()}`,
          type: 'text_input' as const,
          title: 'Text Input',
          description: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          transcript: text,
          processingStatus: 'completed' as const
        },
        extractedContent: {
          title: 'Text Input',
          description: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          transcript: text,
          keyTopics: ['fallback'],
          sentiment: 'positive',
          duration: 0
        },
        generatedPitch: fallbackPitch,
        contentQuality: 'full' as const,
        warning: 'Generated using fallback due to AI service limitations',
        createdAt: new Date(),
        updatedAt: new Date(),
        isStructuredOutput: false
      }
      
      return NextResponse.json({
        success: true,
        data: result
      })
    }

  } catch (error) {
    logger.error(`💥 [${requestId}] Critical API error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to process text content',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId
      },
      { status: 500 }
    )
  }
}