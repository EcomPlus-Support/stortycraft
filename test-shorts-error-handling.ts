import { extractYouTubeMetadata, processReferenceContent } from './app/actions/process-reference'

async function testShortsErrorHandling() {
  console.log('🚀 Testing YouTube Shorts error handling with new system')
  
  const testUrls = [
    'https://www.youtube.com/shorts/AVPVDt6lXYw',
    'https://www.youtube.com/shorts/xXKiIFbO95Y'
  ]
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i]
    console.log(`\n📺 Testing URL ${i + 1}: ${url}`)
    console.log('=' + '='.repeat(50))
    
    try {
      // Step 1: Extract metadata
      console.log('📥 Step 1: Extracting YouTube metadata...')
      const metadata = await extractYouTubeMetadata(url)
      console.log('✅ Metadata extraction result:', {
        title: metadata.title?.substring(0, 50) + '...',
        hasDescription: !!metadata.description,
        hasTranscript: !!metadata.transcript,
        processingStatus: metadata.processingStatus,
        errorMessage: metadata.errorMessage,
        processingError: metadata.processingError
      })
      
      if (metadata.processingStatus === 'error') {
        console.log('❌ Metadata extraction failed, showing error info:')
        console.log('Error Message:', metadata.errorMessage)
        if (metadata.processingError) {
          console.log('Processing Error:', metadata.processingError)
        }
        continue
      }
      
      // Step 2: Process content
      console.log('\n🔄 Step 2: Processing reference content...')
      const source = {
        id: `test_${Date.now()}`,
        type: 'youtube' as const,
        url,
        processingStatus: 'completed' as const,
        ...metadata
      }
      
      const referenceContent = await processReferenceContent(
        source,
        'shorts',
        '繁體中文',
        true // Use structured output
      )
      
      console.log('✅ Content processing result:', {
        generatedPitchLength: referenceContent.generatedPitch.length,
        contentQuality: referenceContent.contentQuality,
        warning: referenceContent.warning,
        processingError: referenceContent.processingError,
        isStructuredOutput: referenceContent.isStructuredOutput
      })
      
      // Show the pitch result
      console.log('\n📄 Generated Pitch:')
      console.log('-'.repeat(40))
      console.log(referenceContent.generatedPitch.substring(0, 300) + (referenceContent.generatedPitch.length > 300 ? '...' : ''))
      console.log('-'.repeat(40))
      
      if (referenceContent.processingError) {
        console.log('\n⚠️ Processing Error Details:')
        console.log('Stage:', referenceContent.processingError.stage)
        console.log('Message:', referenceContent.processingError.message)
        console.log('Has Original Content:', !!referenceContent.processingError.originalContent)
      }
      
    } catch (error) {
      console.error('💥 Unexpected error during testing:', error)
    }
    
    console.log('\n' + '='.repeat(60) + '\n')
  }
  
  console.log('🏁 Test completed!')
}

// Run the test
testShortsErrorHandling().catch(console.error)