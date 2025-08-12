import { type AspectRatio } from '../types'
import { ASPECT_RATIOS, DEFAULT_ASPECT_RATIO } from '../constants/aspectRatios'

export interface AspectRatioValidationResult {
  isValid: boolean
  error?: string
  suggestion?: AspectRatio
}

/**
 * Validates an aspect ratio object
 */
export function validateAspectRatio(aspectRatio: AspectRatio | undefined): AspectRatioValidationResult {
  if (!aspectRatio) {
    return {
      isValid: false,
      error: 'Aspect ratio is required',
      suggestion: DEFAULT_ASPECT_RATIO
    }
  }

  // Check required fields
  if (!aspectRatio.id || !aspectRatio.label) {
    return {
      isValid: false,
      error: 'Aspect ratio must have id and label',
      suggestion: DEFAULT_ASPECT_RATIO
    }
  }

  // Check numeric values
  if (typeof aspectRatio.ratio !== 'number' || aspectRatio.ratio <= 0) {
    return {
      isValid: false,
      error: 'Aspect ratio must be a positive number',
      suggestion: DEFAULT_ASPECT_RATIO
    }
  }

  if (typeof aspectRatio.width !== 'number' || aspectRatio.width <= 0) {
    return {
      isValid: false,
      error: 'Width must be a positive number',
      suggestion: DEFAULT_ASPECT_RATIO
    }
  }

  if (typeof aspectRatio.height !== 'number' || aspectRatio.height <= 0) {
    return {
      isValid: false,
      error: 'Height must be a positive number',
      suggestion: DEFAULT_ASPECT_RATIO
    }
  }

  // Verify ratio consistency
  const calculatedRatio = aspectRatio.width / aspectRatio.height
  if (Math.abs(calculatedRatio - aspectRatio.ratio) > 0.01) {
    return {
      isValid: false,
      error: 'Aspect ratio calculation mismatch',
      suggestion: DEFAULT_ASPECT_RATIO
    }
  }

  // Check for extreme aspect ratios
  if (aspectRatio.ratio < 0.1 || aspectRatio.ratio > 10) {
    return {
      isValid: false,
      error: 'Aspect ratio is too extreme (must be between 0.1 and 10)',
      suggestion: DEFAULT_ASPECT_RATIO
    }
  }

  return { isValid: true }
}

/**
 * Sanitizes an aspect ratio, returning a valid one or the default
 */
export function sanitizeAspectRatio(aspectRatio: AspectRatio | undefined): AspectRatio {
  const validation = validateAspectRatio(aspectRatio)
  
  if (validation.isValid && aspectRatio) {
    return aspectRatio
  }

  console.warn('Invalid aspect ratio provided, using default:', validation.error)
  return validation.suggestion || DEFAULT_ASPECT_RATIO
}

/**
 * Finds the closest standard aspect ratio to a given ratio
 */
export function findClosestAspectRatio(targetRatio: number): AspectRatio {
  let closestRatio = DEFAULT_ASPECT_RATIO
  let smallestDifference = Math.abs(targetRatio - DEFAULT_ASPECT_RATIO.ratio)

  for (const aspectRatio of ASPECT_RATIOS) {
    const difference = Math.abs(targetRatio - aspectRatio.ratio)
    if (difference < smallestDifference) {
      smallestDifference = difference
      closestRatio = aspectRatio
    }
  }

  return closestRatio
}

/**
 * Creates a custom aspect ratio from width and height
 */
export function createCustomAspectRatio(width: number, height: number, label?: string): AspectRatio {
  const ratio = width / height
  const gcd = getGCD(width, height)
  const simplifiedWidth = width / gcd
  const simplifiedHeight = height / gcd
  
  return {
    id: `${simplifiedWidth}:${simplifiedHeight}`,
    label: label || `${simplifiedWidth}:${simplifiedHeight} Custom`,
    ratio,
    width: simplifiedWidth,
    height: simplifiedHeight,
    cssClass: `aspect-[${simplifiedWidth}/${simplifiedHeight}]`,
    description: `Custom ${simplifiedWidth}:${simplifiedHeight} aspect ratio`
  }
}

/**
 * Calculates the greatest common divisor
 */
function getGCD(a: number, b: number): number {
  return b === 0 ? a : getGCD(b, a % b)
}

/**
 * Formats aspect ratio for display
 */
export function formatAspectRatio(aspectRatio: AspectRatio): string {
  return `${aspectRatio.width}:${aspectRatio.height} (${aspectRatio.ratio.toFixed(2)})`
}