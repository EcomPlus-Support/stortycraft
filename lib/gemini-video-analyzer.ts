import { Storage } from '@google-cloud/storage'
import { logger } from '@/lib/logger'
import { existsSync } from 'fs'
import { GeminiDirectService } from '@/lib/gemini-direct'
import { getVertexAIConfig } from '@/lib/config'
import { getAuthManager } from '@/lib/auth'

export interface VideoAnalysis {
  generatedTranscript: string
  sceneBreakdown: SceneDescription[]
  characters: CharacterDescription[]
  dialogues: DialogueSegment[]
  visualElements: VisualElement[]
  storyStructure: StoryStructure
  audioAnalysis: AudioAnalysis
  mood: string
  themes: string[]
  cameraWork: string
  keyMoments: KeyMoment[]
  contentSummary: string
  confidence: number
}

export interface SceneDescription {
  startTime: number
  endTime: number
  description: string
  setting: string
  actions: string[]
  visualDetails: string
}

export interface CharacterDescription {
  name: string
  description: string
  role: string
  appearances: TimeRange[]
  characteristics: string
}

export interface DialogueSegment {
  startTime: number
  endTime: number
  speaker: string
  text: string
  emotion: string
  language: string
}

export interface VisualElement {
  type: 'object' | 'text' | 'effect' | 'transition' | 'background'
  name: string
  description: string
  timeRanges: TimeRange[]
  importance: 'high' | 'medium' | 'low'
}

export interface TimeRange {
  startTime: number
  endTime: number
}

export interface StoryStructure {
  hook: string          // 前 3 秒鉤子
  development: string   // 發展階段
  climax: string        // 高潮時刻
  resolution: string    // 結尾解決
}

export interface KeyMoment {
  timestamp: number
  description: string
  importance: 'high' | 'medium' | 'low'
  type: 'visual' | 'audio' | 'action' | 'dialogue'
  reason: string
}

export interface AudioAnalysis {
  hasDialogue: boolean
  backgroundMusic: string
  soundEffects: string[]
  voiceCharacteristics: string
}

export class GeminiVideoAnalyzer {
  private storage: Storage
  private geminiService: GeminiDirectService
  private projectId: string
  private location: string

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'fechen-aifactory'
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    
    // 初始化 Gemini Direct Service
    this.geminiService = new GeminiDirectService()

