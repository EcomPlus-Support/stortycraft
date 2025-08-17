#!/usr/bin/env bun
/**
 * Debug duration parsing issue
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function debugDurationParsing() {
  const videoId = 'AVPVDt6lXYw'
  const url = `https://youtube.com/shorts/${videoId}`
  
  try {
    const command = `yt-dlp --print "%(duration)s|%(title)s|%(height)s" --list-formats "${url}"`
    console.log('Command:', command)
    
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 })
    
    console.log('Raw stdout:')
    console.log('---START---')
    console.log(stdout)
    console.log('---END---')
    
    if (stderr) {
      console.log('stderr:', stderr)
    }
    
    const lines = stdout.trim().split('\n')
    console.log(`Total lines: ${lines.length}`)
    
    // 找到實際的視頻信息行（通常是最後一行，包含數字|標題|數字格式）
    const infoLine = lines.find(line => /^\d+\|.*\|\d+$/.test(line)) || lines[lines.length - 1]
    console.log('Info line:', infoLine)
    console.log('All lines:')
    lines.forEach((line, i) => {
      console.log(`  ${i}: ${line}`)
      console.log(`    Matches pattern: ${/^\d+\|.*\|\d+$/.test(line)}`)
    })
    
    const parts = infoLine.split('|')
    console.log('Parts:', parts)
    console.log('Parts count:', parts.length)
    
    const durationStr = parts[0] || '0'
    const heightStr = parts[parts.length - 1] || '0'
    const title = parts.slice(1, -1).join('|') || 'Unknown'
    
    console.log('Duration string:', durationStr)
    console.log('Height string:', heightStr)
    console.log('Title:', title)
    
    const duration = parseInt(durationStr) || 0
    const height = parseInt(heightStr) || 0
    
    console.log('Parsed duration:', duration)
    console.log('Parsed height:', height)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

debugDurationParsing().catch(console.error)