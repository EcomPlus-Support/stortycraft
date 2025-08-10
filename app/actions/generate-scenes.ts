'use server'

import { generateImageCustomizationRest, generateImageRest } from '@/lib/imagen';
import { getVertexAIConfig, TIMEOUTS } from '@/lib/config';
import { AuthenticationError } from '@/lib/auth';
import { parseWithFallback, translateError, cleanJsonResponse, validateScenesData, validateScenesDataLenient } from '@/lib/error-utils';
import { generateTextWithGemini, GeminiServiceError, checkGeminiHealth } from '@/lib/gemini-service';
import { createDebugTracker, logEnvironmentInfo, validateEnvironment } from '@/lib/debug-utils';

import { Scene, Scenario, Language } from "../types"

const config = getVertexAIConfig();

/**
 * Create a fallback scenario when AI parsing fails
 */
function createFallbackScenario(pitch: string, numScenes: number, style: string, language: Language): Scenario {
  console.log('Creating fallback scenario for pitch:', pitch.substring(0, 100))
  
  const fallbackScenes: Scene[] = []
  
  for (let i = 0; i < numScenes; i++) {
    fallbackScenes.push({
      imagePrompt: `${style} style: A compelling scene from the story "${pitch.substring(0, 50)}...". Professional cinematography with dramatic lighting and composition.`,
      videoPrompt: `Camera slowly moves to reveal the scene. Characters move naturally with emotional expressions that convey the story's message.`,
      description: `Scene ${i + 1}: The story unfolds as we see the key moment from the pitch come to life.`,
      voiceover: `This scene brings the story to life with visual impact.`,
      charactersPresent: []
    })
  }
  
  return {
    scenario: `A compelling story based on: ${pitch}. This scenario brings the core message to life through visual storytelling.`,
    genre: 'Cinematic',
    mood: 'Inspirational',
    music: 'Orchestral score that enhances the emotional journey of the story.',
    language: {
      name: language.name,
      code: language.code
    },
    characters: [
      { name: 'Protagonist', description: 'A relatable character who embodies the story\'s main theme' }
    ],
    settings: [
      { name: 'Main Setting', description: 'A visually appealing environment that supports the story narrative' }
    ],
    scenes: fallbackScenes
  }
}

