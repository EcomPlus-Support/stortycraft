#!/usr/bin/env npx tsx

/**
 * Debug script to trace the exact processing flow for the specific YouTube URL
 */

import { YouTubeProcessingService } from './lib/youtube-processing-service'
import { generateTextWithGemini } from './lib/gemini-service'
import { StructuredOutputService } from './lib/structured-output-service'

async function debugYouTubeProcessing() {
  console.log('🔍 Debugging Real YouTube Processing');
  console.log('='.repeat(60));
  
  const testUrl = 'https://youtube.com/shorts/AVPVDt6lXYw?si=t4hq-TCbAgN8Vs7H';
  
  try {
    console.log(`\n📺 Testing URL: ${testUrl}`);
    console.log('-'.repeat(40));
    
    // Step 1: Test YouTube processing service
    console.log('\n🎬 Step 1: YouTube Processing Service');
    console.log('-'.repeat(30));
    
    const processingService = new YouTubeProcessingService();
    const processingResult = await processingService.processYouTubeContent(
      testUrl,
      'shorts'
    );
    
    console.log('Processing result:', {
      id: processingResult.id,
      videoId: processingResult.videoId,
      contentType: processingResult.contentType,
      title: processingResult.title,
      description: processingResult.description?.substring(0, 100) + '...',
      transcript: processingResult.transcript?.substring(0, 100) + '...',
      transcriptLength: processingResult.transcript?.length || 0,
      confidence: processingResult.confidence,
      processingStrategy: processingResult.processingStrategy,
      hasVideoAnalysis: processingResult.hasVideoAnalysis,
      error: processingResult.error
    });
    
    if (processingResult.error) {
      console.log('❌ Processing service returned error:', processingResult.error);
      return;
    }
    
    if (!processingResult.title) {
      console.log('❌ No title extracted from YouTube content');
      return;
    }
    
    // Step 2: Test structured output generation
    console.log('\n🤖 Step 2: Structured Output Generation');
    console.log('-'.repeat(30));
    
    const content = processingResult.transcript || processingResult.description || '';
    console.log('Content for processing:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 200) + '...',
      hasTranscript: !!processingResult.transcript,
      hasDescription: !!processingResult.description,
      hasVideoAnalysis: !!processingResult.hasVideoAnalysis
    });
    
    if (content.length < 50) {
      console.log('⚠️  Content too short for meaningful processing');
    }
    
    try {
      const structuredService = new StructuredOutputService();
      
      // Test characters extraction
      console.log('\n👥 Testing character extraction...');
      const characters = await structuredService.extractCharacters(content, 'shorts');
      console.log('Extracted characters:', characters);
      
      // Test scenes extraction
      console.log('\n🎬 Testing scene extraction...');
      const scenes = await structuredService.extractScenes(content, characters, 'shorts');
      console.log('Extracted scenes:', scenes);
      
      // Test full structured pitch
      console.log('\n📝 Testing full structured pitch...');
      const structuredPitch = await structuredService.generateStructuredPitch(
        content,
        characters,
        scenes,
        'full'
      );
      console.log('Generated structured pitch:', structuredPitch);
      
      if (structuredPitch && structuredPitch.finalPitch && structuredPitch.finalPitch.length > 100) {
        console.log('✅ Structured output successful');
        console.log('Final pitch preview:', structuredPitch.finalPitch.substring(0, 200) + '...');
      } else {
        console.log('❌ Structured output failed or too short');
      }
      
    } catch (structuredError) {
      console.log('❌ Structured output generation failed:', structuredError);
      
      // Step 3: Test fallback to standard generation
      console.log('\n🔄 Step 3: Testing Standard Generation (Fallback)');
      console.log('-'.repeat(30));
      
      const prompt = `Based on the following YouTube content, create an engaging story pitch:

Title: ${processingResult.title}
Description: ${processingResult.description || 'N/A'}
Content: ${content}
Content Type: shorts
Target Language: 繁體中文

Create an engaging story pitch that captures the essence of the content and appeals to viewers. Focus on creating a narrative that would work well for video content.`;

      console.log('Prompt details:', {
        promptLength: prompt.length,
        titleIncluded: !!processingResult.title,
        descriptionIncluded: !!processingResult.description,
        contentIncluded: !!content
      });
      
      try {
        console.log('🚀 Calling generateTextWithGemini with maxTokens: 4000...');
        const standardResponse = await generateTextWithGemini(prompt, {
          temperature: 0.7,
          maxTokens: 4000
        });
        
        console.log('Standard generation result:', {
          responseLength: standardResponse?.length || 0,
          responsePreview: standardResponse?.substring(0, 200) + '...',
          isEmpty: !standardResponse || standardResponse.trim().length === 0
        });
        
        if (!standardResponse || standardResponse.trim().length < 50) {
          console.log('❌ Standard generation also failed or too short');
          console.log('This would trigger the hardcoded fallback');
        } else {
          console.log('✅ Standard generation successful');
        }
        
      } catch (geminiError) {
        console.log('❌ Standard Gemini generation failed:', geminiError);
        console.log('This would trigger the hardcoded fallback');
      }
    }
    
    // Step 4: Check what the actual API endpoint would return
    console.log('\n🌐 Step 4: Testing Full API Endpoint');
    console.log('-'.repeat(30));
    
    try {
      const response = await fetch('http://localhost:3000/api/process-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: testUrl,
          targetLanguage: '繁體中文',
          useStructuredOutput: true
        })
      });
      
      const apiResult = await response.json();
      
      console.log('API Response:', {
        success: apiResult.success,
        errorMessage: apiResult.error,
        dataExists: !!apiResult.data,
        pitchLength: apiResult.data?.generatedPitch?.length || 0,
        pitchPreview: apiResult.data?.generatedPitch?.substring(0, 200) + '...',
        isStructuredOutput: apiResult.data?.isStructuredOutput,
        warning: apiResult.data?.warning
      });
      
      if (apiResult.data?.generatedPitch?.includes('故事講述30歲的探索者')) {
        console.log('🔴 CONFIRMED: API is returning the fallback template');
        console.log('This means the issue is in the API processing chain');
      } else {
        console.log('✅ API returned proper generated content');
      }
      
    } catch (apiError) {
      console.log('❌ API call failed:', apiError);
    }
    
  } catch (error) {
    console.error('💥 Debug process failed:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Debug Complete');
}

debugYouTubeProcessing().catch(console.error);