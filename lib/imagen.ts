import { log } from 'console'
import { GoogleAuth } from 'google-auth-library'
import { getVertexAIConfig, IMAGEN_MODELS } from './config'
import { getAuthManager, AuthenticationError } from './auth'
import { validateImagenAspectRatio, validateAspectRatio } from './validation'
import { ImagenError, createAspectRatioError, withRetry } from './errors'
import { getCacheManager, cacheImage, getCachedImage } from './cache'
import { logger, withErrorLogging } from './logger'
import { getMetricsCollector, withMetrics, recordImageGeneration } from './metrics'
import type { AspectRatio } from '@/app/types'


const config = getVertexAIConfig();
const LOCATION = config.location;
const PROJECT_ID = config.projectId;
const MODEL = IMAGEN_MODELS['imagen-3.0-generate-002'];
const MODEL_EDIT = IMAGEN_MODELS['imagen-3.0-capability-001'];

async function getAccessToken(): Promise<string> {
  console.log('Getting access token for project:', PROJECT_ID);
  console.log('Location:', LOCATION);
  
  const authManager = getAuthManager();
  try {
    return await authManager.getAccessToken();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('Authentication error:', error.message);
      if (error.description) {
        console.error('Details:', error.description);
      }
      if (error.code === 'invalid_rapt') {
        console.error('\nAction required: Please run the following command to reauthenticate:');
        console.error('gcloud auth application-default login\n');
      }
    }
    throw error;
  }
}

interface GenerateImageResponse {
  predictions: Array<{
    bytesBase64Encoded: string;
    mimeType: string;
    gcsUri: string;
    raiFilteredReason?: string;
  }>;
}

export async function generateImageRest(prompt: string, aspectRatio?: string): Promise<GenerateImageResponse> {
  const token = await getAccessToken();
  const maxRetries = 5; // Maximum number of retries
  const initialDelay = 1000; // Initial delay in milliseconds (1 second)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({
            instances: [
              {
                prompt: prompt
              },
            ],
            parameters: {
              // storageUri: "gs://svc-demo-vertex-us/",
              safetySetting: 'block_only_high',
              sampleCount: 1,
              aspectRatio: aspectRatio ? aspectRatio : "16:9",
              includeRaiReason: true,
            },
          }),
        }
      )
      // Check if the response was successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const jsonResult = await response.json(); // Parse as JSON
      return jsonResult;
    } catch (error) {
      if (attempt < maxRetries) {
        const baseDelay = initialDelay * Math.pow(2, attempt); // Exponential backoff
        const jitter = Math.random() * 2000; // Random value between 0 and baseDelay
        const delay = baseDelay + jitter;
        console.warn(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`Failed after ${maxRetries} attempts.`, error);
        throw error; // Re-throw the error after maximum retries
      }
    }
  }
  throw new Error("Function should have returned or thrown an error before this line.");
}

export async function generateImageCustomizationRest(prompt: string, characters: Array<{ name: string, description: string, imageBase64?: string }>, aspectRatio?: string): Promise<GenerateImageResponse> {
  const token = await getAccessToken();
  const maxRetries = 1;
  const initialDelay = 1000;

  const referenceImagesPayload = characters
    .filter(character => character.imageBase64)
    .map((character, index) => ({
      referenceType: 'REFERENCE_TYPE_SUBJECT',
      referenceId: index + 1,
      referenceImage: {
        bytesBase64Encoded: character.imageBase64!,
      },
      subjectImageConfig: {
        subjectDescription: character.description,
        subjectType: 'SUBJECT_TYPE_PERSON',
      },
    }));

  const customizedPrompt = `Generate an image of ${referenceImagesPayload.map((ref) => `${ref.subjectImageConfig.subjectDescription} [${ref.referenceId}]`)} to match this description: ${prompt}`

  const body = JSON.stringify({
    instances: [
      {
        prompt: customizedPrompt,
        referenceImages: referenceImagesPayload,
      },
    ],
    parameters: {
      // storageUri: "gs://svc-demo-vertex-us/",
      safetySetting: 'block_only_high',
      sampleCount: 1,
      aspectRatio: aspectRatio ? aspectRatio : "16:9",
      includeRaiReason: true,
    },
  })

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_EDIT}:predict`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: body,
        }
      )
      // Check if the response was successful
      if (!response.ok) {
        console.log(response)
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const jsonResult = await response.json(); // Parse as JSON
      return jsonResult;
    } catch (error) {
      if (attempt < maxRetries) {
        const baseDelay = initialDelay * Math.pow(2, attempt); // Exponential backoff
        const jitter = Math.random() * 2000; // Random value between 0 and baseDelay
        const delay = baseDelay + jitter;
        console.warn(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`Failed after ${maxRetries} attempts.`, error);
        throw error; // Re-throw the error after maximum retries
      }
    }
  }
  throw new Error("Function should have returned or thrown an error before this line.");
}