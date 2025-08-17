#!/usr/bin/env npx tsx

/**
 * Debug script to check API configuration and connection status
 */

import { getVertexAIConfig, validateVertexAIConfig } from './lib/config'
import { checkGeminiHealth, generateTextWithGemini } from './lib/gemini-service'

async function checkAPIStatus() {
  console.log('🔍 API Configuration and Connection Status Check');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Check environment configuration
    console.log('\n📋 Step 1: Environment Configuration');
    console.log('-'.repeat(40));
    
    const config = getVertexAIConfig();
    console.log('✅ Configuration loaded:', {
      projectId: config.projectId,
      location: config.location,
      geminiModel: config.geminiModel,
      youtubeApiKey: config.youtubeApiKey ? '✅ Set' : '❌ Not set'
    });
    
    // Step 2: Validate configuration
    console.log('\n🔧 Step 2: Configuration Validation');
    console.log('-'.repeat(40));
    
    try {
      validateVertexAIConfig();
      console.log('✅ Configuration validation passed');
    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      return;
    }
    
    // Step 3: Check authentication
    console.log('\n🔐 Step 3: Authentication Check');
    console.log('-'.repeat(40));
    
    // Check if gcloud is authenticated
    const { execSync } = require('child_process');
    try {
      const authInfo = execSync('gcloud auth list --filter="status:ACTIVE" --format="value(account)"', { encoding: 'utf8' });
      if (authInfo.trim()) {
        console.log('✅ Gcloud authentication active:', authInfo.trim());
      } else {
        console.log('❌ No active gcloud authentication');
      }
    } catch (error) {
      console.log('⚠️  Could not check gcloud auth status:', error);
    }
    
    // Check service account key file
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (serviceAccountPath) {
      const fs = require('fs');
      if (fs.existsSync(serviceAccountPath)) {
        console.log('✅ Service account key file exists:', serviceAccountPath);
      } else {
        console.log('❌ Service account key file not found:', serviceAccountPath);
      }
    } else {
      console.log('⚠️  GOOGLE_APPLICATION_CREDENTIALS not set, using default credentials');
    }
    
    // Step 4: Test Gemini API connection
    console.log('\n🚀 Step 4: Gemini API Connection Test');
    console.log('-'.repeat(40));
    
    const healthStatus = await checkGeminiHealth();
    console.log('Health check result:', healthStatus);
    
    if (healthStatus.healthy) {
      console.log('✅ Gemini API is healthy');
      console.log(`   Model: ${healthStatus.model}`);
      console.log(`   Region: ${healthStatus.region}`);
      console.log(`   Response time: ${healthStatus.responseTime}ms`);
    } else {
      console.log('❌ Gemini API is unhealthy');
      if (healthStatus.error) {
        console.log(`   Error: ${healthStatus.error}`);
      }
    }
    
    // Step 5: Test actual text generation
    console.log('\n📝 Step 5: Text Generation Test');
    console.log('-'.repeat(40));
    
    if (healthStatus.healthy) {
      try {
        const testPrompt = '請用繁體中文回答：什麼是人工智能？請給出一個簡短的回答（約50字）。';
        console.log('Testing with prompt:', testPrompt);
        
        const startTime = Date.now();
        const result = await generateTextWithGemini(testPrompt, {
          temperature: 0.7,
          maxTokens: 200
        });
        const responseTime = Date.now() - startTime;
        
        console.log('✅ Text generation successful');
        console.log(`   Response time: ${responseTime}ms`);
        console.log(`   Generated text: "${result}"`);
        console.log(`   Text length: ${result.length} characters`);
        
        // Check if response looks like fallback
        if (result.includes('基於您提供的') || result.length < 30) {
          console.log('⚠️  Response might be from fallback mechanism');
        }
        
      } catch (error) {
        console.log('❌ Text generation failed:', error);
      }
    } else {
      console.log('⏭️  Skipping text generation test due to unhealthy API');
    }
    
    // Step 6: Test with longer content (similar to actual use case)
    console.log('\n📄 Step 6: Complex Content Test');
    console.log('-'.repeat(40));
    
    if (healthStatus.healthy) {
      try {
        const complexPrompt = `你是一位專業的故事創作者。請根據以下YouTube內容創作一個引人入勝的故事：

標題：科技創新的未來
描述：這是一個關於人工智能如何改變我們生活的短片
主要內容：探討AI技術在日常生活中的應用，包括智能家居、自動駕駛車輛和個人助理等

請創作一個約200字的故事，要求：
1. 使用繁體中文
2. 內容要生動有趣
3. 包含具體的情節和角色
4. 展現科技對人類生活的正面影響

請開始創作：`;

        console.log('Testing complex prompt...');
        const startTime = Date.now();
        const result = await generateTextWithGemini(complexPrompt, {
          temperature: 0.8,
          maxTokens: 1000
        });
        const responseTime = Date.now() - startTime;
        
        console.log('✅ Complex generation successful');
        console.log(`   Response time: ${responseTime}ms`);
        console.log(`   Generated text length: ${result.length} characters`);
        console.log(`   Generated text preview: "${result.substring(0, 100)}..."`);
        
        // Analyze quality
        if (result.length < 100) {
          console.log('⚠️  Response is too short, might indicate API issues');
        } else if (result.includes('基於您提供的')) {
          console.log('⚠️  Response uses fallback template');
        } else if (result.length > 150 && result.includes('科技') && result.includes('人工智能')) {
          console.log('✅ Response appears to be properly generated');
        }
        
      } catch (error) {
        console.log('❌ Complex generation failed:', error);
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error during API status check:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 API Status Check Complete');
}

// Run the check
checkAPIStatus().catch(console.error);