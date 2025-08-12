/**
 * Test suite for aspect ratio constants and utilities
 */

import {
  ASPECT_RATIOS,
  DEFAULT_ASPECT_RATIO,
  getAspectRatioById,
  getAspectRatioClass,
  isValidAspectRatio,
  isImagenSupported,
  isVeoSupported,
  getSupportedAspectRatios,
  getResolution,
  getOptimalResolution,
  estimateCost,
  getCostMultiplier,
  getImagenFormat,
  getVeoFormat,
  analyzeAspectRatio,
  groupAspectRatiosByOrientation,
  getPopularAspectRatios,
  getAspectRatioRecommendations
} from '@/app/constants/aspectRatios'

describe('Aspect Ratio Constants', () => {
  describe('ASPECT_RATIOS', () => {
    it('contains required aspect ratios', () => {
      expect(ASPECT_RATIOS.length).toBe(2)
      
      // Check for essential aspect ratios (simplified to just 16:9 and 9:16)
      const requiredRatios = ['16:9', '9:16']
      requiredRatios.forEach(id => {
        const ratio = ASPECT_RATIOS.find(ar => ar.id === id)
        expect(ratio).toBeDefined()
      })
      
      // Ensure no other ratios are present
      ASPECT_RATIOS.forEach(ratio => {
        expect(requiredRatios).toContain(ratio.id)
      })
    })

    it('has valid structure for each aspect ratio', () => {
      ASPECT_RATIOS.forEach(ratio => {
        expect(ratio).toHaveProperty('id')
        expect(ratio).toHaveProperty('label')
        expect(ratio).toHaveProperty('ratio')
        expect(ratio).toHaveProperty('width')
        expect(ratio).toHaveProperty('height')
        expect(ratio).toHaveProperty('cssClass')
        expect(ratio).toHaveProperty('icon')
        expect(ratio).toHaveProperty('description')
        expect(ratio).toHaveProperty('imagenFormat')
        expect(ratio).toHaveProperty('veoFormat')
        expect(ratio).toHaveProperty('resolutionMappings')
        expect(ratio).toHaveProperty('costMultiplier')
        expect(ratio).toHaveProperty('isSupported')
        
        // Validate types
        expect(typeof ratio.id).toBe('string')
        expect(typeof ratio.label).toBe('string')
        expect(typeof ratio.ratio).toBe('number')
        expect(typeof ratio.width).toBe('number')
        expect(typeof ratio.height).toBe('number')
        expect(typeof ratio.cssClass).toBe('string')
        expect(typeof ratio.icon).toBe('string')
        expect(typeof ratio.description).toBe('string')
        expect(typeof ratio.costMultiplier).toBe('number')
        
        // Validate ratio calculation
        expect(ratio.ratio).toBeCloseTo(ratio.width / ratio.height, 2)
        
        // Validate resolution mappings
        expect(ratio.resolutionMappings).toHaveProperty('low')
        expect(ratio.resolutionMappings).toHaveProperty('medium')
        expect(ratio.resolutionMappings).toHaveProperty('high')
        
        // Validate support flags
        expect(ratio.isSupported).toHaveProperty('imagen')
        expect(ratio.isSupported).toHaveProperty('veo')
        expect(typeof ratio.isSupported.imagen).toBe('boolean')
        expect(typeof ratio.isSupported.veo).toBe('boolean')
      })
    })

    it('has unique IDs for each aspect ratio', () => {
      const ids = ASPECT_RATIOS.map(ar => ar.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ASPECT_RATIOS.length)
    })

    it('has consistent resolution scaling', () => {
      ASPECT_RATIOS.forEach(ratio => {
        const { low, medium, high } = ratio.resolutionMappings
        
        // Check that higher quality has higher resolution
        expect(medium.width).toBeGreaterThanOrEqual(low.width)
        expect(medium.height).toBeGreaterThanOrEqual(low.height)
        expect(high.width).toBeGreaterThanOrEqual(medium.width)
        expect(high.height).toBeGreaterThanOrEqual(medium.height)
        
        // Check that aspect ratio is maintained
        const lowRatio = low.width / low.height
        const mediumRatio = medium.width / medium.height
        const highRatio = high.width / high.height
        
        expect(lowRatio).toBeCloseTo(ratio.ratio, 1)
        expect(mediumRatio).toBeCloseTo(ratio.ratio, 1)
        expect(highRatio).toBeCloseTo(ratio.ratio, 1)
      })
    })
  })

  describe('DEFAULT_ASPECT_RATIO', () => {
    it('is defined and valid', () => {
      expect(DEFAULT_ASPECT_RATIO).toBeDefined()
      expect(isValidAspectRatio(DEFAULT_ASPECT_RATIO)).toBe(true)
    })

    it('is the 16:9 ratio', () => {
      expect(DEFAULT_ASPECT_RATIO.id).toBe('16:9')
    })
  })
})

