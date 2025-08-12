/**
 * Test suite for validation utilities
 * Tests aspect ratio validation and related functionality
 */

import {
  validateAspectRatio,
  validateVideoGenerationRequest,
  validateCostLimits,
  validateScene
} from '@/lib/validation'
import { ASPECT_RATIOS } from '@/app/constants/aspectRatios'
import type { AspectRatio, Scene, VideoGenerationRequest } from '@/app/types'

describe('Validation Utilities', () => {
  const validAspectRatio = ASPECT_RATIOS[0] // 16:9
  const validScene: Scene = {
    imagePrompt: 'A beautiful mountain landscape',
    videoPrompt: 'Camera pans slowly across the scene',
    description: 'Opening scene showing the natural beauty',
    voiceover: 'Welcome to our journey through the mountains',
    charactersPresent: []
  }

  describe('validateAspectRatio', () => {
    it('validates correct aspect ratio structure', () => {
      const result = validateAspectRatio(validAspectRatio)
      expect(result).toEqual(validAspectRatio)
    })

    it('validates all predefined aspect ratios', () => {
      ASPECT_RATIOS.forEach(ratio => {
        expect(() => validateAspectRatio(ratio)).not.toThrow()
        const result = validateAspectRatio(ratio)
        expect(result.id).toBe(ratio.id)
      })
    })

    it('rejects null or undefined aspect ratio', () => {
      expect(() => validateAspectRatio(null as any)).toThrow('Invalid aspect ratio')
      expect(() => validateAspectRatio(undefined as any)).toThrow('Invalid aspect ratio')
    })

    it('rejects aspect ratio with missing required fields', () => {
      const incompleteRatio = {
        id: '16:9',
        ratio: 16/9
        // Missing other required fields
      }
      
      expect(() => validateAspectRatio(incompleteRatio as any))
        .toThrow('Invalid aspect ratio')
    })

    it('rejects aspect ratio with invalid ratio value', () => {
      const invalidRatio = {
        ...validAspectRatio,
        ratio: -1
      }
      
      expect(() => validateAspectRatio(invalidRatio))
        .toThrow('Invalid aspect ratio')
    })

    it('rejects aspect ratio with zero dimensions', () => {
      const zeroDimensionRatio = {
        ...validAspectRatio,
        width: 0,
        height: 16
      }
      
      expect(() => validateAspectRatio(zeroDimensionRatio))
        .toThrow('Invalid aspect ratio')
    })

    it('rejects aspect ratio with negative dimensions', () => {
      const negativeDimensionRatio = {
        ...validAspectRatio,
        width: -16,
        height: 9
      }
      
      expect(() => validateAspectRatio(negativeDimensionRatio))
        .toThrow('Invalid aspect ratio')
    })

    it('validates ratio consistency with width/height', () => {
      const inconsistentRatio = {
        ...validAspectRatio,
        width: 4,
        height: 3,
        ratio: 16/9 // Inconsistent with 4:3
      }
      
      expect(() => validateAspectRatio(inconsistentRatio))
        .toThrow('Aspect ratio inconsistent')
    })

    it('rejects aspect ratio with invalid ID format', () => {
      const invalidIdRatio = {
        ...validAspectRatio,
        id: '' // Empty ID
      }
      
      expect(() => validateAspectRatio(invalidIdRatio))
        .toThrow('Invalid aspect ratio')
    })

    it('rejects aspect ratio with invalid support flags', () => {
      const invalidSupportRatio = {
        ...validAspectRatio,
        isSupported: null // Invalid support object
      }
      
      expect(() => validateAspectRatio(invalidSupportRatio))
        .toThrow('Invalid aspect ratio')
    })

    it('validates cost multiplier bounds', () => {
      const negativeCostRatio = {
        ...validAspectRatio,
        costMultiplier: -0.5
      }
      
      expect(() => validateAspectRatio(negativeCostRatio))
        .toThrow('Invalid cost multiplier')
    })

    it('validates resolution mappings structure', () => {
      const invalidResolutionRatio = {
        ...validAspectRatio,
        resolutionMappings: {
          low: { width: 640, height: 480 }
          // Missing medium and high
        }
      }
      
      expect(() => validateAspectRatio(invalidResolutionRatio as any))
        .toThrow('Invalid resolution mappings')
    })
  })

  describe('validateScene', () => {
    it('validates correct scene structure', () => {
      const result = validateScene(validScene)
      expect(result).toEqual(validScene)
    })

    it('rejects scene with empty image prompt', () => {
      const invalidScene = {
        ...validScene,
        imagePrompt: ''
      }
      
      expect(() => validateScene(invalidScene))
        .toThrow('Image prompt is required')
    })

    it('rejects scene with whitespace-only prompts', () => {
      const whitespaceScene = {
        ...validScene,
        imagePrompt: '   '
      }
      
      expect(() => validateScene(whitespaceScene))
        .toThrow('Image prompt is required')
    })

    it('validates prompt length limits', () => {
      const longPromptScene = {
        ...validScene,
        imagePrompt: 'A'.repeat(2000) // Very long prompt
      }
      
      expect(() => validateScene(longPromptScene))
        .toThrow('Image prompt too long')
    })

    it('validates video prompt when provided', () => {
      const longVideoPromptScene = {
        ...validScene,
        videoPrompt: 'B'.repeat(2000) // Very long video prompt
      }
      
      expect(() => validateScene(longVideoPromptScene))
        .toThrow('Video prompt too long')
    })

    it('allows optional fields to be undefined', () => {
      const minimalScene = {
        imagePrompt: 'A mountain landscape',
        videoPrompt: undefined,
        description: undefined,
        voiceover: undefined,
        charactersPresent: []
      }
      
      expect(() => validateScene(minimalScene as any)).not.toThrow()
    })

    it('validates characters present array', () => {
      const invalidCharactersScene = {
        ...validScene,
        charactersPresent: 'invalid' // Should be array
      }
      
      expect(() => validateScene(invalidCharactersScene as any))
        .toThrow('Characters present must be an array')
    })

    it('validates character names in charactersPresent', () => {
      const invalidCharacterScene = {
        ...validScene,
        charactersPresent: [123, true] // Invalid character types
      }
      
      expect(() => validateScene(invalidCharacterScene as any))
        .toThrow('Character names must be strings')
    })

    it('handles special characters in prompts', () => {
      const specialCharScene = {
        ...validScene,
        imagePrompt: 'A café with naïve people enjoying crème brûlée 🎨',
        voiceover: 'Special characters: éàùç'
      }
      
      expect(() => validateScene(specialCharScene)).not.toThrow()
    })
  })

  describe('validateVideoGenerationRequest', () => {
    const validRequest: VideoGenerationRequest = {
      scenes: [validScene],
      aspectRatio: validAspectRatio,
      options: {
        quality: 'medium',
        enableCaching: true
      }
    }

    it('validates correct video generation request', () => {
      const result = validateVideoGenerationRequest(validRequest)
      expect(result).toEqual(validRequest)
    })

    it('validates all scenes in the request', () => {
      const multiSceneRequest = {
        ...validRequest,
        scenes: [
          validScene,
          { ...validScene, description: 'Second scene' },
          { ...validScene, description: 'Third scene' }
        ]
      }
      
      expect(() => validateVideoGenerationRequest(multiSceneRequest)).not.toThrow()
    })

    it('rejects request with empty scenes array', () => {
      const emptySceneRequest = {
        ...validRequest,
        scenes: []
      }
      
      expect(() => validateVideoGenerationRequest(emptySceneRequest))
        .toThrow('At least one scene is required')
    })

    it('rejects request with too many scenes', () => {
      const tooManyScenes = Array.from({ length: 100 }, () => validScene)
      const overloadedRequest = {
        ...validRequest,
        scenes: tooManyScenes
      }
      
      expect(() => validateVideoGenerationRequest(overloadedRequest))
        .toThrow('Too many scenes')
    })

    it('validates aspect ratio in request', () => {
      const invalidAspectRatioRequest = {
        ...validRequest,
        aspectRatio: null
      }
      
      expect(() => validateVideoGenerationRequest(invalidAspectRatioRequest as any))
        .toThrow('Invalid aspect ratio')
    })

    it('validates options object structure', () => {
      const invalidOptionsRequest = {
        ...validRequest,
        options: {
          quality: 'invalid_quality', // Invalid quality level
          enableCaching: 'yes' // Should be boolean
        }
      }
      
      expect(() => validateVideoGenerationRequest(invalidOptionsRequest as any))
        .toThrow('Invalid options')
    })

    it('validates quality levels', () => {
      const validQualities = ['low', 'medium', 'high']
      
      validQualities.forEach(quality => {
        const request = {
          ...validRequest,
          options: { ...validRequest.options, quality: quality as any }
        }
        
        expect(() => validateVideoGenerationRequest(request)).not.toThrow()
      })
    })

    it('rejects invalid quality levels', () => {
      const invalidQualityRequest = {
        ...validRequest,
        options: {
          ...validRequest.options,
          quality: 'ultra' as any // Invalid quality
        }
      }
      
      expect(() => validateVideoGenerationRequest(invalidQualityRequest))
        .toThrow('Invalid quality level')
    })

    it('validates service compatibility with aspect ratio', () => {
      const veoUnsupportedRatio = ASPECT_RATIOS.find(ar => !ar.isSupported.veo)
      if (!veoUnsupportedRatio) return // Skip if all ratios support Veo
      
      const incompatibleRequest = {
        ...validRequest,
        aspectRatio: veoUnsupportedRatio,
        options: {
          ...validRequest.options,
          generateVideo: true // Requires Veo support
        }
      }
      
      expect(() => validateVideoGenerationRequest(incompatibleRequest as any))
        .toThrow('Aspect ratio not supported by required services')
    })

    it('handles optional fields correctly', () => {
      const minimalRequest = {
        scenes: [validScene],
        aspectRatio: validAspectRatio
        // options is optional
      }
      
      expect(() => validateVideoGenerationRequest(minimalRequest as any)).not.toThrow()
    })
  })

  describe('validateCostLimits', () => {
    it('allows costs within limits', () => {
      expect(() => validateCostLimits(5.0, 10.0)).not.toThrow()
      expect(() => validateCostLimits(10.0, 10.0)).not.toThrow() // Equal to limit
    })

    it('rejects costs exceeding limits', () => {
      expect(() => validateCostLimits(15.0, 10.0))
        .toThrow('Estimated cost exceeds maximum allowed')
    })

    it('handles zero costs', () => {
      expect(() => validateCostLimits(0.0, 10.0)).not.toThrow()
    })

    it('handles zero limits', () => {
      expect(() => validateCostLimits(1.0, 0.0))
        .toThrow('Estimated cost exceeds maximum allowed')
    })

    it('validates negative costs', () => {
      expect(() => validateCostLimits(-1.0, 10.0))
        .toThrow('Invalid cost value')
    })

    it('validates negative limits', () => {
      expect(() => validateCostLimits(5.0, -10.0))
        .toThrow('Invalid cost limit')
    })

    it('handles very small costs precisely', () => {
      expect(() => validateCostLimits(0.001, 0.002)).not.toThrow()
      expect(() => validateCostLimits(0.003, 0.002))
        .toThrow('Estimated cost exceeds maximum allowed')
    })

    it('handles very large costs', () => {
      expect(() => validateCostLimits(999999.99, 1000000.00)).not.toThrow()
      expect(() => validateCostLimits(1000000.01, 1000000.00))
        .toThrow('Estimated cost exceeds maximum allowed')
    })
  })

  describe('Integration Tests', () => {
    it('validates complete workflow with all aspect ratios', () => {
      ASPECT_RATIOS.forEach(aspectRatio => {
        const request: VideoGenerationRequest = {
          scenes: [validScene],
          aspectRatio,
          options: {
            quality: 'medium',
            enableCaching: true
          }
        }
        
        // Should not throw for valid aspect ratios
        if (aspectRatio.isSupported.imagen || aspectRatio.isSupported.veo) {
          expect(() => {
            validateVideoGenerationRequest(request)
            validateAspectRatio(aspectRatio)
            validateCostLimits(1.0 * aspectRatio.costMultiplier, 10.0)
          }).not.toThrow()
        }
      })
    })

    it('validates complex multi-scene requests', () => {
      const complexRequest: VideoGenerationRequest = {
        scenes: [
          {
            imagePrompt: 'A bustling cityscape at dawn',
            videoPrompt: 'Camera rises to reveal the full city',
            description: 'Establishing shot of the city',
            voiceover: 'In the heart of the metropolis...',
            charactersPresent: ['narrator']
          },
          {
            imagePrompt: 'A person walking through busy streets',
            videoPrompt: 'Follow the character as they navigate the crowd',
            description: 'Character introduction',
            voiceover: 'Our story begins with Sarah...',
            charactersPresent: ['Sarah', 'pedestrians']
          },
          {
            imagePrompt: 'Interior of a modern office building',
            videoPrompt: 'Camera tracks through the office space',
            description: 'Workplace environment',
            voiceover: 'She worked at the largest tech company in the city',
            charactersPresent: ['Sarah', 'colleagues']
          }
        ],
        aspectRatio: validAspectRatio,
        options: {
          quality: 'high',
          enableCaching: true,
          imageQuality: 'high'
        }
      }
      
      expect(() => validateVideoGenerationRequest(complexRequest as any)).not.toThrow()
    })

    it('validates cost estimates for different configurations', () => {
      const baseCost = 1.0
      
      ASPECT_RATIOS.forEach(aspectRatio => {
        const estimatedCost = baseCost * aspectRatio.costMultiplier
        
        // Should pass for reasonable limits
        expect(() => validateCostLimits(estimatedCost, 10.0)).not.toThrow()
        
        // Should fail for very low limits
        if (estimatedCost > 0.01) {
          expect(() => validateCostLimits(estimatedCost, 0.01))
            .toThrow('Estimated cost exceeds maximum allowed')
        }
      })
    })
  })

  describe('Error Message Quality', () => {
    it('provides descriptive error messages', () => {
      try {
        validateAspectRatio(null as any)
      } catch (error) {
        expect(error.message).toContain('Invalid aspect ratio')
        expect(error.message).not.toBe('Error') // Should be descriptive
      }
      
      try {
        validateScene({ ...validScene, imagePrompt: '' })
      } catch (error) {
        expect(error.message).toContain('Image prompt is required')
      }
      
      try {
        validateCostLimits(100, 10)
      } catch (error) {
        expect(error.message).toContain('exceeds maximum allowed')
      }
    })

    it('includes context in error messages when possible', () => {
      try {
        const invalidRatio = { ...validAspectRatio, width: -1 }
        validateAspectRatio(invalidRatio)
      } catch (error) {
        expect(error.message).toContain('width')
      }
      
      try {
        validateCostLimits(15.5, 10.0)
      } catch (error) {
        expect(error.message).toMatch(/15\.5|15.5/) // Should include the actual cost
      }
    })
  })

  describe('Performance', () => {
    it('validates quickly for normal requests', () => {
      const startTime = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        validateAspectRatio(validAspectRatio)
        validateScene(validScene)
      }
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(100) // Should be very fast
    })

    it('validates large requests efficiently', () => {
      const largeRequest: VideoGenerationRequest = {
        scenes: Array.from({ length: 20 }, () => validScene),
        aspectRatio: validAspectRatio,
        options: {
          quality: 'medium',
          enableCaching: true
        }
      }
      
      const startTime = performance.now()
      validateVideoGenerationRequest(largeRequest)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(50) // Should handle large requests quickly
    })
  })

  describe('Edge Cases', () => {
    it('handles circular references gracefully', () => {
      const circularAspectRatio: any = { ...validAspectRatio }
      circularAspectRatio.self = circularAspectRatio
      
      // Should not get stuck in infinite loop
      expect(() => validateAspectRatio(circularAspectRatio))
        .toThrow() // May throw due to circular reference or validation failure
    })

    it('handles extremely long strings', () => {
      const hugeScene = {
        ...validScene,
        imagePrompt: 'A'.repeat(100000) // 100KB string
      }
      
      expect(() => validateScene(hugeScene))
        .toThrow('Image prompt too long')
    })

    it('handles Unicode characters correctly', () => {
      const unicodeScene = {
        ...validScene,
        imagePrompt: '🌟✨🎭🎨🎪 Unicode emoji and symbols 中文 العربية 🚀',
        voiceover: 'Testing with émojis and spëcial chars'
      }
      
      expect(() => validateScene(unicodeScene)).not.toThrow()
    })

    it('handles prototype pollution attempts', () => {
      const maliciousAspectRatio = {
        ...validAspectRatio,
        __proto__: { malicious: true }
      }
      
      // Should validate normally and not be affected by prototype pollution
      expect(() => validateAspectRatio(maliciousAspectRatio as any)).not.toThrow()
    })
  })
})