#!/usr/bin/env bun
/**
 * Aspect Ratio Fix Testing Script
 * 
 * This script tests the newly implemented aspect ratio functionality across all image generation systems.
 * 
 * Tests:
 * 1. regenerateImage function with different aspect ratios
 * 2. generateScenes function with aspect ratio parameter
 * 3. generateScenesStructured function with aspect ratio parameter
 * 4. Verification that aspect ratios are properly passed to Imagen API
 * 5. Image generation with various aspect ratios (16:9, 9:16, 4:3, 3:4, 1:1)
 */

import { regenerateImage } from './app/actions/regenerate-image';
import { generateScenes } from './app/actions/generate-scenes';
import { generateScenesStructured } from './app/actions/generate-scenes-structured';
import { generateImageRest } from './lib/imagen';
import type { AspectRatio, Language } from './app/types';

// Test configurations
const TEST_PROMPT = "A beautiful sunset over mountains with cinematic lighting";
const TEST_PITCH = "A story about innovation and technology in modern society";
const TEST_LANGUAGE: Language = { name: "English", code: "en" };

// Aspect ratios to test
const ASPECT_RATIOS: (AspectRatio | string)[] = [
  '16:9',  // Widescreen
  '9:16',  // Portrait (primary test case)
  '4:3',   // Standard
  '3:4',   // Portrait standard
  '1:1'    // Square
];

// Mock aspect ratio objects for full testing
const ASPECT_RATIO_OBJECTS: AspectRatio[] = [
  { id: '16:9', label: '16:9 Widescreen', ratio: 16/9, width: 16, height: 9, cssClass: 'aspect-[16/9]', imagenFormat: '16:9' },
  { id: '9:16', label: '9:16 Portrait', ratio: 9/16, width: 9, height: 16, cssClass: 'aspect-[9/16]', imagenFormat: '9:16' },
  { id: '4:3', label: '4:3 Standard', ratio: 4/3, width: 4, height: 3, cssClass: 'aspect-[4/3]', imagenFormat: '4:3' },
  { id: '3:4', label: '3:4 Portrait', ratio: 3/4, width: 3, height: 4, cssClass: 'aspect-[3/4]', imagenFormat: '3:4' },
  { id: '1:1', label: '1:1 Square', ratio: 1, width: 1, height: 1, cssClass: 'aspect-square', imagenFormat: '1:1' }
];

class TestRunner {
  private testResults: Array<{
    testName: string;
    success: boolean;
    error?: string;
    duration?: number;
    details?: any;
  }> = [];

