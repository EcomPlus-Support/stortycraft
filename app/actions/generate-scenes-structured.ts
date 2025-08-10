'use server'

import { StructuredOutputService, type StructuredPitch } from '@/lib/structured-output-service'
import { GeminiDirectService } from '@/lib/gemini-direct'
import { generateImageRest } from '@/lib/imagen'
import { Scenario } from '../types'
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
    const { projectId, location, veoModel } = getVertexAIConfig()
    console.log(`  Project ID: ${projectId}`)
    console.log(`  Location: ${location}`)
    console.log(`  Veo Model: ${veoModel}`)
    
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
          voiceOver: voiceOverText,
          imageUrl: imageUrl,
          imageError: imageError,
          duration: scene.duration
        }
      })
    )

    // Create final scenario
    const scenario: Scenario = {
      title: structuredPitch.title,
      description: structuredPitch.finalPitch,
      style,
      language: languageName,
      scenes,
      createdAt: new Date().toISOString(),
      metadata: {
        genre: structuredPitch.genre,
        targetAudience: structuredPitch.targetAudience,
        coreMessage: structuredPitch.coreMessage,
        totalDuration: structuredPitch.estimatedDuration,
        characters: structuredPitch.characters.map(c => ({
          name: c.name,
          age: c.age,
          gender: c.gender,
          voice: c.voice
        }))
      }
    }

    return scenario
  } catch (error) {
    logger.error('Error generating structured scenes', error)
    throw error
  }
}