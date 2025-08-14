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
      const prompt = this.createAnalysisPrompt()
      
      logger.info(`🎬 Starting real Gemini 2.5 Flash video analysis for: ${videoId}`)
      logger.info(`📹 Video GCS URI: ${gcsUri}`)
      
      // 🎯 使用真正的 Gemini 2.5 Flash 多模態視頻分析
      const response = await this.callGeminiVideoAPI(gcsUri, prompt, videoId)

      logger.info(`✅ Real video analysis completed`, {
        videoId,
        responseLength: response.length,
        preview: response.substring(0, 200)
      })

      // 解析 Gemini 的回應
      return this.parseAnalysisResponse(response, videoId)

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
          maxOutputTokens: 8192,  // Gemini 2.5 Flash 的實際輸出限制
          topP: 0.8,
          topK: 40
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
    return `
分析此YouTube Shorts視頻，用JSON格式簡潔回答：

{
  "generatedTranscript": "視頻的完整對話、旁白和關鍵視覺動作（限500字）",
  "sceneBreakdown": [
    {
      "startTime": 0,
      "endTime": 10,
      "description": "場景的核心內容",
      "setting": "場景環境",
      "actions": ["主要動作"],
      "visualDetails": "關鍵視覺細節"
    }
  ],
  "characters": [
    {
      "name": "角色名或描述",
      "description": "外觀和特徵",
      "role": "角色定位",
      "appearances": [{"startTime": 0, "endTime": 30}],
      "characteristics": "顯著特點"
    }
  ],
  "dialogues": [
    {
      "startTime": 0,
      "endTime": 5,
      "speaker": "說話者",
      "text": "對話內容",
      "emotion": "情緒",
      "language": "語言"
    }
  ],
  "visualElements": [
    {
      "type": "類型",
      "name": "名稱",
      "description": "描述",
      "timeRanges": [{"startTime": 0, "endTime": 10}],
      "importance": "high"
    }
  ],
  "storyStructure": {
    "hook": "開頭亮點",
    "development": "發展過程",
    "climax": "高潮時刻",
    "resolution": "結尾處理"
  },
  "audioAnalysis": {
    "hasDialogue": true,
    "backgroundMusic": "音樂類型",
    "soundEffects": ["音效"],
    "voiceCharacteristics": "聲音特點"
  },
  "mood": "整體氛圍",
  "themes": ["主題"],
  "cameraWork": "拍攝手法",
  "keyMoments": [
    {
      "timestamp": 5,
      "description": "關鍵描述",
      "importance": "high",
      "type": "visual",
      "reason": "重要原因"
    }
  ],
  "contentSummary": "50字內核心總結",
  "confidence": 0.9
}

重要：保持簡潔，避免冗長描述。總輸出控制在5000字內。
`
  }

  private parseAnalysisResponse(responseText: string, videoId: string): VideoAnalysis {
    try {
      // 檢測可能的JSON截斷
      if (responseText.length > 9000 && !responseText.trim().endsWith('}')) {
        logger.warn(`⚠️ Possible JSON truncation detected`, {
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
      const jsonEnd = cleanedResponse.lastIndexOf('}')
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1)
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

      // 創建降級回應
      return this.createFallbackAnalysis(responseText, videoId)
    }
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