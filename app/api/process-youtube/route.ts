import { NextRequest, NextResponse } from 'next/server'
import { YouTubeProcessingService } from '@/lib/youtube-processing-service'
import { generateTextWithGemini } from '@/lib/gemini-service'
import { StructuredOutputService } from '@/lib/structured-output-service'
import { GeminiDirectService } from '@/lib/gemini-direct'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info(`🚀 [${requestId}] Starting YouTube processing request`)
    
    const { url, targetLanguage = '繁體中文', useStructuredOutput: initialStructuredOutput = true } = await request.json()
    let useStructuredOutput = initialStructuredOutput
    
    logger.info(`📋 [${requestId}] Request parameters:`, {
      url,
      targetLanguage,
      useStructuredOutput,
      timestamp: new Date().toISOString()
    })
    
    if (!url) {
      logger.warn(`❌ [${requestId}] Missing URL parameter`)
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      )
    }

    // Step 1: Initialize YouTube processing service
    logger.info(`🎬 [${requestId}] Initializing YouTube processing service`)
    const processingService = new YouTubeProcessingService()
    
    // Step 2: Process YouTube content
    logger.info(`📺 [${requestId}] Processing YouTube content: ${url}`)
    const processingResult = await processingService.processYouTubeContent(
      url,
      /youtube\.com\/shorts\//.test(url) ? 'shorts' : 'auto'
    )
    
    logger.info(`✅ [${requestId}] YouTube processing completed:`, {
      strategy: processingResult.processingStrategy,
      confidence: processingResult.confidence,
      hasVideoAnalysis: processingResult.hasVideoAnalysis,
      contentType: processingResult.contentType
    })
    
    if (processingResult.error) {
      logger.error(`❌ [${requestId}] Processing service returned error:`, processingResult.error)
      return NextResponse.json(
        { 
          error: 'YouTube processing failed',
          details: processingResult.error
        },
        { status: 400 }
      )
    }
    
    if (!processingResult.title) {
      logger.warn(`⚠️ [${requestId}] No title extracted from YouTube content`)
      return NextResponse.json(
        { error: 'Failed to extract YouTube metadata - no title found' },
        { status: 400 }
      )
    }

    // Step 3: Generate pitch using structured output
    logger.info(`🤖 [${requestId}] Starting pitch generation with structured output`)
    
    // Extract content from multiple sources including video analysis
    let content = processingResult.transcript || processingResult.description || ''
    
    // If we have video analysis but little text content, use the analysis
    if (content.length < 50 && processingResult.hasVideoAnalysis && processingResult.videoAnalysis) {
      const analysis = processingResult.videoAnalysis
      const analysisContent = [
        analysis.generatedTranscript || '',
        analysis.sceneBreakdown?.map(scene => `場景: ${scene.description}`).join(', ') || '',
        analysis.characters?.map(char => `角色: ${char.name} - ${char.description}`).join(', ') || '',
        analysis.dialogues?.map(dialogue => dialogue.text).join(' ') || ''
      ].filter(Boolean).join('. ')
      
      if (analysisContent.length > content.length) {
        content = analysisContent
        logger.info(`📹 [${requestId}] Using video analysis content (${content.length} chars)`)
      }
    }
    const isShorts = processingResult.contentType === 'shorts'
    
    logger.info(`📝 [${requestId}] Content analysis:`, {
      contentLength: content.length,
      isShorts,
      hasTranscript: !!processingResult.transcript,
      hasVideoAnalysis: !!processingResult.hasVideoAnalysis
    })
    
    let generatedPitch = ''
    let keyTopics: string[] = []
    let structuredPitch = null
    
    if (false && useStructuredOutput && targetLanguage === '繁體中文') { // 暫時禁用結構化輸出，使用完整詳細 prompt
      logger.info(`🏗️ [${requestId}] Using structured output for Traditional Chinese`)
      
      try {
        const geminiDirect = new GeminiDirectService()
        const structuredService = new StructuredOutputService(geminiDirect)
        
        const result = await structuredService.generateStructuredPitch(
          content,
          processingResult.transcript ? 'full' : 'partial'
        )
        
        if (result && result.finalPitch) {
          generatedPitch = result.finalPitch
          keyTopics = result.tags || result.characters?.map(c => c.name) || []
          structuredPitch = result
          logger.info(`✅ [${requestId}] Structured pitch generated successfully (${generatedPitch.length} chars)`)
        } else {
          throw new Error('Structured output returned empty result')
        }
      } catch (structuredError) {
        logger.warn(`⚠️ [${requestId}] Structured output failed, falling back to standard generation:`, structuredError)
        // Fallback to standard generation
        useStructuredOutput = false
      }
    }
    
    if (!generatedPitch) {
      logger.info(`📝 [${requestId}] Using standard pitch generation`)
      
      const prompt = `你是專業的故事創作專家，需要根據以下YouTube${isShorts ? ' Shorts' : ''}影片內容創作完整的視覺故事腳本：

影片標題：${processingResult.title}
影片內容：${content}
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

**病毒傳播潛力分析：**
- 分享動機：觀眾分享此內容的核心原因
- 互動引導：評論區討論話題設計
- 系列發展：後續內容方向建議
- 目標群體：主要觀眾特徵分析

**製作執行建議：**
- 拍攝要點：關鍵畫面捕捉技巧
- 後製重點：剪輯和特效要求
- 發布策略：最佳發布時間和平台選擇
- 標題標籤：優化搜索和推薦的關鍵詞

請確保內容豐富詳細，字數約400-800字，適合製作成引人入勝的視頻內容。使用${targetLanguage}創作。`
      
      try {
        const response = await generateTextWithGemini(prompt, {
          temperature: 0.7,
          maxTokens: 4000
        })
        
        generatedPitch = response || 'Unable to generate pitch - please try again'
        keyTopics = [processingResult.title.split(' ').slice(0, 3).join(' ')]
        
        logger.info(`✅ [${requestId}] Standard pitch generated (${generatedPitch.length} chars)`)
      } catch (geminiError) {
        logger.error(`❌ [${requestId}] Gemini generation failed:`, geminiError)
        generatedPitch = `基於「${processingResult.title}」的精彩內容，這是一個引人入勝的故事，值得透過視覺化的方式來呈現給觀眾。`
        keyTopics = ['fallback']
      }
    }

    // Step 4: Build response
    const result = {
      id: `result_${Date.now()}`,
      source: {
        id: processingResult.id,
        type: 'youtube' as const,
        url,
        title: processingResult.title,
        description: processingResult.description,
        transcript: processingResult.transcript,
        duration: processingResult.duration,
        thumbnail: processingResult.thumbnail,
        processingStatus: 'completed' as const,
        videoAnalysis: processingResult.videoAnalysis,
        hasVideoAnalysis: processingResult.hasVideoAnalysis,
        videoAnalysisQuality: processingResult.videoAnalysisQuality
      },
      extractedContent: {
        title: processingResult.title,
        description: processingResult.description || '',
        transcript: processingResult.transcript || '',
        keyTopics,
        sentiment: 'positive',
        duration: processingResult.duration || 0
      },
      generatedPitch,
      contentQuality: processingResult.transcript ? 'full' : 'partial' as const,
      warning: processingResult.warning,
      createdAt: new Date(),
      updatedAt: new Date(),
      structuredPitch,
      isStructuredOutput: !!structuredPitch
    }
    
    logger.info(`🎉 [${requestId}] Request completed successfully`)

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    logger.error(`💥 [${requestId}] Critical API error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to process YouTube content',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId
      },
      { status: 500 }
    )
  }
}