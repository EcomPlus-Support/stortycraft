/**
 * Utility functions for handling and translating errors into user-friendly messages
 */

export interface UserFriendlyError {
  title: string
  message: string
  actionable?: string
  type: 'warning' | 'error' | 'info'
}

/**
 * Safely parse JSON with better error handling
 */
export function safeJsonParse<T = any>(jsonString: string): { success: true; data: T } | { success: false; error: UserFriendlyError } {
  if (!jsonString || typeof jsonString !== 'string') {
    return {
      success: false,
      error: {
        title: 'Empty Response',
        message: 'No response received from the AI service.',
        actionable: 'Please try again.',
        type: 'warning'
      }
    }
  }
  
  try {
    const data = JSON.parse(jsonString)
    return { success: true, data }
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Check for specific JSON parsing issues with detailed position info
      if (error.message.includes('Unterminated string')) {
        const positionMatch = error.message.match(/at position (\d+)/)
        const position = positionMatch ? parseInt(positionMatch[1]) : -1
        
        return {
          success: false,
          error: {
            title: 'AI Response Cut Off',
            message: position > 0 
              ? `The AI response was incomplete (stopped at character ${position}).`
              : 'The AI response was incomplete.',
            actionable: 'Try again - this usually resolves automatically. Consider using shorter content if the issue persists.',
            type: 'warning'
          }
        }
      }
      
      if (error.message.includes('Unexpected token')) {
        const tokenMatch = error.message.match(/Unexpected token (.+?) in JSON at position (\d+)/)
        const token = tokenMatch ? tokenMatch[1] : 'unknown'
        const position = tokenMatch ? parseInt(tokenMatch[2]) : -1
        
        return {
          success: false,
          error: {
            title: 'Response Format Issue',
            message: position > 0 
              ? `Found unexpected character "${token}" at position ${position}.`
              : 'The AI generated an unexpected response format.',
            actionable: 'Retrying automatically with improved error handling.',
            type: 'warning'
          }
        }
      }
      
      if (error.message.includes('Unexpected end of JSON input')) {
        return {
          success: false,
          error: {
            title: 'Incomplete Response',
            message: 'The AI response was cut off unexpectedly.',
            actionable: 'Try again with the same content.',
            type: 'warning'
          }
        }
      }
    }
    
    // Generic JSON parsing error
    return {
      success: false,
      error: {
        title: 'Response Processing Error',
        message: 'There was an issue processing the AI response.',
        actionable: 'Please try again.',
        type: 'error'
      }
    }
  }
}

/**
 * Convert technical errors into user-friendly messages
 */
