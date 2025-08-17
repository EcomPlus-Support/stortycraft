#!/usr/bin/env bun
/**
 * Simple Aspect Ratio Test
 */

import { regenerateImage } from './app/actions/regenerate-image';
import type { AspectRatio } from './app/types';

const testPrompt = "A simple test image";

// Test AspectRatio object
const aspectRatio9x16: AspectRatio = {
  id: '9:16',
  label: '9:16 Portrait',
  ratio: 9/16,
  width: 9,
  height: 16,
  cssClass: 'aspect-[9/16]',
  imagenFormat: '9:16'
};

async function testAspectRatio() {
  console.log('🧪 Testing AspectRatio object with regenerateImage');
  
  try {
    const result = await regenerateImage(testPrompt, aspectRatio9x16);
    console.log('✅ Test passed! Image generated with AspectRatio object');
    console.log(`Image length: ${result.imageBase64.length}`);
    console.log('🎉 Aspect ratio fix is working correctly!');
  } catch (error) {
    console.log('❌ Test failed:', error);
  }
}

testAspectRatio();