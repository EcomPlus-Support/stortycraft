#!/usr/bin/env npx tsx

/**
 * Direct Gemini API test to diagnose empty response issue
 */

import { generateText } from 'ai'
import { createVertex } from '@ai-sdk/google-vertex'

async function testGeminiDirect() {
  console.log('🔬 Direct Gemini API Test');
  console.log('='.repeat(50));
  
  try {
    const vertex = createVertex({
      project: 'fechen-aifactory',
      location: 'us-central1',
      googleAuthOptions: {
        projectId: 'fechen-aifactory',
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      },
    });

    // Test 1: Very simple prompt
    console.log('\n🧪 Test 1: Simple English prompt');
    console.log('-'.repeat(30));
    
    try {
      const result1 = await generateText({
        model: vertex('gemini-2.5-flash'),
        prompt: 'Say hello.',
        temperature: 0.1,
        maxTokens: 50,
        abortSignal: AbortSignal.timeout(10000)
      });
      
      console.log('✅ Response received:', {
        text: result1.text,
        length: result1.text?.length || 0,
        finishReason: result1.finishReason,
        usage: result1.usage
      });
    } catch (error) {
      console.log('❌ Test 1 failed:', error);
    }

    // Test 2: Chinese prompt with different parameters
    console.log('\n🧪 Test 2: Chinese prompt');
    console.log('-'.repeat(30));
    
    try {
      const result2 = await generateText({
        model: vertex('gemini-2.5-flash'),
        prompt: '你好',
        temperature: 0.5,
        maxTokens: 100,
        abortSignal: AbortSignal.timeout(15000)
      });
      
      console.log('✅ Response received:', {
        text: result2.text,
        length: result2.text?.length || 0,
        finishReason: result2.finishReason,
        usage: result2.usage
      });
    } catch (error) {
      console.log('❌ Test 2 failed:', error);
    }

    // Test 3: Different model
    console.log('\n🧪 Test 3: Different model (gemini-1.5-flash)');
    console.log('-'.repeat(30));
    
    try {
      const result3 = await generateText({
        model: vertex('gemini-1.5-flash'),
        prompt: 'Hello, how are you?',
        temperature: 0.7,
        maxTokens: 100,
        abortSignal: AbortSignal.timeout(15000)
      });
      
      console.log('✅ Response received:', {
        text: result3.text,
        length: result3.text?.length || 0,
        finishReason: result3.finishReason,
        usage: result3.usage
      });
    } catch (error) {
      console.log('❌ Test 3 failed:', error);
    }

    // Test 4: System message format
    console.log('\n🧪 Test 4: System message format');
    console.log('-'.repeat(30));
    
    try {
      const result4 = await generateText({
        model: vertex('gemini-2.5-flash'),
        messages: [
          { role: 'user', content: 'Please respond with exactly "TEST SUCCESSFUL" in English.' }
        ],
        temperature: 0.1,
        maxTokens: 50,
        abortSignal: AbortSignal.timeout(15000)
      });
      
      console.log('✅ Response received:', {
        text: result4.text,
        length: result4.text?.length || 0,
        finishReason: result4.finishReason,
        usage: result4.usage
      });
    } catch (error) {
      console.log('❌ Test 4 failed:', error);
    }

    // Test 5: Check raw response structure
    console.log('\n🧪 Test 5: Detailed response inspection');
    console.log('-'.repeat(30));
    
    try {
      const result5 = await generateText({
        model: vertex('gemini-2.5-flash'),
        prompt: 'Please write exactly: "This is a test response."',
        temperature: 0,
        maxTokens: 20,
        abortSignal: AbortSignal.timeout(15000)
      });
      
      console.log('Full result object:', JSON.stringify(result5, null, 2));
    } catch (error) {
      console.log('❌ Test 5 failed:', error);
    }

  } catch (error) {
    console.error('💥 Setup error:', error);
  }
}

testGeminiDirect().catch(console.error);