export function translateError(error: unknown): UserFriendlyError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // YouTube-specific errors
    if (message.includes('invalid youtube url')) {
      return {
        title: 'Invalid YouTube URL',
        message: 'Please check the YouTube URL and make sure it\'s correct.',
        actionable: 'Try a different YouTube video URL.',
        type: 'warning'
      }
    }
    
    if (message.includes('video not found') || message.includes('not accessible')) {
      return {
        title: 'Video Not Available',
        message: 'This video might be private, deleted, or restricted in your region.',
        actionable: 'Try a different video that\'s publicly available.',
        type: 'warning'
      }
    }
    
    if (message.includes('youtube api quota exceeded')) {
      return {
        title: 'Service Temporarily Unavailable',
        message: 'Our YouTube processing service has reached its daily limit.',
        actionable: 'Please try again later or use the text input option.',
        type: 'warning'
      }
    }
    
    if (message.includes('youtube api key not configured')) {
      return {
        title: 'Service Configuration Issue',
        message: 'YouTube video processing is temporarily unavailable.',
        actionable: 'Please use the text input option instead.',
        type: 'error'
      }
    }
    
    // AI/Processing errors
    if (message.includes('no response generated') || message.includes('no text generated')) {
      return {
        title: 'AI Processing Issue',
        message: 'The AI couldn\'t generate a response for this content.',
        actionable: 'Try with different content or simplify your input.',
        type: 'warning'
      }
    }
    
    if (message.includes('failed to parse ai response') || message.includes('response format error')) {
      return {
        title: 'AI Response Issue',
        message: 'The AI response was not in the expected format.',
        actionable: 'Please try again. The AI will generate a fresh response.',
        type: 'warning'
      }
    }
    
    if (message.includes('invalid scene data structure')) {
      return {
        title: 'Content Structure Issue',
        message: 'The generated content structure was invalid.',
        actionable: 'Try again with a clearer or simpler pitch.',
        type: 'warning'
      }
    }
    
    if (message.includes('request timeout') || message.includes('timeout')) {
      return {
        title: 'Processing Timeout',
        message: 'The content took too long to process.',
        actionable: 'Try with shorter content or try again.',
        type: 'warning'
      }
    }
    
    if (message.includes('content too long')) {
      return {
        title: 'Content Too Long',
        message: 'The content is too long to process efficiently.',
        actionable: 'Try with a shorter video or text excerpt.',
        type: 'warning'
      }
    }
    
    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return {
        title: 'Connection Issue',
        message: 'There was a problem connecting to our services.',
        actionable: 'Check your internet connection and try again.',
        type: 'warning'
      }
    }
    
    // Authentication errors
    if (message.includes('authentication') || message.includes('unauthorized')) {
      return {
        title: 'Authentication Error',
        message: 'There was an issue with service authentication.',
        actionable: 'Please refresh the page and try again.',
        type: 'error'
      }
    }
    
    // JSON parsing errors (catch-all) with more specific handling
    if (message.includes('unterminated string')) {
      return {
        title: 'AI Response Incomplete',
        message: 'The AI response was cut off mid-sentence.',
        actionable: 'Try again with shorter content or a simpler request.',
        type: 'warning'
      }
    }
    
    if (message.includes('unexpected token') || message.includes('json') || message.includes('parse') || message.includes('syntax')) {
      return {
        title: 'Response Format Error',
        message: 'The AI response had formatting issues.',
        actionable: 'Please try again. The system will attempt to fix the format automatically.',
        type: 'warning'
      }
    }
    
    // Content/processing quality issues
    if (message.includes('content processing issue')) {
      return {
        title: 'Content Processing Issue',
        message: 'There was an issue processing your content.',
        actionable: 'Try with shorter or simpler content.',
        type: 'warning'
      }
    }
    
    // Rate limiting or service availability
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return {
        title: 'Service Busy',
        message: 'Our service is experiencing high demand.',
        actionable: 'Please wait a moment and try again.',
        type: 'warning'
      }
    }
    
    // Model or service specific errors
    if (message.includes('model not found') || message.includes('gemini')) {
      return {
        title: 'AI Service Issue',
        message: 'There was a temporary issue with our AI service.',
        actionable: 'Please try again in a few moments.',
        type: 'warning'
      }
    }
    
    // Gemini service specific errors
    if (message.includes('no gemini models available') || message.includes('model unavailable')) {
      return {
        title: 'Service Configuration Issue',
        message: 'The AI service is temporarily unavailable in this region.',
        actionable: 'Using fallback content generation. Please try again later for full AI features.',
        type: 'warning'
      }
    }
    
    if (message.includes('gemini service error')) {
      return {
        title: 'AI Processing Issue',
        message: 'There was an issue with the AI text generation service.',
        actionable: 'Please try again. If the issue persists, we\'ll use fallback content.',
        type: 'warning'
      }
    }
    
    if (message.includes('max retries exceeded')) {
      return {
        title: 'Service Timeout',
        message: 'The AI service took too long to respond after multiple attempts.',
        actionable: 'Please try again with simpler content or wait a moment.',
        type: 'warning'
      }
    }
    
    // Input validation errors
    if (message.includes('invalid input') || message.includes('validation')) {
      return {
        title: 'Input Validation Error',
        message: 'Please check your input and try again.',
        actionable: 'Make sure all required fields are filled correctly.',
        type: 'warning'
      }
    }
    
    // Image generation errors
    if (message.includes('no image data received') || message.includes('image generation failed')) {
      return {
        title: 'Image Generation Failed',
        message: 'Unable to generate an image for this content.',
        actionable: 'Try again or modify the scene description.',
        type: 'warning'
      }
    }
    
    if (message.includes('rai filtered') || message.includes('content policy')) {
      return {
        title: 'Content Policy Issue',
        message: 'The content was flagged by our safety filters.',
        actionable: 'Try modifying the description to be more appropriate.',
        type: 'warning'
      }
    }
    
    // Video generation errors
    if (message.includes('video generation') || message.includes('failed to generate video')) {
      return {
        title: 'Video Generation Failed',
        message: 'Unable to generate a video for this scene.',
        actionable: 'Try again or use a different image.',
        type: 'warning'
      }
    }
    
    // API or service errors
    if (message.includes('500') || message.includes('internal server error')) {
      return {
        title: 'Service Error',
        message: 'Our service encountered an internal error.',
        actionable: 'Please try again in a few moments.',
        type: 'error'
      }
    }
    
    if (message.includes('503') || message.includes('service unavailable')) {
      return {
        title: 'Service Unavailable',
        message: 'Our service is temporarily unavailable.',
        actionable: 'Please try again later.',
        type: 'warning'
      }
    }
    
    // Content length or complexity errors
    if (message.includes('too long') || message.includes('exceeds limit')) {
      return {
        title: 'Content Too Large',
        message: 'The content is too long or complex to process.',
        actionable: 'Try with shorter or simpler content.',
        type: 'warning'
      }
    }
  }
  
  // Generic error fallback
  return {
    title: 'Unexpected Error',
    message: 'Something went wrong while processing your content.',
    actionable: 'Please try again or contact support if the issue persists.',
    type: 'error'
  }
}