describe('Aspect Ratio Utilities', () => {
  describe('getAspectRatioById', () => {
    it('returns correct aspect ratio for valid ID', () => {
      const ratio = getAspectRatioById('16:9')
      expect(ratio).toBeDefined()
      expect(ratio?.id).toBe('16:9')
    })

    it('returns undefined for invalid ID', () => {
      const ratio = getAspectRatioById('invalid:ratio')
      expect(ratio).toBeUndefined()
    })

    it('handles all defined aspect ratios', () => {
      ASPECT_RATIOS.forEach(expectedRatio => {
        const foundRatio = getAspectRatioById(expectedRatio.id)
        expect(foundRatio).toEqual(expectedRatio)
      })
    })
  })

  describe('getAspectRatioClass', () => {
    it('returns correct CSS class for valid aspect ratio', () => {
      const ratio = ASPECT_RATIOS[0]
      const cssClass = getAspectRatioClass(ratio)
      expect(cssClass).toBe(ratio.cssClass)
    })

    it('returns default CSS class for undefined aspect ratio', () => {
      const cssClass = getAspectRatioClass(undefined)
      expect(cssClass).toBe(DEFAULT_ASPECT_RATIO.cssClass)
    })
  })

  describe('isValidAspectRatio', () => {
    it('returns true for valid aspect ratios', () => {
      ASPECT_RATIOS.forEach(ratio => {
        expect(isValidAspectRatio(ratio)).toBe(true)
      })
    })

    it('returns false for invalid aspect ratios', () => {
      expect(isValidAspectRatio(null)).toBe(false)
      expect(isValidAspectRatio(undefined)).toBe(false)
      expect(isValidAspectRatio({})).toBe(false)
      expect(isValidAspectRatio({ id: 'test' })).toBe(false)
      expect(isValidAspectRatio({ 
        id: 'test', 
        label: 'Test',
        ratio: -1, // Invalid ratio
        width: 16,
        height: 9,
        cssClass: 'test'
      })).toBe(false)
    })
  })

  describe('Service Support Functions', () => {
    describe('isImagenSupported', () => {
      it('returns correct support status for Imagen', () => {
        ASPECT_RATIOS.forEach(ratio => {
          const supported = isImagenSupported(ratio)
          expect(supported).toBe(ratio.isSupported.imagen)
        })
      })
    })

    describe('isVeoSupported', () => {
      it('returns correct support status for Veo', () => {
        ASPECT_RATIOS.forEach(ratio => {
          const supported = isVeoSupported(ratio)
          expect(supported).toBe(ratio.isSupported.veo)
        })
      })
    })

    describe('getSupportedAspectRatios', () => {
      it('returns only Imagen-supported ratios for imagen service', () => {
        const supported = getSupportedAspectRatios('imagen')
        supported.forEach(ratio => {
          expect(ratio.isSupported.imagen).toBe(true)
        })
      })

      it('returns only Veo-supported ratios for veo service', () => {
        const supported = getSupportedAspectRatios('veo')
        supported.forEach(ratio => {
          expect(ratio.isSupported.veo).toBe(true)
        })
      })

      it('includes known supported ratios', () => {
        const imagenSupported = getSupportedAspectRatios('imagen')
        const veoSupported = getSupportedAspectRatios('veo')
        
        expect(imagenSupported.length).toBeGreaterThan(0)
        expect(veoSupported.length).toBeGreaterThan(0)
        
        // 16:9 should be supported by both
        expect(imagenSupported.find(ar => ar.id === '16:9')).toBeDefined()
        expect(veoSupported.find(ar => ar.id === '16:9')).toBeDefined()
      })
    })
  })

  describe('Resolution Functions', () => {
    describe('getResolution', () => {
      it('returns correct resolution for each quality level', () => {
        const ratio = ASPECT_RATIOS[0]
        
        const low = getResolution(ratio, 'low')
        const medium = getResolution(ratio, 'medium')
        const high = getResolution(ratio, 'high')
        
        expect(low).toEqual(ratio.resolutionMappings.low)
        expect(medium).toEqual(ratio.resolutionMappings.medium)
        expect(high).toEqual(ratio.resolutionMappings.high)
      })

      it('returns undefined for aspect ratio without resolution mappings', () => {
        const invalidRatio = { ...ASPECT_RATIOS[0] }
        delete (invalidRatio as any).resolutionMappings
        
        const resolution = getResolution(invalidRatio as any, 'medium')
        expect(resolution).toBeUndefined()
      })
    })

    describe('getOptimalResolution', () => {
      it('returns resolution that fits within constraints', () => {
        const ratio = ASPECT_RATIOS[0] // 16:9
        const optimal = getOptimalResolution(ratio, 1000, 1000)
        
        expect(optimal.width).toBeLessThanOrEqual(1000)
        expect(optimal.height).toBeLessThanOrEqual(1000)
        expect(optimal.width / optimal.height).toBeCloseTo(ratio.ratio, 1)
      })

      it('calculates resolution for aspect ratio without mappings', () => {
        const customRatio = {
          ...ASPECT_RATIOS[0],
          resolutionMappings: undefined as any
        }
        
        const optimal = getOptimalResolution(customRatio, 1920, 1080)
        expect(optimal).toBeDefined()
        expect(optimal.width).toBeGreaterThan(0)
        expect(optimal.height).toBeGreaterThan(0)
      })

      it('handles portrait ratios correctly', () => {
        const portraitRatio = ASPECT_RATIOS.find(ar => ar.id === '9:16')
        if (!portraitRatio) return
        
        const optimal = getOptimalResolution(portraitRatio, 1080, 1920)
        expect(optimal.width / optimal.height).toBeCloseTo(portraitRatio.ratio, 1)
      })
    })
  })

  describe('Cost Functions', () => {
    describe('estimateCost', () => {
      it('applies cost multiplier correctly', () => {
        const basePrice = 10.0
        ASPECT_RATIOS.forEach(ratio => {
          const estimatedCost = estimateCost(ratio, basePrice)
          const expectedCost = basePrice * ratio.costMultiplier
          expect(estimatedCost).toBeCloseTo(expectedCost, 2)
        })
      })

      it('handles zero base price', () => {
        const ratio = ASPECT_RATIOS[0]
        const cost = estimateCost(ratio, 0)
        expect(cost).toBe(0)
      })
    })

    describe('getCostMultiplier', () => {
      it('returns correct multiplier for each ratio', () => {
        ASPECT_RATIOS.forEach(ratio => {
          const multiplier = getCostMultiplier(ratio)
          expect(multiplier).toBe(ratio.costMultiplier)
        })
      })

      it('returns 1.0 for ratio without multiplier', () => {
        const ratioWithoutMultiplier = { ...ASPECT_RATIOS[0] }
        delete (ratioWithoutMultiplier as any).costMultiplier
        
        const multiplier = getCostMultiplier(ratioWithoutMultiplier as any)
        expect(multiplier).toBe(1.0)
      })
    })
  })

  describe('Format Functions', () => {
    describe('getImagenFormat', () => {
      it('returns correct format for Imagen service', () => {
        ASPECT_RATIOS.forEach(ratio => {
          const format = getImagenFormat(ratio)
          expect(format).toBe(ratio.imagenFormat || ratio.id)
        })
      })
    })

    describe('getVeoFormat', () => {
      it('returns correct format for Veo service', () => {
        ASPECT_RATIOS.forEach(ratio => {
          const format = getVeoFormat(ratio)
          expect(format).toBe(ratio.veoFormat || ratio.id)
        })
      })
    })
  })

  describe('analyzeAspectRatio', () => {
    it('correctly identifies landscape ratios', () => {
      const analysis = analyzeAspectRatio(1920, 1080)
      expect(analysis.isLandscape).toBe(true)
      expect(analysis.isPortrait).toBe(false)
      expect(analysis.isSquare).toBe(false)
      expect(analysis.ratio).toBeCloseTo(16/9, 2)
    })

    it('correctly identifies portrait ratios', () => {
      const analysis = analyzeAspectRatio(1080, 1920)
      expect(analysis.isLandscape).toBe(false)
      expect(analysis.isPortrait).toBe(true)
      expect(analysis.isSquare).toBe(false)
      expect(analysis.ratio).toBeCloseTo(9/16, 2)
    })

    it('correctly identifies square ratios', () => {
      const analysis = analyzeAspectRatio(1024, 1024)
      expect(analysis.isLandscape).toBe(false)
      expect(analysis.isPortrait).toBe(false)
      expect(analysis.isSquare).toBe(true)
      expect(analysis.ratio).toBe(1)
    })

    it('matches known aspect ratios', () => {
      const analysis1 = analyzeAspectRatio(1920, 1080)
      expect(analysis1.matchedAspectRatio?.id).toBe('16:9')
      
      const analysis2 = analyzeAspectRatio(1080, 1920)
      expect(analysis2.matchedAspectRatio?.id).toBe('9:16')
    })

    it('handles non-standard ratios', () => {
      const analysis = analyzeAspectRatio(1333, 777) // Definitely not matching any standard ratio
      expect(analysis.matchedAspectRatio).toBeUndefined()
      expect(analysis.ratio).toBeCloseTo(1333/777, 2)
    })
  })

  describe('groupAspectRatiosByOrientation', () => {
    it('groups ratios correctly by orientation', () => {
      const grouped = groupAspectRatiosByOrientation()
      
      expect(grouped).toHaveProperty('landscape')
      expect(grouped).toHaveProperty('portrait')
      expect(grouped).toHaveProperty('square')
      
      // Check that 16:9 is in landscape
      expect(grouped.landscape.find(ar => ar.id === '16:9')).toBeDefined()
      
      // Check that 9:16 is in portrait
      expect(grouped.portrait.find(ar => ar.id === '9:16')).toBeDefined()
      
      // With simplified ratios, there should be no square ratios
      expect(grouped.square.length).toBe(0)
    })

    it('maintains total count of ratios', () => {
      const grouped = groupAspectRatiosByOrientation()
      const totalGrouped = grouped.landscape.length + grouped.portrait.length + grouped.square.length
      expect(totalGrouped).toBe(ASPECT_RATIOS.length)
    })
  })

  describe('getPopularAspectRatios', () => {
    it('returns popular aspect ratios', () => {
      const popular = getPopularAspectRatios()
      expect(popular.length).toBe(2)
      
      // Should include only the two supported ratios
      const popularIds = popular.map(ar => ar.id)
      expect(popularIds).toContain('16:9')
      expect(popularIds).toContain('9:16')
      expect(popularIds).toEqual(['16:9', '9:16'])
    })
  })

  describe('getAspectRatioRecommendations', () => {
    it('returns appropriate recommendations for social media', () => {
      const recommendations = getAspectRatioRecommendations('social')
      const ids = recommendations.map(ar => ar.id)
      
      expect(ids).toContain('9:16') // Instagram Stories
      expect(ids).toContain('16:9') // YouTube/Twitter
      expect(ids.sort()).toEqual(['16:9', '9:16'])
    })

    it('returns appropriate recommendations for web', () => {
      const recommendations = getAspectRatioRecommendations('web')
      const ids = recommendations.map(ar => ar.id)
      
      expect(ids).toContain('16:9') // Common web ratio
    })

    it('returns appropriate recommendations for cinema', () => {
      const recommendations = getAspectRatioRecommendations('cinema')
      const ids = recommendations.map(ar => ar.id)
      
      expect(ids).toContain('16:9') // Standard cinema
    })

    it('returns appropriate recommendations for mobile', () => {
      const recommendations = getAspectRatioRecommendations('mobile')
      const ids = recommendations.map(ar => ar.id)
      
      expect(ids).toContain('9:16') // Mobile portrait
    })

    it('returns popular ratios for unknown use case', () => {
      const recommendations = getAspectRatioRecommendations('unknown' as any)
      expect(recommendations.length).toBeGreaterThan(0)
    })
  })
})

describe('Edge Cases and Error Handling', () => {
  it('handles invalid aspect ratio data gracefully', () => {
    const invalidRatio = null as any
    
    expect(() => isValidAspectRatio(invalidRatio)).not.toThrow()
    expect(() => isImagenSupported(invalidRatio)).toThrow()
    expect(() => isVeoSupported(invalidRatio)).toThrow()
  })

  it('handles zero dimensions in analysis', () => {
    expect(() => analyzeAspectRatio(0, 1080)).not.toThrow()
    expect(() => analyzeAspectRatio(1920, 0)).not.toThrow()
    
    const analysis = analyzeAspectRatio(0, 1080)
    expect(analysis.ratio).toBe(0)
  })

  it('handles very large numbers', () => {
    const analysis = analyzeAspectRatio(999999, 999999)
    expect(analysis.isSquare).toBe(true)
    expect(analysis.ratio).toBe(1)
  })

  it('handles very small numbers', () => {
    const analysis = analyzeAspectRatio(0.1, 0.1)
    expect(analysis.isSquare).toBe(true)
    expect(analysis.ratio).toBe(1)
  })
})