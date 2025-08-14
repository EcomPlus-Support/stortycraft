import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, unlinkSync, mkdirSync } from 'fs'
import { join } from 'path'
import { logger } from '@/lib/logger'

const execAsync = promisify(exec)

export interface VideoDownloadResult {
  filePath: string
  duration: number
  resolution: string
  fileSize: number
}

export interface VideoInfo {
  duration: number
  title: string
  resolution: string
  formats: any[]
}

export class YouTubeShortsDownloader {
  private tempDir: string
  private readonly maxDurationSeconds = 60 // 只下載 60 秒以內的影片
  private readonly maxFileSizeMB = 50 // 最大 50MB

  constructor() {
    // 創建臨時目錄
    this.tempDir = join(process.cwd(), 'temp', 'shorts')
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true })
    }
  }

  async downloadShorts(videoId: string): Promise<VideoDownloadResult> {
    const startTime = Date.now()
    logger.info(`🎥 Starting download for Shorts: ${videoId}`)

    try {
      // 1. 先檢查影片資訊
      const videoInfo = await this.getVideoInfo(videoId)
      
      // 2. 驗證是否適合下載
      this.validateForDownload(videoInfo)
      
      // 3. 下載影片
      const downloadResult = await this.performDownload(videoId, videoInfo)
      
      const elapsed = Date.now() - startTime
      logger.info(`✅ Video download completed in ${elapsed}ms`, {
        videoId,
        duration: downloadResult.duration,
        fileSize: downloadResult.fileSize
      })

      return downloadResult

    } catch (error) {
      logger.error(`❌ Video download failed for ${videoId}`, { 
        error: error instanceof Error ? error.message : error 
      })
      throw new Error(`Failed to download video: ${error}`)
    }
  }

  private async getVideoInfo(videoId: string): Promise<VideoInfo> {
    const url = `https://youtube.com/shorts/${videoId}`
    
    try {
      // 使用 yt-dlp 獲取影片資訊，不下載
      const command = `yt-dlp --print "%(duration)s|%(title)s|%(height)s" "${url}"`
      const { stdout } = await execAsync(command)
      
      const [durationStr, title, heightStr] = stdout.trim().split('|')
      const duration = parseInt(durationStr) || 0
      const height = parseInt(heightStr) || 0
      
      return {
        duration,
        title: title || 'Unknown',
        resolution: `${height}p`,
        formats: [] // 暫時不需要詳細格式資訊
      }
    } catch (error) {
      logger.error('Failed to get video info', { videoId, error })
      throw new Error(`Cannot get video info: ${error}`)
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

  private async performDownload(videoId: string, videoInfo: VideoInfo): Promise<VideoDownloadResult> {
    const fileName = `shorts_${videoId}_${Date.now()}.mp4`
    const filePath = join(this.tempDir, fileName)
    const url = `https://youtube.com/shorts/${videoId}`

    // 選擇最低畫質但可用的格式來節省頻寬和時間
    const downloadCommand = [
      'yt-dlp',
      '--format "worst[height<=480][ext=mp4]/worst[ext=mp4]/worst"', // 優先 480p MP4
      '--no-playlist',
      '--no-warnings',
      `--output "${filePath}"`,
      `"${url}"`
    ].join(' ')

    logger.info(`📥 Downloading with command: ${downloadCommand.replace(/".*youtube\.com.*"/, '"[URL]"')}`)

    try {
      const { stdout, stderr } = await execAsync(downloadCommand, {
        timeout: 60000, // 60 秒超時
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })

      // 檢查檔案是否成功下載
      if (!existsSync(filePath)) {
        throw new Error('Download completed but file not found')
      }

      // 獲取檔案大小
      const fs = require('fs')
      const stats = fs.statSync(filePath)
      const fileSizeBytes = stats.size
      const fileSizeMB = fileSizeBytes / (1024 * 1024)

      // 檢查檔案大小限制
      if (fileSizeMB > this.maxFileSizeMB) {
        await this.cleanup(filePath)
        throw new Error(`File too large: ${fileSizeMB.toFixed(1)}MB (max: ${this.maxFileSizeMB}MB)`)
      }

      logger.info(`📊 Downloaded file stats`, {
        filePath,
        sizeBytes: fileSizeBytes,
        sizeMB: fileSizeMB.toFixed(2)
      })

      return {
        filePath,
        duration: videoInfo.duration,
        resolution: videoInfo.resolution,
        fileSize: fileSizeBytes
      }

    } catch (error) {
      // 清理可能的部分下載檔案
      if (existsSync(filePath)) {
        await this.cleanup(filePath)
      }
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
      const fs = require('fs')
      const files = fs.readdirSync(this.tempDir)
      
      for (const file of files) {
        const filePath = join(this.tempDir, file)
        const stats = fs.statSync(filePath)
        const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60)
        
        // 刪除超過 30 分鐘的檔案
        if (ageMinutes > 30) {
          await this.cleanup(filePath)
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup old files', { error })
    }
  }
}

// 單例實例
export const youtubeDownloader = new YouTubeShortsDownloader()

// 定期清理（每小時執行一次）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    youtubeDownloader.cleanupAll()
  }, 60 * 60 * 1000) // 1 小時
}