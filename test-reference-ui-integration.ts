/**
 * 測試 Reference UI 整合 - 模擬從前端 UI 發送的請求
 * 這個測試將模擬實際的 Reference Content 處理流程
 */

// Load environment variables from .env file
import dotenv from 'dotenv'
dotenv.config()

import { extractYouTubeMetadata, processReferenceContent } from './app/actions/process-reference'

async function testReferenceUIIntegration() {
  console.log('🎬 Testing Reference UI Integration with YouTube Shorts')
  console.log('This test simulates the actual flow from the UI')
  
  const testUrls = [
    'https://www.youtube.com/shorts/xXKiIFbO95Y',
    'https://www.youtube.com/shorts/AVPVDt6lXYw'
  ]
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i]
    console.log(`\n📺 Testing URL ${i + 1}: ${url}`)
    console.log('=' + '='.repeat(60))
    
    try {
      // 步驟 1: 提取 YouTube 元數據 (模擬 UI 的第一步)
      console.log('📥 Step 1: Extracting YouTube metadata (UI simulation)...')
      const metadataResult = await extractYouTubeMetadata(url)
      
      console.log('Metadata extraction result:', {
        status: metadataResult.processingStatus,
        hasTitle: !!metadataResult.title,
        hasDescription: !!metadataResult.description,
        hasTranscript: !!metadataResult.transcript,
        errorMessage: metadataResult.errorMessage
      })
      
      // 檢查是否有元數據提取錯誤
      if (metadataResult.processingStatus === 'error') {
        console.log('❌ Metadata extraction failed - this would show error in UI')
        console.log('Error details:', metadataResult.errorMessage)
        console.log('Processing error:', metadataResult.processingError)
        continue
      }
      
      // 步驟 2: 構建 ReferenceSource (模擬 UI 創建的數據結構)
      console.log('\n🔧 Step 2: Building ReferenceSource (UI data structure)...')
      const referenceSource = {
        id: `ui_test_${Date.now()}_${i}`,
        type: 'youtube' as const,
        url: url,
        title: metadataResult.title || 'Unknown Title',
        description: metadataResult.description || 'No description available',
        transcript: metadataResult.transcript || metadataResult.description || '',
        duration: metadataResult.duration || 0,
        thumbnail: metadataResult.thumbnail,
        processingStatus: 'completed' as const,
        hasVideoAnalysis: metadataResult.hasVideoAnalysis || false,
        videoAnalysis: metadataResult.videoAnalysis,
        videoAnalysisQuality: metadataResult.videoAnalysisQuality || 'failed',
        complexityMetrics: metadataResult.complexityMetrics
      }
      
      console.log('ReferenceSource created:', {
        id: referenceSource.id,
        type: referenceSource.type,
        titleLength: referenceSource.title?.length || 0,
        descriptionLength: referenceSource.description?.length || 0,
        transcriptLength: referenceSource.transcript?.length || 0,
        hasVideoAnalysis: referenceSource.hasVideoAnalysis
      })
      
      // 步驟 3: 處理參考內容 (模擬 UI 的 pitch 生成)
      console.log('\n🚀 Step 3: Processing reference content (UI pitch generation)...')
      console.log('Processing with settings:')
      console.log('  - Target Style: shorts')
      console.log('  - Target Language: 繁體中文')
      console.log('  - Use Structured Output: true')
      
      const processingStartTime = Date.now()
      const referenceContent = await processReferenceContent(
        referenceSource,
        'shorts',          // targetStyle
        '繁體中文',        // targetLanguage
        true              // useStructuredOutput
      )
      const processingTime = Date.now() - processingStartTime
      
      console.log(`\n✅ Processing completed in ${processingTime}ms`)
      
      // 分析結果
      console.log('\n📊 Result Analysis:')
      console.log('  - Generated Pitch Length:', referenceContent.generatedPitch.length)
      console.log('  - Content Quality:', referenceContent.contentQuality)
      console.log('  - Is Structured Output:', referenceContent.isStructuredOutput)
      console.log('  - Has Warning:', !!referenceContent.warning)
      console.log('  - Has Processing Error:', !!referenceContent.processingError)
      
      if (referenceContent.warning) {
        console.log('  - Warning Message:', referenceContent.warning)
      }
      
      if (referenceContent.processingError) {
        console.log('  - Error Stage:', referenceContent.processingError.stage)
        console.log('  - Error Message:', referenceContent.processingError.message)
        console.log('  - Has Original Content:', !!referenceContent.processingError.originalContent)
      }
      
      // 顯示生成的 Pitch 內容
      console.log('\n📄 Generated Pitch Content:')
      console.log('-'.repeat(50))
      const pitchPreview = referenceContent.generatedPitch.substring(0, 500)
      console.log(pitchPreview + (referenceContent.generatedPitch.length > 500 ? '...' : ''))
      console.log('-'.repeat(50))
      
      // 檢查是否是錯誤格式還是正常內容
      if (referenceContent.generatedPitch.includes('處理階段失敗')) {
        console.log('\n⚠️ DETECTED: Error handling format')
        console.log('This would show as an error in the UI')
      } else {
        console.log('\n✨ DETECTED: Normal pitch content')
        console.log('This would show as successful generation in the UI')
      }
      
      // 檢查結構化輸出
      if (referenceContent.structuredPitch) {
        console.log('\n🏗️ Structured Output Available:')
        console.log('  - Title:', referenceContent.structuredPitch.title)
        console.log('  - Characters Count:', referenceContent.structuredPitch.characters.length)
        console.log('  - Scenes Count:', referenceContent.structuredPitch.scenes.length)
        console.log('  - Has Processing Error:', !!referenceContent.structuredPitch.processingError)
      }
      
    } catch (error) {
      console.error('\n💥 UNEXPECTED ERROR (This would cause UI error):')
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
      console.error('Error message:', error instanceof Error ? error.message : String(error))
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
      
      console.log('\n🔍 Error Analysis:')
      console.log('This unexpected error would cause the "Unexpected Error" message in the UI')
      console.log('The error is not being caught by our error handling system')
    }
    
    console.log('\n' + '='.repeat(80) + '\n')
  }
  
  console.log('🏁 Reference UI Integration Test Completed!')
}

// 運行測試
testReferenceUIIntegration().catch((error) => {
  console.error('\n💥 TOP-LEVEL ERROR:')
  console.error(error)
  process.exit(1)
})