#!/usr/bin/env node

/**
 * Test script to verify YouTube Shorts processing fixes
 * Tests the specific URL that was causing JSON truncation errors
 */

import 'dotenv/config'
import { processReferenceContent, type ReferenceSource } from './app/actions/process-reference'
import { YouTubeProcessingService } from './lib/youtube-processing-service'

async function testYouTubeShortsFix() {
  console.log('🧪 Testing YouTube Shorts JSON Truncation Fix')
  console.log('============================================\n')
  
  const testUrl = 'https://youtube.com/shorts/AVPVDt6lXYw?si=U-JmrDgGRVOuY3Ww'
  
  console.log(`📺 Testing URL: ${testUrl}`)
  console.log('🔍 Expected: Successful processing without "Unexpected Error"')
  console.log('📊 Monitoring for JSON truncation and recovery...\n')
  
  try {
    const startTime = Date.now()
    
    // First extract YouTube metadata
    const youtubeService = new YouTubeProcessingService()
    const youtubeResult = await youtubeService.processYouTubeContent(testUrl, 'shorts')
    
    // Create proper source object with YouTube data
    const source: ReferenceSource = {
      type: 'youtube',
      url: testUrl,
      title: youtubeResult.title,
      description: youtubeResult.description,
      transcript: youtubeResult.transcript || youtubeResult.description,
      duration: youtubeResult.duration,
      thumbnail: youtubeResult.thumbnail,
      processingStatus: 'completed',
      videoAnalysis: youtubeResult.videoAnalysis,
      hasVideoAnalysis: youtubeResult.hasVideoAnalysis,
      videoAnalysisQuality: youtubeResult.videoAnalysisQuality,
      contentType: youtubeResult.contentType,
      processingStrategy: youtubeResult.processingStrategy
    }
    
    const result = await processReferenceContent(
      source,
      'tiktok-viral',
      '繁體中文',
      true
    )
    
    const processingTime = Date.now() - startTime
    
    console.log('\n✅ Processing completed successfully!')
    console.log(`⏱️  Time taken: ${processingTime}ms`)
    console.log('\n📋 Result Summary:')
    console.log(`  - Content Type: ${result.source.contentType || 'unknown'}`)
    console.log(`  - Title: ${result.source.title}`)
    console.log(`  - Has Video Analysis: ${result.source.hasVideoAnalysis || false}`)
    console.log(`  - Video Analysis Quality: ${result.source.videoAnalysisQuality || 'N/A'}`)
    console.log(`  - Processing Strategy: ${result.source.processingStrategy || 'unknown'}`)
    console.log(`  - Is Structured Output: ${result.isStructuredOutput}`)
    console.log(`  - Has Warning: ${!!result.warning}`)
    console.log(`  - Has Processing Error: ${!!result.processingError}`)
    
    if (result.warning) {
      console.log(`  - Warning Message: ${result.warning}`)
    }
    
    if (result.processingError) {
      console.log(`  - Error Stage: ${result.processingError.stage}`)
      console.log(`  - Error Message: ${result.processingError.message}`)
    }
    
    console.log('\n📝 Generated Pitch:')
    console.log('--------------------------------------------------')
    console.log(result.generatedPitch)
    console.log('--------------------------------------------------')
    
    // Check for success criteria
    const isSuccess = result.generatedPitch && 
                     result.generatedPitch.length > 50 && 
                     !result.generatedPitch.includes('Unexpected Error') &&
                     !result.generatedPitch.includes('Processing Error')
    
    if (isSuccess) {
      console.log('\n🎉 SUCCESS: YouTube Shorts processing is working correctly!')
      console.log('✨ The JSON truncation issue has been resolved.')
    } else {
      console.log('\n⚠️  WARNING: Generated pitch may have issues')
      console.log('Please check the output above for any error patterns.')
    }
    
  } catch (error) {
    console.error('\n❌ Test Failed with Error:')
    console.error(error)
    
    if (error instanceof Error) {
      console.error('\nError Details:')
      console.error(`  - Name: ${error.name}`)
      console.error(`  - Message: ${error.message}`)
      if (error.stack) {
        console.error('\nStack Trace:')
        console.error(error.stack)
      }
    }
    
    process.exit(1)
  }
}

// Run the test
console.log('🚀 Starting YouTube Shorts Fix Test...\n')
testYouTubeShortsFix().catch(error => {
  console.error('💥 Unexpected error during test:', error)
  process.exit(1)
})