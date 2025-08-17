/**
 * System Health Check - specific for production environment checks
 */

import { NextRequest, NextResponse } from 'next/server'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  const checks = {
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  }

  try {
    // Check temporary directory access
    const tempDir = process.env.NODE_ENV === 'production' 
      ? join('/tmp', 'storycraft-shorts')
      : join(process.cwd(), 'temp', 'shorts')
    
    let tempDirStatus = 'error'
    try {
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true })
      }
      tempDirStatus = 'ok'
    } catch (error) {
      tempDirStatus = `error: ${error}`
    }

    // Check yt-dlp availability
    let ytDlpStatus = 'error'
    try {
      const { stdout } = await execAsync('yt-dlp --version', { timeout: 5000 })
      ytDlpStatus = `ok: ${stdout.trim()}`
    } catch (error) {
      ytDlpStatus = `error: ${error}`
    }

    // Check Python availability
    let pythonStatus = 'error'
    try {
      const { stdout } = await execAsync('python3 --version', { timeout: 5000 })
      pythonStatus = `ok: ${stdout.trim()}`
    } catch (error) {
      pythonStatus = `error: ${error}`
    }

    // Check environment variables
    const envCheck = {
      PROJECT_ID: !!process.env.PROJECT_ID,
      GEMINI_MODEL: !!process.env.GEMINI_MODEL,
      YOUTUBE_API_KEY: !!process.env.YOUTUBE_API_KEY,
      NODE_ENV: process.env.NODE_ENV
    }

    const systemHealth = {
      ...checks,
      tempDirectory: {
        path: tempDir,
        status: tempDirStatus
      },
      tools: {
        ytDlp: ytDlpStatus,
        python: pythonStatus
      },
      environment: envCheck,
      overall: tempDirStatus === 'ok' && ytDlpStatus.startsWith('ok') ? 'healthy' : 'unhealthy'
    }

    return NextResponse.json(systemHealth, {
      status: systemHealth.overall === 'healthy' ? 200 : 503
    })

  } catch (error) {
    return NextResponse.json({
      ...checks,
      error: error instanceof Error ? error.message : 'Unknown error',
      overall: 'unhealthy'
    }, { status: 503 })
  }
}