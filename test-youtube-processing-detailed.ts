#!/usr/bin/env node

/**
 * Detailed test for YouTube processing to identify the issue
 */

import 'dotenv/config'
import { YouTubeProcessingService } from './lib/youtube-processing-service'

async function testYouTubeProcessing() {
  console.log('🧪 Detailed YouTube Processing Test')
  console.log('===================================\n')
  
  const service = new YouTubeProcessingService()
  const testUrl = 'https://youtube.com/shorts/AVPVDt6lXYw?si=U-JmrDgGRVOuY3Ww'
  
  console.log(`📺 Testing URL: ${testUrl}`)
  console.log(`🔑 YouTube API Key: ${process.env.YOUTUBE_API_KEY ? 'Set' : 'Not Set'}`)
  console.log(`🌐 Google Cloud Project: ${process.env.GOOGLE_CLOUD_PROJECT_ID || 'Not Set'}`)
  console.log(`📍 Google Cloud Location: ${process.env.GOOGLE_CLOUD_LOCATION || 'Not Set'}\n`)
  
  try {
    console.log('🚀 Starting YouTube content processing...')
    const startTime = Date.now()
    
    const result = await service.processYouTubeContent(testUrl, 'shorts')
    
    const processingTime = Date.now() - startTime
    console.log(`\n✅ Processing completed in ${processingTime}ms`)
    
    console.log('\n📊 Result Details:')
    console.log(`  - Video ID: ${result.videoId}`)
    console.log(`  - Content Type: ${result.contentType}`)
    console.log(`  - Title: ${result.title}`)
    console.log(`  - Duration: ${result.duration}s`)
    console.log(`  - Confidence: ${result.confidence}`)
    console.log(`  - Processing Strategy: ${result.processingStrategy}`)
    console.log(`  - Has Video Analysis: ${result.hasVideoAnalysis}`)
    console.log(`  - Video Analysis Quality: ${result.videoAnalysisQuality}`)
    console.log(`  - Daily Analysis Count: ${result.metadata?.dailyAnalysisCount}`)
    
    if (result.error) {
      console.log(`  - Error: ${result.error}`)
    }
    
    if (result.warning) {
      console.log(`  - Warning: ${result.warning}`)
    }
    
    if (result.transcript) {
      console.log(`\n📝 Transcript (${result.transcript.length} chars):`)
      console.log('--------------------------------------------------')
      console.log(result.transcript.substring(0, 200) + '...')
      console.log('--------------------------------------------------')
    }
    
    if (result.videoAnalysis) {
      console.log('\n🎥 Video Analysis:')
      console.log(`  - Generated Transcript Length: ${result.videoAnalysis.generatedTranscript?.length || 0}`)
      console.log(`  - Scenes: ${result.videoAnalysis.sceneBreakdown?.length || 0}`)
      console.log(`  - Characters: ${result.videoAnalysis.characters?.length || 0}`)
      console.log(`  - Confidence: ${result.videoAnalysis.confidence}`)
      
      if (result.videoAnalysis.generatedTranscript) {
        console.log(`\n  Generated Transcript Preview:`)
        console.log(`  "${result.videoAnalysis.generatedTranscript.substring(0, 100)}..."`)
      }
    }
    
    // Check for specific issues
    console.log('\n🔍 Issue Analysis:')
    if (!result.videoId) {
      console.log('  ❌ Failed to extract video ID')
    }
    if (result.contentType === 'unknown') {
      console.log('  ❌ Failed to determine content type')
    }
    if (!result.hasVideoAnalysis && result.contentType === 'shorts') {
      console.log('  ⚠️ Video analysis was skipped for Shorts')
    }
    if (result.confidence < 0.5) {
      console.log('  ⚠️ Low confidence score indicates processing issues')
    }
    
    return result
    
  } catch (error) {
    console.error('\n❌ Test Failed:')
    console.error(error)
    
    if (error instanceof Error) {
      console.error('\nError Stack:')
      console.error(error.stack)
    }
    
    throw error
  }
}

// Run the test
console.log('🚀 Starting detailed YouTube processing test...\n')
testYouTubeProcessing()
  .then(result => {
    console.log('\n✨ Test completed successfully!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Test failed!')
    process.exit(1)
  })