import { processReferenceContent, ProcessingStage } from './app/actions/process-reference'

async function testErrorHandlingSimple() {
  console.log('🧪 Testing error handling system without YouTube API dependency')
  
  // Test case 1: Simple content with mock source
  const mockSource = {
    id: 'test_1',
    type: 'text_input' as const,
    title: '測試影片標題',
    description: '這是一段測試描述，用來測試錯誤處理機制。包含中文內容，看看系統如何處理失敗情況。',
    transcript: '這是一段測試的影片內容腳本。主要想測試當各個階段失敗時，系統是否會正確顯示失敗階段和原始內容。',
    processingStatus: 'completed' as const,
    duration: 45
  }
  
  console.log('\n📝 Testing with text input source...')
  console.log('Title:', mockSource.title)
  console.log('Description length:', mockSource.description.length)
  console.log('Transcript length:', mockSource.transcript.length)
  
  try {
    console.log('\n🔄 Processing content...')
    const result = await processReferenceContent(
      mockSource,
      'shorts',
      '繁體中文',
      true // Use structured output to potentially trigger errors
    )
    
    console.log('\n✅ Processing completed!')
    console.log('Generated pitch length:', result.generatedPitch.length)
    console.log('Content quality:', result.contentQuality)
    console.log('Is structured output:', result.isStructuredOutput)
    console.log('Warning:', result.warning)
    
    if (result.processingError) {
      console.log('\n⚠️ Processing Error Details:')
      console.log('Stage:', result.processingError.stage)
      console.log('Message:', result.processingError.message)
      console.log('Has original content:', !!result.processingError.originalContent)
    }
    
    console.log('\n📄 Generated Pitch Preview:')
    console.log('-'.repeat(50))
    const pitchPreview = result.generatedPitch.substring(0, 400)
    console.log(pitchPreview + (result.generatedPitch.length > 400 ? '...' : ''))
    console.log('-'.repeat(50))
    
    // Check if it's showing error format
    if (result.generatedPitch.includes('處理階段失敗')) {
      console.log('\n✅ Error handling format detected!')
      console.log('The system correctly shows failure stage and original content.')
    } else {
      console.log('\n✨ Content generated successfully!')
      console.log('The system processed the content without errors.')
    }
    
  } catch (error) {
    console.error('\n💥 Unexpected error:', error)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('🏁 Error handling test completed!')
}

testErrorHandlingSimple().catch(console.error)