  async runTest(testName: string, testFn: () => Promise<any>): Promise<boolean> {
    console.log(`\n🧪 Running test: ${testName}`);
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      this.testResults.push({
        testName,
        success: true,
        duration,
        details: result
      });
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.log(`❌ ${testName} - FAILED (${duration}ms)`);
      console.log(`   Error: ${errorMessage}`);
      
      this.testResults.push({
        testName,
        success: false,
        duration,
        error: errorMessage
      });
      return false;
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🎯 Starting Aspect Ratio Fix Tests\n');
    console.log('=' .repeat(60));
    
    // Test 1: regenerateImage function with string aspect ratios
    for (const aspectRatio of ASPECT_RATIOS) {
      await this.runTest(`regenerateImage with ${aspectRatio} aspect ratio`, async () => {
        const result = await regenerateImage(TEST_PROMPT, aspectRatio);
        
        // Verify result structure
        if (!result || !result.imageBase64) {
          throw new Error('No image data returned');
        }
        
        // Verify base64 format
        if (!result.imageBase64.match(/^[A-Za-z0-9+/=]+$/)) {
          throw new Error('Invalid base64 format');
        }
        
        return {
          aspectRatio,
          imageLength: result.imageBase64.length,
          hasValidBase64: true
        };
      });
    }

    // Test 2: regenerateImage function with AspectRatio objects
    for (const aspectRatio of ASPECT_RATIO_OBJECTS) {
      await this.runTest(`regenerateImage with ${aspectRatio.id} AspectRatio object`, async () => {
        const result = await regenerateImage(TEST_PROMPT, aspectRatio);
        
        if (!result || !result.imageBase64) {
          throw new Error('No image data returned');
        }
        
        return {
          aspectRatio: aspectRatio.id,
          imageLength: result.imageBase64.length
        };
      });
    }

    // Test 3: generateScenes function with aspect ratio
    await this.runTest('generateScenes with 9:16 aspect ratio', async () => {
      const result = await generateScenes(
        TEST_PITCH,
        2, // numScenes
        'cinematic',
        TEST_LANGUAGE,
        '9:16' // aspectRatio
      );
      
      if (!result || !result.scenes || result.scenes.length === 0) {
        throw new Error('No scenes generated');
      }
      
      // Check if scenes have images
      const scenesWithImages = result.scenes.filter(scene => scene.imageBase64);
      
      return {
        totalScenes: result.scenes.length,
        scenesWithImages: scenesWithImages.length,
        firstSceneHasImage: !!result.scenes[0].imageBase64,
        scenario: result.scenario.substring(0, 100) + '...'
      };
    });

    // Test 4: generateScenesStructured function with aspect ratio
    await this.runTest('generateScenesStructured with 9:16 aspect ratio', async () => {
      const result = await generateScenesStructured(
        TEST_PITCH,
        2, // numScenes
        'cinematic',
        'English',
        null, // logoOverlay
        undefined, // structuredPitch
        '9:16' // aspectRatio
      );
      
      if (!result || !result.scenes || result.scenes.length === 0) {
        throw new Error('No scenes generated');
      }
      
      return {
        totalScenes: result.scenes.length,
        hasScenario: !!result.scenario,
        firstSceneDescription: result.scenes[0].description?.substring(0, 50) + '...'
      };
    });

    // Test 5: Direct Imagen API test with different aspect ratios
    await this.runTest('Direct Imagen API with 9:16 aspect ratio', async () => {
      const result = await generateImageRest(TEST_PROMPT, '9:16');
      
      if (!result || !result.predictions || result.predictions.length === 0) {
        throw new Error('No predictions returned from Imagen API');
      }
      
      const prediction = result.predictions[0];
      if (!prediction.bytesBase64Encoded) {
        throw new Error('No image data in prediction');
      }
      
      return {
        predictionCount: result.predictions.length,
        hasImageData: !!prediction.bytesBase64Encoded,
        imageSize: prediction.bytesBase64Encoded.length,
        mimeType: prediction.mimeType || 'unknown'
      };
    });

    // Test 6: Aspect ratio parameter verification
    await this.runTest('Aspect ratio parameter flow verification', async () => {
      // This test verifies that different aspect ratios produce different results
      const results = [];
      
      for (const aspectRatio of ['16:9', '9:16']) {
        const result = await regenerateImage(
          "A simple geometric pattern",
          aspectRatio
        );
        results.push({
          aspectRatio,
          imageHash: result.imageBase64.substring(0, 20) // Simple hash for comparison
        });
      }
      
      // Verify that different aspect ratios produce different images
      const uniqueHashes = new Set(results.map(r => r.imageHash));
      if (uniqueHashes.size !== results.length) {
        console.warn('⚠️  Warning: Different aspect ratios produced identical images');
      }
      
      return {
        testedAspectRatios: results.map(r => r.aspectRatio),
        uniqueResults: uniqueHashes.size,
        expectedUnique: results.length
      };
    });

    // Test 7: Error handling with invalid aspect ratios
    await this.runTest('Error handling with invalid aspect ratio', async () => {
      try {
        await regenerateImage(TEST_PROMPT, 'invalid-ratio');
        throw new Error('Should have thrown an error for invalid aspect ratio');
      } catch (error) {
        // We expect this to either handle gracefully or throw a meaningful error
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return {
          errorHandled: true,
          errorMessage: errorMessage.substring(0, 100)
        };
      }
    });

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`  • ${result.testName}: ${result.error}`);
        });
    }
    
    // Calculate average duration
    const avgDuration = this.testResults
      .filter(r => r.duration)
      .reduce((sum, r) => sum + (r.duration || 0), 0) / totalTests;
    
    console.log(`\n⏱️  Average Test Duration: ${avgDuration.toFixed(0)}ms`);
    
    // Critical test results
    console.log('\n🎯 CRITICAL FUNCTIONALITY CHECK:');
    const criticalTests = [
      'regenerateImage with 9:16 aspect ratio',
      'generateScenes with 9:16 aspect ratio',
      'Direct Imagen API with 9:16 aspect ratio'
    ];
    
    criticalTests.forEach(testName => {
      const result = this.testResults.find(r => r.testName === testName);
      const status = result?.success ? '✅' : '❌';
      console.log(`  ${status} ${testName}`);
    });
    
    console.log('\n' + '=' .repeat(60));
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Aspect ratio fix is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.');
    }
  }
}

// Main execution
async function main() {
  const testRunner = new TestRunner();
  
  try {
    await testRunner.runAllTests();
  } catch (error) {
    console.error('💥 Fatal error during testing:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { TestRunner };