import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, unlinkSync, mkdirSync, statSync, readdirSync } from 'fs'
import { join } from 'path'
import { logger } from '@/lib/logger'

const execAsync = promisify(exec)

export interface VideoDownloadResult {
  filePath: string
  duration: number
  resolution: string
  fileSize: number
  format: string
  mimeType: string
  actualFormat?: string
}

export interface VideoInfo {
  duration: number
  title: string
  resolution: string
  formats: any[]
  availableFormats?: string[]
}

export class YouTubeShortsDownloader {
  private tempDir: string
  private readonly maxDurationSeconds = 60 // 只下載 60 秒以內的影片
  private readonly maxFileSizeMB = 50 // 最大 50MB
  
  // 支援的格式和對應的 MIME 類型
  private readonly supportedFormats = {
    'mp4': ['video/mp4'],
    'webm': ['video/webm'], 
    'mov': ['video/quicktime'],
    'mpeg': ['video/mpeg', 'video/mpegs', 'video/mpg'],
    'flv': ['video/x-flv'],
    'wmv': ['video/wmv'],
    '3gp': ['video/3gpp'],
    'm4a': ['audio/mp4'],
    'mp3': ['audio/mpeg']
  }
  
  // 多層次格式選擇器（按優先級排序）
  private readonly formatSelectors = [
    // 第一優先：低畫質MP4（節省帶寬）
    'worst[height<=480][ext=mp4]/bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/worst[ext=mp4]',
    
    // 第二優先：任意畫質MP4
    'worst[ext=mp4]/best[ext=mp4]',
    
    // 第三優先：WebM格式
    'worst[ext=webm]/best[ext=webm]',
    
    // 第四優先：其他常見格式
    'worst[ext=mov]/best[ext=mov]',
    'worst[ext=mpeg]/best[ext=mpeg]',
    'worst[ext=flv]/best[ext=flv]',
    'worst[ext=wmv]/best[ext=wmv]',
    'worst[ext=3gp]/best[ext=3gp]',
    
    // 第五優先：所有視頻格式，按大小排序
    'worst[vcodec!^=none]/best[vcodec!^=none]',
    
    // 第六優先：音頻格式作為備用
    'worst[ext=m4a]/best[ext=m4a]',
    'worst[ext=mp3]/best[ext=mp3]',
    
    // 最後兜底：任何可用格式
    'worst/best'
  ]