export async function generateScenes(pitch: string, numScenes: number, style: string, language: Language) {
  const debugTracker = createDebugTracker('generate-scenes');
  
  try {
    debugTracker.startStep('initialization');
    console.log('🎬 Generating scenes with enhanced Gemini service');
    
    // Log environment information for debugging
    logEnvironmentInfo();
    
    // Validate environment configuration
    const envValidation = validateEnvironment();
    if (!envValidation.valid) {
      console.error('❌ Environment validation failed:', envValidation.issues);
      debugTracker.addError('initialization', `Environment issues: ${envValidation.issues.join(', ')}`);
    }
    if (envValidation.warnings.length > 0) {
      console.warn('⚠️ Environment warnings:', envValidation.warnings);
    }
    
    console.log('📊 Configuration:', {
      projectId: config.projectId,
      location: config.location,
      geminiModel: config.geminiModel,
      pitchLength: pitch.length,
      numScenes,
      style,
      language: language.name
    });
    debugTracker.endStep('initialization', true);
    
    // First, check Gemini service health
    debugTracker.startStep('health-check');
    const healthStatus = await checkGeminiHealth();
    console.log('🏥 Gemini Health Check:', healthStatus);
    
    if (!healthStatus.healthy) {
      console.error('❌ Gemini service is not healthy:', healthStatus.error);
      debugTracker.endStep('health-check', false, healthStatus.error);
      debugTracker.addError('health-check', healthStatus.error || 'Service unhealthy');
      
      // Return fallback scenario if Gemini is completely unavailable
      console.log('🔄 Creating fallback scenario due to Gemini unavailability');
      debugTracker.startStep('fallback-scenario');
      const fallback = createFallbackScenario(pitch, numScenes, style, language);
      debugTracker.endStep('fallback-scenario', true);
      debugTracker.logSummary();
      return fallback;
    }
    debugTracker.endStep('health-check', true);
  
    debugTracker.startStep('gemini-text-generation');
    const prompt = `
      You are tasked with generating a creative scenario for a short movie and creating prompts for storyboard illustrations. Follow these instructions carefully:
1. First, you will be given a story pitch. This story pitch will be the foundation for your scenario.

<pitch>
${pitch}
</pitch>

2. Generate a scenario in ${language.name} for an ad movie based on the story pitch. Stick as close as possible to the pitch. Do not include children in your scenario.

3. What Music Genre will best fit this video, pick from: 
- Alternative & Punk
- Ambient
- Children's
- Cinematic
- Classical
- Country & Folk
- Dance & Electronic
- Hip-Hop & Rap
- Holiday
- Jazz & Blues
- Pop
- R&B & Soul
- Reggae
- Rock

4. What is the mood of this video, pick from:
- Angry
- Bright
- Calm
- Dark
- Dramatic
- Funky
- Happy
- Inspirational
- Romantic
- Sad

5. Generate a short description of the music that will be used in the video.

6. After creating the scenario, generate ${numScenes} creative scenes to create a storyboard illustrating the scenario. Follow these guidelines for the scenes:
 a. For each scene, provide:
 1. A detailed visual description for AI image generation (imagePrompt), the style should be ${style}. Always use the FULL character(s) description(s) in your images prompts. Do NOT use the character(s) name(s) in your image prompts.  Always use indefinite articles when describing character(s). No children.
 2. A video prompt, focusing on the movement of the characters, objects, in the scene. Always use the FULL character(s) description(s) in your images prompts. Do NOT use the character(s) name(s) in your image prompts.  Always use indefinite articles when describing character(s). No children.
 3. A scene description  in ${language.name} explaining what happens (description). You can use the character(s) name(s) in your descriptions.
 4. A short, narrator voiceover text in ${language.name}. One full sentence, 6s max. (voiceover). You can use the character(s) name(s) in your vocieovers. 
a. Each image prompt should describe a key scene or moment from your scenario.
b. Ensure that the image prompts, when viewed in sequence, tell a coherent story.
c. Include descriptions of characters, settings, and actions that are consistent across all image prompts.
d. Make each image prompt vivid and detailed enough to guide the creation of a storyboard illustration.

7. Format your output as follows:
- First, provide a detailed description of your scenario in ${language.name}.
- Then from this scenario provide a short description of each character in the story inside the characters key.
- Then from this scenario provide a short description of each setting in the story inside the settings key.
- Then, list the ${numScenes} scenes
- Each image prompt in the scenes should reuse the full characters and settings description generated on the <characters> and <settings> tags every time, on every prompt
- Do not include any additional text or explanations between the prompts.

CRITICAL: Your response must be valid JSON that can be parsed by JSON.parse(). 
Do not include any markdown formatting, comments, or additional text outside the JSON object.
Do not wrap your response in backtick code blocks.
Return ONLY the raw JSON object.

Format the response as a JSON object.
Here's an example of how your output should be structured:
{
 "scenario": "[Brief description of your creative scenario based on the given story pitch]",
 "genre": [Music genre],
 "mood": [Mood],
 "music": [Short description of the music that will be used in the video],
 "language": {
   "name": "${language.name}",
   "code": "${language.code}"
 },
 "characters": [
  {"name": [character 1 name], "description": [character 1 description]},
  {"name": [character 2 name], "description": [character 2 description]},
  [...]
 ],
 "settings": [
  {"name": [setting 1 name], "description": [setting 1 description]},
  {"name": [setting 2 name], "description": [setting 2 description]},
  [...]
 ],
 "scenes": [
 {
  "imagePrompt": [A detailed visual description for AI image generation, the style should always be cinematic and photorealistic],
  "videoPrompt": [A video prompt, focusing on the movement of the characters, objects, in the scene],
  "description": [A scene description explaining what happens],
  "voiceover": [A short, narrator voiceover text. One full sentence, 6s max.],
  "charactersPresent": [An array list of names of characters visually present in the scene]
 },
 [...]
 }
 ]
}

Remember, your goal is to create a compelling and visually interesting story that can be effectively illustrated through a storyboard. Be creative, consistent, and detailed in your scenario and prompts.`

    console.log('🎯 Creating storyboard with Gemini...');
    
    const text = await generateTextWithGemini(prompt, {
      temperature: 1,
      maxTokens: 8192,
      timeout: TIMEOUTS.GEMINI_TEXT_GENERATION
    });
    
    console.log(`✅ Gemini response received:`, {
      textLength: text.length,
      textPreview: text.substring(0, 200) + '...'
    });
    debugTracker.endStep('gemini-text-generation', true);

    if (!text) {
      debugTracker.endStep('gemini-text-generation', false, 'No text generated');
      throw new Error('No text generated from the AI model');
    }

    debugTracker.startStep('response-parsing');
    let scenario: Scenario;
    let scenes: Scene[];
    try {
      // Use three-tier parsing strategy for better compatibility
      const parseResult = parseWithFallback(text);
      
      if (!parseResult.success) {
        // Log the actual response for debugging
        console.error('Failed to parse AI response, raw text:', text.substring(0, 500));
        debugTracker.addError('response-parsing', `Parse error: ${parseResult.error.message}`);
        
        throw new Error(`${parseResult.error.title}: ${parseResult.error.message}${
          parseResult.error.actionable ? ` ${parseResult.error.actionable}` : ''
        }`);
      }
      
      // Use lenient validation for better main branch compatibility
      const scenesValidation = validateScenesDataLenient(parseResult.data);
      if (!scenesValidation.valid) {
        debugTracker.addError('response-parsing', `Validation error: ${scenesValidation.warnings?.join(', ') || 'Unknown validation issue'}`);
        console.log('🔄 Lenient validation failed, using fallback scenario');
        debugTracker.startStep('fallback-scenario');
        const fallback = createFallbackScenario(pitch, numScenes, style, language);
        debugTracker.endStep('fallback-scenario', true);
        return fallback;
      }
      
      if (scenesValidation.warnings && scenesValidation.warnings.length > 0) {
        console.warn('⚠️ Validation warnings (but continuing):', scenesValidation.warnings);
      }
      
      const parsedScenario = scenesValidation.data;
      
      // Ensure the language is set correctly
      scenario = {
        ...parsedScenario,
        language: {
          name: language.name,
          code: language.code
        }
      };
      
      console.log('📝 Scenario:', scenario.scenario);
      console.log('👥 Characters:', scenario.characters.map(c => c.name));
      console.log('🏞️ Settings:', scenario.settings.map(s => s.name));
      scenes = scenario.scenes;
      console.log('🎬 Scenes generated:', scenes.length);
      debugTracker.endStep('response-parsing', true);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      debugTracker.endStep('response-parsing', false, parseError instanceof Error ? parseError.message : 'Unknown parsing error');
      debugTracker.addError('response-parsing', parseError instanceof Error ? parseError : 'Unknown parsing error');
      
      // Multi-layer error handling: instead of throwing, use fallback
      console.log('🔄 Parse error encountered, creating fallback scenario for better compatibility');
      debugTracker.startStep('fallback-scenario');
      const fallback = createFallbackScenario(pitch, numScenes, style, language);
      debugTracker.endStep('fallback-scenario', true);
      debugTracker.logSummary();
      return fallback;
    }

    if (!Array.isArray(scenes)) {
      debugTracker.addError('validation', 'Invalid scene data structure: expected an array');
      throw new Error('Invalid scene data structure: expected an array');
    }

    debugTracker.startStep('character-image-generation');
    const charactersWithImages = await Promise.all(scenario.characters.map(async (character, index) => {
      try {
        console.log(`Generating image for character ${index + 1}: ${character.name}`);
        const resultJson = await generateImageRest(`${style}: ${character.description}`, "1:1");
        if (resultJson.predictions[0].raiFilteredReason) {
            debugTracker.addError('character-image-generation', `Character ${character.name}: ${resultJson.predictions[0].raiFilteredReason}`);
            throw new Error(resultJson.predictions[0].raiFilteredReason);
        } else {
            console.log(`✅ Generated character image for ${character.name}:`, resultJson.predictions[0].bytesBase64Encoded.substring(0, 50) + '...');
            return { ...character, imageBase64: resultJson.predictions[0].bytesBase64Encoded };
        }
      } catch (error) {
        console.error(`❌ Error generating character image for ${character.name}:`, error);
        debugTracker.addError('character-image-generation', `Character ${character.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return { ...character, imageBase64: '' };
      }
    }));
    debugTracker.endStep('character-image-generation', true);

    scenario.characters = charactersWithImages

    // If we have fewer scenes than requested, add placeholder scenes
    while (scenes.length < numScenes) {
      scenes.push({
        imagePrompt: "A blank canvas waiting to be filled with imagination",
        videoPrompt: "Describe what is happening in the video",
        description: "This scene is yet to be created. Let your imagination run wild!",
        voiceover: "What happens next? The story is yours to continue...",
        charactersPresent: [],
      })
    }

    // If we have more scenes than requested, trim the excess
    if (scenes.length > numScenes) {
      scenes = scenes.slice(0, numScenes)
    }

    debugTracker.startStep('scene-image-generation');
    // Generate images for each scene
    const scenesWithImages = await Promise.all(scenes.map(async (scene, index) => {
      try {
        // const { images } = await generateImage({
        //   model: vertex.image('imagen-3.0-generate-001'),
        //   prompt: scene.imagePrompt,
        //   n: 1,
        //   aspectRatio: '16:9'
        // });
        console.log(`🎨 Generating image for scene ${index + 1}`);
        let resultJson;
        if (false && scene.charactersPresent.length > 0) {
          const presentCharacters = charactersWithImages.filter(character =>
            scene.charactersPresent.includes(character.name)
          );

          if (presentCharacters.length > 0) {
             console.log(`Using character customization for characters: ${presentCharacters.map(c => c.name).join(', ')}`);
             resultJson = await generateImageCustomizationRest(scene.imagePrompt, presentCharacters);
          } else {
             console.warn(`Scene ${index + 1} listed characters [${scene.charactersPresent.join(', ')}] but no matching data found in charactersWithImages. Falling back to standard generation.`);
             resultJson = await generateImageRest(scene.imagePrompt);
          }
        } else {
          resultJson = await generateImageRest(scene.imagePrompt);
        }
        if (resultJson.predictions[0].raiFilteredReason) {
            debugTracker.addError('scene-image-generation', `Scene ${index + 1}: ${resultJson.predictions[0].raiFilteredReason}`);
            throw new Error(resultJson.predictions[0].raiFilteredReason);
        } else {
            console.log(`✅ Generated scene ${index + 1} image:`, resultJson.predictions[0].bytesBase64Encoded.substring(0, 50) + '...');
            return { ...scene, imageBase64: resultJson.predictions[0].bytesBase64Encoded };
        }
      } catch (error) {
        console.error(`❌ Error generating scene ${index + 1} image:`, error);
        debugTracker.addError('scene-image-generation', `Scene ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return { ...scene, imageBase64: '' };
      }
    }));
    debugTracker.endStep('scene-image-generation', true);

    scenario.scenes = scenesWithImages;
    
    debugTracker.logSummary();
    console.log('🎉 Scene generation completed successfully!');
    return scenario;
  } catch (error) {
    console.error('❌ Error generating scenes:', error);
    debugTracker.addError('generate-scenes', error instanceof Error ? error : 'Unknown error');
    
    // Handle Gemini service errors with more specific messaging
    if (error instanceof GeminiServiceError) {
      console.error('🔴 Gemini Service Error:', {
        code: error.code,
        isRetryable: error.isRetryable,
        originalError: error.originalError?.message
      });
      
      // If it's a model availability issue, return fallback
      if (error.code === 'NO_MODELS_AVAILABLE' || error.code === 'MODEL_UNAVAILABLE') {
        console.log('🔄 Creating fallback scenario due to model unavailability');
        debugTracker.startStep('fallback-scenario');
        const fallback = createFallbackScenario(pitch, numScenes, style, language);
        debugTracker.endStep('fallback-scenario', true);
        debugTracker.logSummary();
        return fallback;
      }
      
      // For auth errors, provide specific guidance
      if (error.code === 'AUTH_ERROR') {
        debugTracker.logSummary();
        throw new Error('Authentication failed: Please ask your administrator to run "gcloud auth application-default login" to reauthenticate.');
      }
      
      debugTracker.logSummary();
      throw new Error(`Gemini service error: ${error.message}`);
    }
    
    // Handle authentication errors specifically
    if (error instanceof AuthenticationError) {
      if (error.code === 'invalid_rapt') {
        debugTracker.logSummary();
        throw new Error('Authentication failed: Please ask your administrator to run "gcloud auth application-default login" to reauthenticate.');
      }
      debugTracker.logSummary();
      throw new Error(`Authentication error: ${error.message}`);
    }
    
    // Check for specific Google OAuth errors in the error message
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      debugTracker.logSummary();
      throw new Error('Authentication failed: Google credentials have expired. Please ask your administrator to run "gcloud auth application-default login" to reauthenticate.');
    }
    
    // For any other errors, log details and provide fallback
    console.error('🔄 Unexpected error, creating fallback scenario:', error);
    const friendlyError = translateError(error);
    
    // If we can't generate scenes normally, return a fallback
    if (friendlyError.type === 'error') {
      console.log('🔄 Creating fallback scenario due to unexpected error');
      debugTracker.startStep('fallback-scenario');
      const fallback = createFallbackScenario(pitch, numScenes, style, language);
      debugTracker.endStep('fallback-scenario', true);
      debugTracker.logSummary();
      return fallback;
    }
    
    debugTracker.logSummary();
    throw new Error(`Failed to generate scenes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Always log debug summary, even if there was an error
    try {
      debugTracker.logSummary();
    } catch (logError) {
      console.error('Error logging debug summary:', logError);
    }
  }
}

