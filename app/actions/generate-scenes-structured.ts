'use server'

import { StructuredOutputService, type StructuredPitch } from '@/lib/structured-output-service'
import { GeminiDirectService } from '@/lib/gemini-direct'
import { generateImageRest } from '@/lib/imagen'
import { Scenario, Language } from '../types'
import { SUPPORTED_LANGUAGES } from '../constants/languages'
import { getVertexAIConfig } from '@/lib/config'
import { logger } from '@/lib/logger'

export async function generateScenesStructured(
  pitch: string,
  numScenes: number,
  style: string,
  languageName: string,
  logoOverlay: string | null = null,
  structuredPitch?: StructuredPitch
): Promise<Scenario> {
  try {
    console.log('🎬 Generating scenes from structured pitch')
    console.log('Environment Information:')
    const { projectId, location, model } = getVertexAIConfig()
    console.log(`  Project ID: ${projectId}`)
    console.log(`  Location: ${location}`)
    console.log(`  Veo Model: ${model}`)
    
    // If no structured pitch provided, generate it
    if (!structuredPitch) {
      const geminiDirect = new GeminiDirectService()
      const structuredService = new StructuredOutputService(geminiDirect)
      structuredPitch = await structuredService.generateStructuredPitch(pitch, 'full')
    }
    
    // Convert structured scenes to Scenario format
    const scenes = await Promise.all(
      structuredPitch.scenes.slice(0, numScenes).map(async (scene, index) => {
        const mainCharacter = structuredPitch!.characters[0]
        const characterDesc = `${mainCharacter.name}（${mainCharacter.age}歲${mainCharacter.gender}）`
        
        // Generate scene prompt
        const scenePrompt = `
場景 ${scene.sceneNumber}：${scene.location}，${scene.timeOfDay}

角色：${characterDesc}
外貌：${mainCharacter.appearance}

動作：${scene.keyAction}
氛圍：${scene.atmosphere}
情緒：${scene.emotionalTone}

視覺元素：${scene.visualElements.join('、')}

請用 ${style} 風格呈現這個場景。
`

        // Generate voice-over text
        const voiceOverText = scene.keyAction

        // Generate image
        let imageUrl = ''
        let imageError: string | undefined
        
        try {
          const resultJson = await generateImageRest(scenePrompt)
          if (resultJson.predictions?.[0]?.bytesBase64Encoded) {
            imageUrl = `data:image/png;base64,${resultJson.predictions[0].bytesBase64Encoded}`
          } else {
            imageError = '圖片生成失敗'
          }
        } catch (error) {
          console.error(`Error generating image for scene ${index + 1}:`, error)
          imageError = '圖片生成時發生錯誤'
        }

        return {
          imagePrompt: scenePrompt,
          videoPrompt: scenePrompt, // Same as image prompt for now
          description: scene.keyAction,
          voiceover: voiceOverText,
          charactersPresent: [], // Default empty characters
          imageBase64: imageUrl ? imageUrl.replace('data:image/png;base64,', '') : undefined
        }
      })
    )

    // Find the language object
    const language = SUPPORTED_LANGUAGES.find(l => l.name === languageName) || SUPPORTED_LANGUAGES[0]
    
    // Create final scenario
    const scenario: Scenario = {
      scenario: structuredPitch.finalPitch,
      genre: structuredPitch.genre,
      mood: 'cinematic', // Default mood
      music: 'background', // Default music
      language,
      characters: structuredPitch.characters.map(c => ({
        name: c.name,
        description: `${c.age} year old ${c.gender} character with ${c.voice} voice`
      })),
      settings: [], // Default empty settings
      logoOverlay: logoOverlay || undefined,
      scenes
    }

    return scenario
  } catch (error) {
    logger.error('Error generating structured scenes', error)
    throw error
  }
}