    // 初始化 Cloud Storage (用於臨時上傳)
    this.storage = new Storage({
      projectId: this.projectId
    })
  }

  async analyzeVideoFile(filePath: string, videoId: string): Promise<VideoAnalysis> {
    const startTime = Date.now()
    logger.info(`🎬 Starting video analysis for ${videoId}`)

    try {
      // 1. 上傳到 GCS (臨時)
      const gcsUri = await this.uploadToTempStorage(filePath, videoId)
      
      // 2. 使用 Gemini 分析視頻
      const analysis = await this.performVideoAnalysis(gcsUri, videoId)
      
      // 3. 清理 GCS 臨時檔案
      await this.cleanupTempStorage(gcsUri)
      
      const elapsed = Date.now() - startTime
      logger.info(`✅ Video analysis completed in ${elapsed}ms`, {
        videoId,
        confidence: analysis.confidence
      })

      return analysis

    } catch (error) {
      logger.error(`❌ Video analysis failed for ${videoId}`, { error })
      throw new Error(`Video analysis failed: ${error}`)
    }
  }

  private async uploadToTempStorage(filePath: string, videoId: string): Promise<string> {
    if (!existsSync(filePath)) {
      throw new Error(`Video file not found: ${filePath}`)
    }

    const bucketName = 'storycraft-video-temp'
    const fileName = `shorts/${videoId}_${Date.now()}.mp4`
    
    try {
      // 確保 bucket 存在
      const bucket = this.storage.bucket(bucketName)
      const [exists] = await bucket.exists()
      
      if (!exists) {
        logger.info(`Creating temporary storage bucket: ${bucketName}`)
        await bucket.create({
          location: this.location,
          storageClass: 'STANDARD',
          lifecycle: {
            rule: [{
              action: { type: 'Delete' },
              condition: { age: 1 } // 1 天後自動刪除
            }]
          }
        })
      }

      // 上傳檔案
      logger.info(`📤 Uploading to GCS: gs://${bucketName}/${fileName}`)
      await bucket.upload(filePath, {
        destination: fileName,
        metadata: {
          cacheControl: 'no-cache',
          metadata: {
            videoId,
            uploadTime: new Date().toISOString(),
            purpose: 'shorts-analysis'
          }
        }
      })

      return `gs://${bucketName}/${fileName}`

    } catch (error) {
      logger.error('Failed to upload to GCS', { filePath, error })
      throw new Error(`GCS upload failed: ${error}`)
    }
  }

  private async performVideoAnalysis(gcsUri: string, videoId: string): Promise<VideoAnalysis> {
    try {
      // 分階段提示策略
      const prompts = [
        this.createAnalysisPrompt(),           // 極簡版本
        this.createMinimalAnalysisPrompt()     // 超級精簡版本（備用）
      ]
      
      logger.info(`🎬 Starting real Gemini 2.5 Flash video analysis for: ${videoId}`)
      logger.info(`📹 Video GCS URI: ${gcsUri}`)
      
      let lastError: any = null
      
      // 嘗試不同複雜度的提示
      for (let i = 0; i < prompts.length; i++) {
        try {
          const prompt = prompts[i]
          logger.info(`🎯 Attempting analysis with prompt strategy ${i + 1}/${prompts.length}`)
          
          // 使用真正的 Gemini 2.5 Flash 多模態視頻分析
          const response = await this.callGeminiVideoAPI(gcsUri, prompt, videoId)

          logger.info(`✅ Real video analysis completed`, {
            videoId,
            responseLength: response.length,
            preview: response.substring(0, 200),
            promptStrategy: i + 1
          })

          // 解析 Gemini 的回應
          return this.parseAnalysisResponse(response, videoId)
          
        } catch (error) {
          lastError = error
          logger.warn(`⚠️ Prompt strategy ${i + 1} failed, trying next...`, { error })
          
          // 如果是截斷錯誤，繼續嘗試更簡單的提示
          if (error instanceof Error && error.message.includes('truncat')) {
            continue
          }
          
          // 其他錯誤直接拋出
          throw error
        }
      }

      // 所有策略都失敗
      logger.error('❌ All prompt strategies failed', { gcsUri, videoId, lastError })
      throw new Error(`Real video analysis failed after all strategies: ${lastError}`)
      
    } catch (error) {
      logger.error('❌ Gemini 2.5 Flash video analysis failed', { gcsUri, videoId, error })
      throw new Error(`Real video analysis failed: ${error}`)
    }
  }

  /**
   * 🎯 核心方法：使用 Gemini 2.5 Flash 真正的视频分析功能
   */
  private async callGeminiVideoAPI(gcsUri: string, prompt: string, videoId: string): Promise<string> {
    const config = getVertexAIConfig()
    
    try {
      // 获取访问令牌
      const authManager = getAuthManager()
      const accessToken = await authManager.getAccessToken()
      
      logger.info(`🔑 Access token obtained for video analysis`)
      
      // 构建多模态请求体
      const requestBody = {
        contents: [{
          role: 'user',
          parts: [
            {
              text: prompt
            },
            {
              file_data: {
                mime_type: 'video/mp4',
                file_uri: gcsUri
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,  // 保持充足的輸出空間
          topP: 0.7,
          topK: 20
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      }
      
      logger.info(`🚀 Sending multimodal request to Gemini 2.5 Flash`, {
        videoId,
        gcsUri,
        promptLength: prompt.length
      })
      
      // 调用 Gemini 2.5 Flash API
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
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        logger.error(`❌ Gemini API request failed`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`)
      }
      
      const result = await response.json()
      
      logger.info(`✅ Gemini 2.5 Flash response received`, {
        videoId,
        responseStructure: result.candidates ? 'Valid' : 'Invalid',
        candidatesCount: result.candidates?.length || 0
      })
      
      // 提取生成的文本
      if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
        const generatedText = result.candidates[0].content.parts[0].text
        logger.info(`📄 Generated analysis text length: ${generatedText.length}`)
        
        // 預防性檢查：如果回應接近截斷限制，發出警告
        if (generatedText.length > 9000) {
          logger.warn(`⚠️ Response approaching truncation limit`, {
            videoId,
            responseLength: generatedText.length,
            truncationRisk: 'HIGH'
          })
        }
        
        return generatedText
      } else {
        logger.error(`❌ Unexpected response structure from Gemini`, {
          result: JSON.stringify(result, null, 2)
        })
        throw new Error('No valid content generated from Gemini video analysis')
      }
      
    } catch (error) {
      logger.error(`💥 Critical error in Gemini video API call`, {
        videoId,
        gcsUri,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  private createAnalysisPrompt(): string {
    return `分析視頻，用JSON回答（極簡版本）：
{
  "generatedTranscript": "主要對話/動作50字內",
  "sceneBreakdown": [{"startTime":0,"endTime":30,"description":"場景","setting":"地點","actions":["動作"],"visualDetails":"細節"}],
  "characters": [{"name":"主角","description":"描述10字","role":"角色","appearances":[{"startTime":0,"endTime":30}],"characteristics":"特徵"}],
  "storyStructure": {"hook":"開頭5字","development":"發展5字","climax":"高潮5字","resolution":"結尾5字"},
  "audioAnalysis": {"hasDialogue":true,"backgroundMusic":"音樂","soundEffects":["音效"],"voiceCharacteristics":"聲音"},
  "mood": "氛圍",
  "themes": ["主題"],
  "cameraWork": "拍攝",
  "contentSummary": "總結15字",
  "confidence": 0.9
}
規則：最多2場景2角色，每字段限10字`
  }
  
  /**
   * 超級精簡版本提示（當第一個版本仍然太長時使用）
   */
  private createMinimalAnalysisPrompt(): string {
    return `極簡JSON分析：
{"generatedTranscript":"內容20字","sceneBreakdown":[{"startTime":0,"endTime":30,"description":"場景"}],"characters":[],"storyStructure":{"hook":"開","development":"展","climax":"轉","resolution":"合"},"audioAnalysis":{"hasDialogue":true},"mood":"氛圍","themes":["主題"],"cameraWork":"拍攝","contentSummary":"總結10字","confidence":0.8}`
  }

  private parseAnalysisResponse(responseText: string, videoId: string): VideoAnalysis {
    try {
      // 檢測可能的JSON截斷
      const isTruncated = responseText.length > 9000 && !responseText.trim().endsWith('}')
      if (isTruncated) {
        logger.warn(`⚠️ JSON truncation detected, attempting recovery`, {
          videoId,
          responseLength: responseText.length,
          lastChars: responseText.slice(-100)
        })
      }
      
      // 更強健的清理回應文字，移除可能的 markdown 格式和不完整的JSON
      let cleanedResponse = responseText.trim()
      
      // 移除 markdown 代碼塊標記
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/\s*```$/g, '')
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\s*/g, '').replace(/\s*```$/g, '')
      }
      
      // 找到JSON開始和結束位置
      const jsonStart = cleanedResponse.indexOf('{')
      let jsonEnd = cleanedResponse.lastIndexOf('}')
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1)
      }
      
      // 如果檢測到截斷，嘗試智能修復
      if (isTruncated && !cleanedResponse.endsWith('}')) {
        cleanedResponse = this.repairTruncatedJson(cleanedResponse, videoId)
      }
      
      logger.info(`🧹 Cleaned JSON for parsing`, {
        videoId,
        originalLength: responseText.length,
        cleanedLength: cleanedResponse.length,
        preview: cleanedResponse.substring(0, 200)
      })

      // 解析 JSON
      const analysis = JSON.parse(cleanedResponse) as VideoAnalysis

      // 驗證必要欄位
      if (!analysis.generatedTranscript) {
        throw new Error('Missing generated transcript')
      }

      // 設置預設值
      analysis.confidence = analysis.confidence || 0.8
      analysis.sceneBreakdown = analysis.sceneBreakdown || []
      analysis.characters = analysis.characters || []
      analysis.dialogues = analysis.dialogues || []
      analysis.visualElements = analysis.visualElements || []
      analysis.keyMoments = analysis.keyMoments || []
      analysis.themes = analysis.themes || []
      analysis.cameraWork = analysis.cameraWork || '標準拍攝手法'
      analysis.contentSummary = analysis.contentSummary || '影片內容分析'
      
      // 設置音頻分析預設值
      if (!analysis.audioAnalysis) {
        analysis.audioAnalysis = {
          hasDialogue: analysis.dialogues.length > 0,
          backgroundMusic: '未檢測到背景音樂',
          soundEffects: [],
          voiceCharacteristics: '未分析語音特徵'
        }
      }

      // 如果沒有故事結構，創建基本結構
      if (!analysis.storyStructure) {
        analysis.storyStructure = {
          hook: '影片開頭吸引觀眾注意',
          development: '主要內容展開',
          climax: '關鍵時刻或轉折點',
          resolution: '結尾總結或行動呼籲'
        }
      }

      logger.info(`📊 Analysis parsing successful`, {
        videoId,
        transcriptLength: analysis.generatedTranscript.length,
        scenesCount: analysis.sceneBreakdown.length,
        charactersCount: analysis.characters.length,
        dialoguesCount: analysis.dialogues.length
      })

      return analysis

    } catch (error) {
      logger.error('Failed to parse analysis response', {
        videoId,
        error,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 500),
        responseEnd: responseText.slice(-200),
        errorPosition: error instanceof SyntaxError && error.message.includes('position') ? 
          error.message.match(/position (\d+)/)?.[1] : 'unknown'
      })

      // 嘗試從部分內容中提取有用信息
      const partialAnalysis = this.extractPartialAnalysis(responseText, videoId)
      if (partialAnalysis) {
        logger.info(`✅ Recovered partial analysis for ${videoId}`)
        return partialAnalysis
      }

      // 創建降級回應
      return this.createFallbackAnalysis(responseText, videoId)
    }
  }

  /**
   * 智能修復截斷的JSON
   */
  private repairTruncatedJson(json: string, videoId: string): string {
    logger.info(`🔧 Attempting to repair truncated JSON for ${videoId}`)
    
    let repaired = json
    
    // 計算需要的閉合括號
    const openBraces = (json.match(/\{/g) || []).length
    const closeBraces = (json.match(/\}/g) || []).length
    const openBrackets = (json.match(/\[/g) || []).length
    const closeBrackets = (json.match(/\]/g) || []).length
    
    // 如果JSON在字符串中間截斷，嘗試閉合當前字符串
    if (json.includes('"') && !json.endsWith('"') && !json.endsWith('}')) {
      const lastQuote = json.lastIndexOf('"')
      const afterLastQuote = json.substring(lastQuote + 1)
      // 如果最後一個引號後有內容但沒有閉合，添加引號
      if (afterLastQuote.length > 0 && !afterLastQuote.includes('"')) {
        repaired += '"'
      }
    }
    
    // 閉合數組
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      repaired += ']'
    }
    
    // 閉合對象
    for (let i = 0; i < openBraces - closeBraces; i++) {
      repaired += '}'
    }
    
    logger.info(`🔧 JSON repair completed`, {
      videoId,
      originalLength: json.length,
      repairedLength: repaired.length,
      addedChars: repaired.length - json.length
    })
    
    return repaired
  }
  
  /**
   * 從部分響應中提取可用的分析數據
   */
  private extractPartialAnalysis(responseText: string, videoId: string): VideoAnalysis | null {
    try {
      logger.info(`🔍 Attempting to extract partial analysis for ${videoId}`)
      
      // 提取生成的轉錄文本
      const transcriptMatch = responseText.match(/"generatedTranscript"\s*:\s*"([\s\S]*?)"/)
      const transcript = transcriptMatch ? transcriptMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : ''
      
      // 提取場景信息
      const scenesMatch = responseText.match(/"sceneBreakdown"\s*:\s*\[([\s\S]*?)\]/)
      let scenes: any[] = []
      if (scenesMatch) {
        try {
          scenes = JSON.parse(`[${scenesMatch[1]}]`)
        } catch {
          // 忽略場景解析錯誤
        }
      }
      
      // 提取角色信息
      const charactersMatch = responseText.match(/"characters"\s*:\s*\[([\s\S]*?)\]/)
      let characters: any[] = []
      if (charactersMatch) {
        try {
          characters = JSON.parse(`[${charactersMatch[1]}]`)
        } catch {
          // 忽略角色解析錯誤
        }
      }
      
      if (transcript && transcript.length > 50) {
        logger.info(`✅ Successfully extracted partial analysis`, {
          videoId,
          transcriptLength: transcript.length,
          scenesCount: scenes.length,
          charactersCount: characters.length
        })
        
        return {
          generatedTranscript: transcript,
          sceneBreakdown: scenes.length > 0 ? scenes : this.createDefaultScenes(),
          characters: characters.length > 0 ? characters : [],
          dialogues: [],
          visualElements: [],
          storyStructure: {
            hook: '影片開頭部分',
            development: '主要內容展開',
            climax: '關鍵時刻',
            resolution: '結尾處理'
          },
          audioAnalysis: {
            hasDialogue: transcript.includes('對話') || transcript.includes('說'),
            backgroundMusic: '背景音樂分析',
            soundEffects: [],
            voiceCharacteristics: '語音特徵分析'
          },
          mood: '從部分內容推斷的氛圍',
          themes: ['部分分析主題'],
          cameraWork: '攝影手法分析',
          keyMoments: [],
          contentSummary: transcript.length > 100 ? transcript.substring(0, 100) + '...' : transcript,
          confidence: 0.6 // 中等信心度，因為是部分分析
        }
      }
      
      return null
      
    } catch (error) {
      logger.warn(`Failed to extract partial analysis for ${videoId}`, { error })
      return null
    }
  }
  
  /**
   * 創建默認場景結構
   */
  private createDefaultScenes(): any[] {
    return [
      {
        startTime: 0,
        endTime: 20,
        description: '影片開始場景',
        setting: '初始環境',
        actions: ['開場動作'],
        visualDetails: '視覺細節'
      }
    ]
  }

  private createFallbackAnalysis(rawResponse: string, videoId: string): VideoAnalysis {
    logger.warn(`Creating fallback analysis for ${videoId}`)
    
    return {
      generatedTranscript: rawResponse.length > 1000 ? rawResponse.substring(0, 1000) + '...' : rawResponse,
      sceneBreakdown: [{
        startTime: 0,
        endTime: 30,
        description: '影片場景分析失敗，使用原始回應',
        setting: '未知環境',
        actions: ['分析中發生錯誤'],
        visualDetails: '分析失敗'
      }],
      characters: [],
      dialogues: [],
      visualElements: [],
      storyStructure: {
        hook: '開頭內容',
        development: '主要內容',
        climax: '重點時刻',
        resolution: '結尾部分'
      },
      audioAnalysis: {
        hasDialogue: false,
        backgroundMusic: '未分析',
        soundEffects: [],
        voiceCharacteristics: '未分析'
      },
      mood: '未知',
      themes: [],
      cameraWork: '未分析',
      keyMoments: [],
      contentSummary: '分析失敗，使用降級模式',
      confidence: 0.3 // 低信心度表示這是降級回應
    }
  }

  private async cleanupTempStorage(gcsUri: string): Promise<void> {
    try {
      const uriParts = gcsUri.replace('gs://', '').split('/')
      const bucketName = uriParts[0]
      const fileName = uriParts.slice(1).join('/')

      await this.storage.bucket(bucketName).file(fileName).delete()
      logger.info(`🧹 Cleaned up GCS temp file: ${gcsUri}`)

    } catch (error) {
      logger.warn(`⚠️ Failed to cleanup GCS file: ${gcsUri}`, { error })
    }
  }

  // 檢查服務可用性
  async checkAvailability(): Promise<boolean> {
    try {
      // 使用 GeminiDirectService 進行測試
      const testResponse = await this.geminiService.generateText(
        'Hello, are you available for video analysis?', 
        {
          temperature: 0.1,
          maxOutputTokens: 50
        }
      )

      const hasResponse = testResponse.length > 0
      logger.info(`✅ Gemini video analysis service available: ${hasResponse}`)
      return hasResponse

    } catch (error) {
      logger.error('❌ Gemini video analysis service unavailable', { error })
      return false
    }
  }
}

// 單例實例
export const geminiVideoAnalyzer = new GeminiVideoAnalyzer()