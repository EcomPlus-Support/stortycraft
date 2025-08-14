import { useState, useEffect } from 'react'

export type ShortsStyle = 'quick_tips' | 'story' | 'viral' | 'educational' | 'entertainment'

export interface ShortsDetectionState {
  isShorts: boolean
  confidence: number
  shortsStyle?: ShortsStyle
  duration?: number
  isAnalyzing: boolean
}

const SHORTS_URL_PATTERNS = [
  /youtube\.com\/shorts\//,
  /youtu\.be\/.*\?.*shorts/
]

// Internal function to extract video ID
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

export function useShortsDetection(url: string) {
  const [detection, setDetection] = useState<ShortsDetectionState>({
    isShorts: false,
    confidence: 0,
    isAnalyzing: false
  })

  useEffect(() => {
    if (!url) {
      setDetection({
        isShorts: false,
        confidence: 0,
        isAnalyzing: false
      })
      return
    }

    // Quick URL pattern check for immediate feedback
    const isLikelyShorts = SHORTS_URL_PATTERNS.some(pattern => pattern.test(url))
    
    if (isLikelyShorts) {
      setDetection(prev => ({
        ...prev,
        isShorts: true,
        confidence: 0.8,
        isAnalyzing: true
      }))
    }

    // Debounced detailed analysis
    const timer = setTimeout(async () => {
      try {
        const videoId = extractVideoId(url)
        if (videoId) {
          // For now, we'll use URL patterns and assume Shorts
          // In production, this would call YouTube API for duration
          setDetection({
            isShorts: isLikelyShorts,
            confidence: isLikelyShorts ? 0.95 : 0.1,
            shortsStyle: isLikelyShorts ? 'viral' : undefined,
            duration: isLikelyShorts ? 45 : undefined,
            isAnalyzing: false
          })
        } else {
          setDetection({
            isShorts: false,
            confidence: 0,
            isAnalyzing: false
          })
        }
      } catch (error) {
        setDetection({
          isShorts: false,
          confidence: 0,
          isAnalyzing: false
        })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [url])

  return detection
}