/**
 * Enhanced JSON cleaning and preparation for parsing
 */
export function cleanJsonResponse(text: string): string {
  if (!text || typeof text !== 'string') {
    return '{}'
  }
  
  console.log('Cleaning JSON response, original length:', text.length)
  
  // Remove markdown code blocks
  let cleaned = text.replace(/```json|```/g, '').trim()
  
  // Remove any leading/trailing non-JSON text
  const jsonStart = cleaned.indexOf('{')
  const jsonEnd = cleaned.lastIndexOf('}')
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1)
  }
  
  // Advanced cleaning strategies
  cleaned = cleaned
    // Remove trailing commas before closing braces/brackets
    .replace(/,\s*([}\]])/g, '$1')
    // Fix unescaped quotes in strings (basic approach)
    .replace(/"([^"]*[^\\])"([^,}\]\s])/g, '"$1\\"$2')
    // Fix line breaks within strings
    .replace(/"([^"\\]*(?:\\.[^"\\]*)*)\n([^"]*)"/g, '"$1\\n$2"')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Fix incomplete strings at the end
    .replace(/"([^"\\]*(?:\\.[^"\\]*)*)$/, '"$1"')
  
  // Check for balanced braces and brackets
  const openBraces = (cleaned.match(/{/g) || []).length
  const closeBraces = (cleaned.match(/}/g) || []).length
  const openBrackets = (cleaned.match(/\[/g) || []).length
  const closeBrackets = (cleaned.match(/\]/g) || []).length
  
  // Add missing closing braces/brackets
  if (openBraces > closeBraces) {
    cleaned += '}'.repeat(openBraces - closeBraces)
  }
  if (openBrackets > closeBrackets) {
    cleaned += ']'.repeat(openBrackets - closeBrackets)
  }
  
  console.log('Cleaned JSON length:', cleaned.length)
  console.log('JSON structure check - braces balanced:', openBraces === (cleaned.match(/{/g) || []).length)
  
  return cleaned
}

/**
 * Validate required fields in parsed content
 */
export function validateReferenceContent(data: any): { valid: true; data: any } | { valid: false; error: UserFriendlyError } {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      error: {
        title: 'Invalid Response Format',
        message: 'The AI response was not in the expected format.',
        actionable: 'Please try again.',
        type: 'warning'
      }
    }
  }
  
  if (!data.generatedPitch || typeof data.generatedPitch !== 'string' || data.generatedPitch.trim().length === 0) {
    return {
      valid: false,
      error: {
        title: 'Missing Content',
        message: 'The AI didn\'t generate a complete pitch.',
        actionable: 'Please try again with the same or different content.',
        type: 'warning'
      }
    }
  }
  
  if (!data.analysis || typeof data.analysis !== 'object') {
    // Provide default analysis structure
    data.analysis = {
      keyTopics: [],
      sentiment: 'neutral',
      coreMessage: 'Content analysis unavailable',
      targetAudience: 'General audience'
    }
  }
  
  return { valid: true, data }
}