  constructor() {
    // 使用系統臨時目錄，在 Cloud Run 中這是唯一可寫的位置
    this.tempDir = process.env.NODE_ENV === 'production' 
      ? join('/tmp', 'storycraft-shorts')
      : join(process.cwd(), 'temp', 'shorts')
    
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true })
      logger.info(`📁 Created temp directory: ${this.tempDir}`)
    }
  }

  async downloadShorts(videoId: string): Promise<VideoDownloadResult> {
    const startTime = Date.now()
    logger.info(`🎥 Starting enhanced multi-format download for Shorts: ${videoId}`)

    try {
      // 1. 先檢查影片資訊和可用格式
      const videoInfo = await this.getVideoInfo(videoId)
      
      // 2. 驗證是否適合下載
      this.validateForDownload(videoInfo)
      
      // 3. 使用多格式策略下載影片
      const downloadResult = await this.downloadWithMultipleFormats(videoId, videoInfo)
      
      // 4. 驗證下載的檔案
      await this.validateDownloadedFile(downloadResult.filePath)
      
      const elapsed = Date.now() - startTime
      logger.info(`✅ Multi-format download completed in ${elapsed}ms`, {
        videoId,
        format: downloadResult.format,
        mimeType: downloadResult.mimeType,
        duration: downloadResult.duration,
        fileSize: downloadResult.fileSize
      })

      return downloadResult

    } catch (error) {
      logger.error(`❌ Enhanced video download failed for ${videoId}`, { 
        error: error instanceof Error ? error.message : error,
        diagnosis: this.diagnoseDownloadFailure(error instanceof Error ? error.message : String(error), videoId)
      })
      throw new Error(`Failed to download video: ${error}`)
    }
  }

  private async getVideoInfo(videoId: string): Promise<VideoInfo> {
    const url = `https://youtube.com/shorts/${videoId}`
    
    try {
      // 使用 yt-dlp 獲取詳細影片資訊
      const command = `yt-dlp --print "%(duration)s|%(title)s|%(height)s" --list-formats "${url}"`
      const { stdout } = await execAsync(command, { timeout: 30000 })
      
      const lines = stdout.trim().split('\n')
      // 找到實際的視頻信息行（通常是最後一行，包含數字|標題|數字格式）
      const infoLine = lines.find(line => /^\d+\|.*\|\d+$/.test(line)) || lines[lines.length - 1]
      
      // 更安全的解析，處理標題中可能包含 | 的情況
      const parts = infoLine.split('|')
      const durationStr = parts[0] || '0'
      const heightStr = parts[parts.length - 1] || '0' // 取最後一部分作為高度
      const title = parts.slice(1, -1).join('|') || 'Unknown' // 中間部分作為標題
      
      const duration = parseInt(durationStr) || 0
      const height = parseInt(heightStr) || 0
      
      // 解析可用格式
      const availableFormats = this.parseAvailableFormats(stdout)
      
      logger.info(`📋 Video info retrieved`, {
        videoId,
        duration,
        availableFormats: availableFormats.length
      })
      
      return {
        duration,
        title: title || 'Unknown',
        resolution: `${height}p`,
        formats: [],
        availableFormats
      }
    } catch (error) {
      logger.warn('Detailed video info failed, trying basic info', { videoId, error })
      
      // 備用：只獲取基本資訊
      try {
        const basicCommand = `yt-dlp --print "%(duration)s|%(title)s|%(height)s" "${url}"`
        const { stdout } = await execAsync(basicCommand, { timeout: 15000 })
        
        const parts = stdout.trim().split('|')
        const durationStr = parts[0] || '0'
        const heightStr = parts[parts.length - 1] || '0'
        const title = parts.slice(1, -1).join('|') || 'Unknown'
        
        const duration = parseInt(durationStr) || 0
        const height = parseInt(heightStr) || 0
        
        return {
          duration,
          title: title || 'Unknown',
          resolution: `${height}p`,
          formats: [],
          availableFormats: []
        }
      } catch (basicError) {
        logger.error('Failed to get basic video info', { videoId, error: basicError })
        throw new Error(`Cannot get video info: ${basicError}`)
      }
    }
  }

  private validateForDownload(videoInfo: VideoInfo): void {
    // 檢查影片時長
    if (videoInfo.duration > this.maxDurationSeconds) {
      throw new Error(`Video too long: ${videoInfo.duration}s (max: ${this.maxDurationSeconds}s)`)
    }

    // 檢查是否為有效影片
    if (videoInfo.duration <= 0) {
      throw new Error('Invalid video duration')
    }
  }

  /**
   * 使用多格式策略下載視頻
   */
  private async downloadWithMultipleFormats(videoId: string, videoInfo: VideoInfo): Promise<VideoDownloadResult> {
    const url = `https://youtube.com/shorts/${videoId}`
    let lastError: Error | null = null
    
    // 嘗試每個格式選擇器
    for (let i = 0; i < this.formatSelectors.length; i++) {
      const selector = this.formatSelectors[i]
      const attempt = i + 1
      
      try {
        logger.info(`📥 Attempt ${attempt}/${this.formatSelectors.length}: Trying format "${selector}"`, { videoId })
        
        const result = await this.attemptDownload(videoId, selector, videoInfo)
        
        logger.info(`✅ Download successful with format selector: "${selector}"`, {
          videoId,
          format: result.format,
          fileSize: result.fileSize
        })
        
        return result
        
      } catch (error) {
        lastError = error as Error
        const diagnosis = this.diagnoseDownloadFailure(error instanceof Error ? error.message : String(error), videoId)
        
        logger.warn(`❌ Attempt ${attempt} failed with "${selector}"`, {
          videoId,
          error: error instanceof Error ? error.message : String(error),
          diagnosis
        })
        
        // 如果是致命錯誤（如私人影片、年齡限制），立即停止
        if (diagnosis === 'private_video' || diagnosis === 'age_restricted' || diagnosis === 'video_unavailable') {
          throw error
        }
        
        // 繼續嘗試下一個格式
        continue
      }
    }
    
    // 所有格式都失敗了
    throw new Error(`All ${this.formatSelectors.length} format attempts failed. Last error: ${lastError?.message}`)
  }
  
  /**
   * 嘗試使用特定格式選擇器下載
   */
  private async attemptDownload(videoId: string, formatSelector: string, videoInfo: VideoInfo): Promise<VideoDownloadResult> {
    const timestamp = Date.now()
    const tempFileName = `shorts_${videoId}_${timestamp}`
    const url = `https://youtube.com/shorts/${videoId}`
    
    // 不指定擴展名，讓 yt-dlp 自動決定
    const outputTemplate = join(this.tempDir, `${tempFileName}.%(ext)s`)
    
    const downloadCommand = [
      'yt-dlp',
      `--format "${formatSelector}"`,
      '--no-playlist',
      '--no-warnings', 
      '--no-check-certificates', // 避免證書問題
      `--output "${outputTemplate}"`,
      `"${url}"`
    ].join(' ')

    logger.info(`📥 Executing download command`, {
      videoId,
      selector: formatSelector,
      command: downloadCommand.replace(/".*youtube\.com.*"/, '"[URL]"')
    })

    try {
      const { stdout, stderr } = await execAsync(downloadCommand, {
        timeout: 90000, // 90 秒超時
        maxBuffer: 20 * 1024 * 1024 // 20MB buffer
      })
      
      // 找到實際下載的檔案
      const downloadedFile = await this.findDownloadedFile(tempFileName)
      
      if (!downloadedFile || !existsSync(downloadedFile)) {
        throw new Error('Download completed but file not found')
      }

      // 獲取檔案統計資訊
      const stats = statSync(downloadedFile)
      const fileSizeBytes = stats.size
      const fileSizeMB = fileSizeBytes / (1024 * 1024)

      // 檢查檔案大小限制
      if (fileSizeMB > this.maxFileSizeMB) {
        await this.cleanup(downloadedFile)
        throw new Error(`File too large: ${fileSizeMB.toFixed(1)}MB (max: ${this.maxFileSizeMB}MB)`)
      }
      
      // 檢查檔案不能為空
      if (fileSizeBytes === 0) {
        await this.cleanup(downloadedFile)
        throw new Error('Downloaded file is empty')
      }

      // 確定檔案格式和 MIME 類型
      const { format, mimeType } = this.determineFileFormat(downloadedFile)
      
      logger.info(`📊 Download successful`, {
        videoId,
        filePath: downloadedFile,
        format,
        mimeType,
        sizeBytes: fileSizeBytes,
        sizeMB: fileSizeMB.toFixed(2)
      })

      return {
        filePath: downloadedFile,
        duration: videoInfo.duration,
        resolution: videoInfo.resolution,
        fileSize: fileSizeBytes,
        format,
        mimeType
      }
    } catch (error) {
      logger.error('Download command failed', { videoId, formatSelector, error })
      throw error
    }
  }

  async cleanup(filePath: string): Promise<void> {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath)
        logger.info(`🧹 Cleaned up temporary file: ${filePath}`)
      }
    } catch (error) {
      logger.warn(`⚠️ Failed to cleanup file: ${filePath}`, { error })
    }
  }
  
  /**
   * 解析可用格式列表
   */
  private parseAvailableFormats(output: string): string[] {
    const formats: string[] = []
    const lines = output.split('\n')
    
    let inFormatSection = false
    for (const line of lines) {
      if (line.includes('Available formats')) {
        inFormatSection = true
        continue
      }
      
      if (inFormatSection && line.trim()) {
        // 解析格式行，提取格式ID和擴展名
        const match = line.match(/^(\S+)\s+(\S+)/)
        if (match) {
          const [, formatId, ext] = match
          if (ext && ext !== 'mhtml') { // 排除storyboard格式
            formats.push(`${formatId}(${ext})`)
          }
        }
      }
    }
    
    return formats
  }
  
  /**
   * 找到實際下載的檔案
   */
  private async findDownloadedFile(baseFileName: string): Promise<string | null> {
    const possibleExtensions = ['mp4', 'webm', 'mov', 'mpeg', 'flv', 'wmv', '3gp', 'm4a', 'mp3']
    
    for (const ext of possibleExtensions) {
      const filePath = join(this.tempDir, `${baseFileName}.${ext}`)
      if (existsSync(filePath)) {
        return filePath
      }
    }
    
    // 如果上面的方法都找不到，掃描目錄找最近的檔案
    try {
      const files = readdirSync(this.tempDir)
      const matchingFiles = files.filter(file => file.startsWith(baseFileName.split('_').slice(0, 2).join('_')))
      
      if (matchingFiles.length > 0) {
        // 返回最新的檔案
        const latestFile = matchingFiles.sort().pop()
        return join(this.tempDir, latestFile!)
      }
    } catch (error) {
      logger.warn('Failed to scan temp directory for downloaded file', { error })
    }
    
    return null
  }
  
  /**
   * 確定檔案格式和MIME類型
   */
  private determineFileFormat(filePath: string): { format: string; mimeType: string } {
    const ext = filePath.split('.').pop()?.toLowerCase() || 'unknown'
    
    for (const [format, mimeTypes] of Object.entries(this.supportedFormats)) {
      if (format === ext) {
        return {
          format: ext,
          mimeType: mimeTypes[0]
        }
      }
    }
    
    // 預設值
    return {
      format: ext,
      mimeType: 'video/mp4'
    }
  }
  
  /**
   * 驗證下載的檔案
   */
  private async validateDownloadedFile(filePath: string): Promise<void> {
    try {
      if (!existsSync(filePath)) {
        throw new Error('File does not exist after download')
      }
      
      const stats = statSync(filePath)
      if (stats.size === 0) {
        throw new Error('Downloaded file is empty')
      }
      
      // 可以添加更多驗證，如檢查檔案頭部等
      logger.info(`✅ File validation passed`, {
        filePath,
        size: stats.size
      })
      
    } catch (error) {
      logger.error('File validation failed', { filePath, error })
      throw error
    }
  }
  
  /**
   * 診斷下載失敗原因
   */
  private diagnoseDownloadFailure(errorMessage: string, videoId: string): string {
    const error = errorMessage.toLowerCase()
    
    if (error.includes('requested format is not available')) {
      return 'format_unavailable'
    } else if (error.includes('sign in to confirm') || error.includes('age')) {
      return 'age_restricted'
    } else if (error.includes('private video')) {
      return 'private_video'
    } else if (error.includes('video unavailable') || error.includes('does not exist')) {
      return 'video_unavailable'
    } else if (error.includes('network') || error.includes('connection')) {
      return 'network_error'
    } else if (error.includes('timeout')) {
      return 'timeout'
    } else if (error.includes('quota') || error.includes('rate limit')) {
      return 'rate_limited'
    } else {
      return 'unknown_error'
    }
  }

  // 檢查 yt-dlp 是否可用
  async checkAvailability(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('yt-dlp --version')
      logger.info(`✅ yt-dlp available: ${stdout.trim()}`)
      return true
    } catch (error) {
      logger.error('❌ yt-dlp not available', { error })
      return false
    }
  }

  // 清理所有臨時檔案
  async cleanupAll(): Promise<void> {
    try {
      const files = readdirSync(this.tempDir)
      for (const file of files) {
        const filePath = join(this.tempDir, file)
        await this.cleanup(filePath)
      }
      logger.info(`🧹 Cleaned up ${files.length} temporary files`)
    } catch (error) {
      logger.warn('Failed to cleanup all temporary files', { error })
    }
  }
}

// 單例實例
export const youtubeDownloader = new YouTubeShortsDownloader()