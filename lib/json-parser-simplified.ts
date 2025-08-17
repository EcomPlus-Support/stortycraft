/**
 * Simplified and secure JSON parser for AI responses
 * Fixes critical security issues while maintaining functionality
 */

// Security and performance configuration
const PARSING_CONFIG = {
  MAX_INPUT_LENGTH: 50000, // 50KB limit
  MAX_PITCH_LENGTH: 5000,
  MIN_PITCH_LENGTH: 50,
  PARSING_TIMEOUT: 5000,
  MAX_REPAIR_ATTEMPTS: 5
} as const

export interface ReferenceContentSchema {
  analysis: {
    keyTopics: string[]
    sentiment: string
    coreMessage: string
    targetAudience: string
  }
  generatedPitch: string
  rationale?: string
}

export interface JsonParseResult {
  success: boolean
  data?: ReferenceContentSchema
  error?: string
  repairAttempts?: string[]
  originalLength?: number
  parseTime?: number
}

/**
 * Secure and performant JSON parser class
 * Stateless design to prevent race conditions
 */
export class SecureJsonParser {
  // Pre-compiled regex patterns for performance and security
  private static readonly SAFE_PATTERNS = {
    MARKDOWN_REMOVAL: /```(?:json)?\s*|\s*```/g,
    TRAILING_COMMAS: /,(\s*[}\]])/g,
    WHITESPACE_NORMALIZE: /\s+/g,
    NEWLINE_TO_SPACE: /\n/g,
    EXTRACT_JSON_OBJECT: /\{[\s\S]*\}/,
    // Enhanced extraction patterns that support multi-line content
    EXTRACT_PITCH: /"generatedPitch"\s*:\s*"([\s\S]*?)"/,
    EXTRACT_TOPICS: /"keyTopics"\s*:\s*\[([\s\S]*?)\]/,
    EXTRACT_SENTIMENT: /"sentiment"\s*:\s*"([^"]*)"/,
    EXTRACT_CORE_MESSAGE: /"coreMessage"\s*:\s*"([\s\S]*?)"/,
    EXTRACT_TARGET_AUDIENCE: /"targetAudience"\s*:\s*"([\s\S]*?)"/,
    EXTRACT_RATIONALE: /"rationale"\s*:\s*"([\s\S]*?)"/
  }

  /**
   * Main parsing function with security validation
   */
  public parseAiResponse(text: string): JsonParseResult {
    const startTime = Date.now()
    const repairAttempts: string[] = []

    // Input validation
    const validation = this.validateInput(text)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        originalLength: text?.length || 0,
        parseTime: Date.now() - startTime
      }
    }

    // Strategy 1: Direct parsing
    try {
      const parsed = JSON.parse(text)
      const schemaValidation = this.validateSchema(parsed)
      if (schemaValidation.valid) {
        return {
          success: true,
          data: parsed,
          originalLength: text.length,
          parseTime: Date.now() - startTime
        }
      }
      repairAttempts.push(`Direct parsing schema error: ${schemaValidation.error}`)
    } catch (error) {
      repairAttempts.push(`Direct parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Strategy 2: Basic cleaning
    try {
      const cleaned = this.basicCleanJson(text)
      const parsed = JSON.parse(cleaned)
      const schemaValidation = this.validateSchema(parsed)
      if (schemaValidation.valid) {
        return {
          success: true,
          data: parsed,
          originalLength: text.length,
          repairAttempts,
          parseTime: Date.now() - startTime
        }
      }
      repairAttempts.push(`Basic cleaning schema error: ${schemaValidation.error}`)
    } catch (error) {
      repairAttempts.push(`Basic cleaning failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Strategy 3: Extract and reconstruct
    try {
      const reconstructed = this.extractAndReconstruct(text)
      if (reconstructed) {
        const schemaValidation = this.validateSchema(reconstructed)
        if (schemaValidation.valid) {
          return {
            success: true,
            data: reconstructed,
            originalLength: text.length,
            repairAttempts,
            parseTime: Date.now() - startTime
          }
        }
        repairAttempts.push(`Reconstruction schema error: ${schemaValidation.error}`)
      }
    } catch (error) {
      repairAttempts.push(`Reconstruction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // All strategies failed
    return {
      success: false,
      error: 'All parsing strategies failed',
      originalLength: text.length,
      repairAttempts,
      parseTime: Date.now() - startTime
    }
  }

  /**
   * Validate input for security
   */
  private validateInput(text: string): { valid: boolean; error?: string } {
    if (!text || typeof text !== 'string') {
      return { valid: false, error: 'Input must be a non-empty string' }
    }

    if (text.length > PARSING_CONFIG.MAX_INPUT_LENGTH) {
      return { valid: false, error: `Input exceeds maximum length of ${PARSING_CONFIG.MAX_INPUT_LENGTH} characters` }
    }

    // Check for potentially malicious patterns
    if (text.includes('\x00') || text.includes('\uFFFD')) {
      return { valid: false, error: 'Input contains invalid characters' }
    }

    return { valid: true }
  }

  /**
   * Basic JSON cleaning with safe operations
   */
  private basicCleanJson(text: string): string {
    // First remove markdown code blocks more aggressively
    let cleaned = text
      .replace(SecureJsonParser.SAFE_PATTERNS.MARKDOWN_REMOVAL, '')
      .trim()

    // Extract JSON object safely
    const jsonMatch = cleaned.match(SecureJsonParser.SAFE_PATTERNS.EXTRACT_JSON_OBJECT)
    if (jsonMatch) {
      cleaned = jsonMatch[0]
    }

    // Don't normalize newlines inside JSON strings - preserve them
    // First, let's extract all string values and replace newlines with \n
    cleaned = cleaned.replace(/"([\s\S]*?)"/g, (match, content) => {
      // Replace actual newlines with escaped newlines within JSON strings
      const escaped = content
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/"/g, '\\"')
      return `"${escaped}"`
    })

    // Now safe to clean the rest
    cleaned = cleaned
      .replace(SecureJsonParser.SAFE_PATTERNS.TRAILING_COMMAS, '$1')
      .trim()

    // Balance braces safely
    const openBraces = (cleaned.match(/\{/g) || []).length
    const closeBraces = (cleaned.match(/\}/g) || []).length
    if (openBraces > closeBraces) {
      cleaned += '}'.repeat(Math.min(openBraces - closeBraces, 5)) // Limit to prevent DoS
    }

    return cleaned
  }

  /**
   * Extract components and reconstruct safely
   */
  private extractAndReconstruct(text: string): ReferenceContentSchema | null {
    try {
      // Safe extraction using limited patterns
      const pitchMatch = text.match(SecureJsonParser.SAFE_PATTERNS.EXTRACT_PITCH)
      const topicsMatch = text.match(SecureJsonParser.SAFE_PATTERNS.EXTRACT_TOPICS)
      const sentimentMatch = text.match(SecureJsonParser.SAFE_PATTERNS.EXTRACT_SENTIMENT)
      const messageMatch = text.match(SecureJsonParser.SAFE_PATTERNS.EXTRACT_CORE_MESSAGE)
      const audienceMatch = text.match(SecureJsonParser.SAFE_PATTERNS.EXTRACT_TARGET_AUDIENCE)
      const rationaleMatch = text.match(SecureJsonParser.SAFE_PATTERNS.EXTRACT_RATIONALE)

      if (!pitchMatch || !pitchMatch[1] || pitchMatch[1].length < PARSING_CONFIG.MIN_PITCH_LENGTH) {
        return null
      }
      
      // Unescape the extracted pitch content
      const unescapePitch = (pitch: string): string => {
        return pitch
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
      }

      // Parse topics safely
      const keyTopics: string[] = []
      if (topicsMatch && topicsMatch[1]) {
        const topicsStr = topicsMatch[1]
        const topicsArray = topicsStr.split(',')
        for (let i = 0; i < Math.min(topicsArray.length, 5); i++) {
          const topic = topicsArray[i]
            .replace(/['"]/g, '')
            .trim()
          if (topic.length > 0 && topic.length < 100) {
            keyTopics.push(topic)
          }
        }
      }

      return {
        analysis: {
          keyTopics,
          sentiment: sentimentMatch?.[1] || 'neutral',
          coreMessage: unescapePitch(messageMatch?.[1] || 'Content analysis from AI response'),
          targetAudience: unescapePitch(audienceMatch?.[1] || 'General audience')
        },
        generatedPitch: unescapePitch(pitchMatch[1]).slice(0, PARSING_CONFIG.MAX_PITCH_LENGTH), // Limit length
        rationale: rationaleMatch?.[1] ? unescapePitch(rationaleMatch[1]) : 'Extracted from AI response'
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Comprehensive schema validation
   */
  private validateSchema(data: any): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Data must be an object' }
    }

    // Validate analysis
    if (!data.analysis || typeof data.analysis !== 'object') {
      return { valid: false, error: 'Missing or invalid analysis object' }
    }

    const analysis = data.analysis
    if (!Array.isArray(analysis.keyTopics)) {
      return { valid: false, error: 'keyTopics must be an array' }
    }

    if (typeof analysis.sentiment !== 'string' || analysis.sentiment.length === 0) {
      return { valid: false, error: 'sentiment must be a non-empty string' }
    }

    if (typeof analysis.coreMessage !== 'string' || analysis.coreMessage.length === 0) {
      return { valid: false, error: 'coreMessage must be a non-empty string' }
    }

    if (typeof analysis.targetAudience !== 'string' || analysis.targetAudience.length === 0) {
      return { valid: false, error: 'targetAudience must be a non-empty string' }
    }

    // Validate generatedPitch
    if (!data.generatedPitch || typeof data.generatedPitch !== 'string') {
      return { valid: false, error: 'generatedPitch must be a non-empty string' }
    }

    if (data.generatedPitch.length < PARSING_CONFIG.MIN_PITCH_LENGTH) {
      return { valid: false, error: `generatedPitch must be at least ${PARSING_CONFIG.MIN_PITCH_LENGTH} characters` }
    }

    if (data.generatedPitch.length > PARSING_CONFIG.MAX_PITCH_LENGTH) {
      return { valid: false, error: `generatedPitch exceeds maximum length of ${PARSING_CONFIG.MAX_PITCH_LENGTH}` }
    }

    // Validate rationale (optional)
    if (data.rationale && (typeof data.rationale !== 'string' || data.rationale.length > 1000)) {
      return { valid: false, error: 'rationale must be a string with max 1000 characters' }
    }

    return { valid: true }
  }
}

// Export stateless parser instance
export const secureJsonParser = new SecureJsonParser()

// Export convenience function
export function parseAiJsonResponse(text: string): JsonParseResult {
  return secureJsonParser.parseAiResponse(text)
}