/**
 * Validate and sanitize scenes data structure
 */
export function validateScenesData(data: any): { valid: true; data: any } | { valid: false; error: UserFriendlyError } {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      error: {
        title: 'Invalid Response Format',
        message: 'The AI response was not in the expected format.',
        actionable: 'Please try again.',
        type: 'warning'
      }
    }
  }
  
  // Ensure required top-level fields exist
  if (!data.scenario || typeof data.scenario !== 'string') {
    data.scenario = 'A compelling story unfolds through visual storytelling.'
  }
  
  if (!data.genre || typeof data.genre !== 'string') {
    data.genre = 'Cinematic'
  }
  
  if (!data.mood || typeof data.mood !== 'string') {
    data.mood = 'Inspirational'
  }
  
  if (!data.music || typeof data.music !== 'string') {
    data.music = 'Orchestral score that enhances the emotional journey.'
  }
  
  // Ensure characters array exists
  if (!Array.isArray(data.characters)) {
    data.characters = [{ name: 'Protagonist', description: 'Main character of the story' }]
  }
  
  // Ensure settings array exists
  if (!Array.isArray(data.settings)) {
    data.settings = [{ name: 'Main Setting', description: 'Primary location for the story' }]
  }
  
  // Validate scenes array
  if (!Array.isArray(data.scenes)) {
    return {
      valid: false,
      error: {
        title: 'Missing Scenes',
        message: 'The AI didn\'t generate the expected scenes structure.',
        actionable: 'Please try again with a clearer pitch.',
        type: 'warning'
      }
    }
  }
  
  if (data.scenes.length === 0) {
    return {
      valid: false,
      error: {
        title: 'No Scenes Generated',
        message: 'The AI didn\'t generate any scenes for your pitch.',
        actionable: 'Try with a more detailed or clearer pitch.',
        type: 'warning'
      }
    }
  }
  
  // Sanitize scene objects
  data.scenes = data.scenes.map((scene: any, index: number) => {
    if (!scene || typeof scene !== 'object') {
      return {
        imagePrompt: `Scene ${index + 1}: A compelling visual moment from the story.`,
        videoPrompt: `Characters move naturally in this scene.`,
        description: `Scene ${index + 1} description.`,
        voiceover: `This scene advances the story.`,
        charactersPresent: []
      }
    }
    
    return {
      imagePrompt: scene.imagePrompt || `Scene ${index + 1}: A compelling visual moment.`,
      videoPrompt: scene.videoPrompt || `Natural character movement in scene ${index + 1}.`,
      description: scene.description || `Scene ${index + 1} description.`,
      voiceover: scene.voiceover || `Scene ${index + 1} narration.`,
      charactersPresent: Array.isArray(scene.charactersPresent) ? scene.charactersPresent : []
    }
  })
  
  return { valid: true, data }
}