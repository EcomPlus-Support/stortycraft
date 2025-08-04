'use server'

import { generateImageCustomizationRest, generateImageRest } from '@/lib/imagen';
import { getVertexAIConfig } from '@/lib/config';
import { AuthenticationError } from '@/lib/auth';
import { generateTextDirect } from '@/lib/gemini-direct';

import { Scene, Scenario, Language } from "../types"

export async function generateScenesDirectTest(pitch: string, numScenes: number, style: string, language: Language) {
  console.log('Testing direct Gemini API call...');
  const config = getVertexAIConfig();
  console.log('Project ID:', config.projectId);
  console.log('Location:', config.location);
  
  try {
    // Simple test prompt
    const testPrompt = `Hello, please respond with "API connection successful"`;
    
    console.log('Calling Gemini directly...');
    const response = await generateTextDirect(testPrompt, 0.1);
    
    console.log('Direct API response:', response);
    
    return {
      success: true,
      message: 'Direct API call successful',
      response: response,
      projectId: config.projectId,
      location: config.location
    };
  } catch (error) {
    console.error('Direct API test failed:', error);
    
    // Handle authentication errors specifically
    if (error instanceof AuthenticationError) {
      if (error.code === 'invalid_rapt') {
        throw new Error('Authentication failed: Please ask your administrator to run "gcloud auth application-default login" to reauthenticate.')
      }
      throw new Error(`Authentication error: ${error.message}`)
    }
    
    // Check for specific Google OAuth errors in the error message
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      throw new Error('Authentication failed: Google credentials have expired. Please ask your administrator to run "gcloud auth application-default login" to reauthenticate.')
    }
    
    throw new Error(`Direct API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}