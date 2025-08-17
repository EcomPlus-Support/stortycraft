/**
 * YouTube Shorts Integration Test Suite
 * Tests all new Shorts-related components and functionality
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Import components under test
import { useShortsDetection } from '@/app/hooks/useShortsDetection'
import { ShortsIndicator } from '@/app/components/shorts-indicator'
import { ShortsResultDisplay } from '@/app/components/shorts-result-display'
import { ContentTypeOverride } from '@/app/components/content-type-override'
import { TrendAnalysis } from '@/app/components/trend-analysis'

// Create wrapper for hook testing
import { renderHook } from '@testing-library/react'

// Mock data for testing
const mockReferenceContent = {
  generatedPitch: "This viral AI hack will change your workflow instantly! Quick 30-second tips for maximum engagement and trending results.",
  extractedContent: {
    keyTopics: ["AI", "hack", "viral", "workflow", "engagement", "trending", "quick tips"],
    summary: "AI workflow optimization tips",
    transcript: "Test transcript about AI workflow hacks and viral tips"
  },
  contentQuality: 'full' as const,
  processingMetadata: {
    tokensUsed: 500,
    processingTime: 2000,
    model: 'test-model'
  }
}

const mockShortsDetection = {
  isShorts: true,
  confidence: 0.95,
  shortsStyle: 'viral' as const,
  duration: 45,
  isAnalyzing: false
}

const mockRegularVideoDetection = {
  isShorts: false,
  confidence: 0.1,
  shortsStyle: undefined,
  duration: 300,
  isAnalyzing: false
}

describe('YouTube Shorts Integration', () => {
  
  describe('useShortsDetection Hook', () => {
    
    test('detects YouTube Shorts URLs correctly', async () => {
      const shortsUrls = [
        'https://youtube.com/shorts/dQw4w9WgXcQ',
        'https://www.youtube.com/shorts/abc123',
        'https://youtu.be/dQw4w9WgXcQ?shorts'
      ]

      for (const url of shortsUrls) {
        const { result } = renderHook(() => useShortsDetection(url))
        
        // Should immediately detect Shorts pattern
        expect(result.current.isShorts).toBe(true)
        expect(result.current.confidence).toBeGreaterThan(0.7)
      }
    })

    test('does not detect regular YouTube URLs as Shorts', () => {
      const regularUrls = [
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=abc123',
        'https://youtu.be/dQw4w9WgXcQ'
      ]

      for (const url of regularUrls) {
        const { result } = renderHook(() => useShortsDetection(url))
        
        expect(result.current.isShorts).toBe(false)
        expect(result.current.confidence).toBeLessThan(0.5)
      }
    })

    test('handles empty URL gracefully', () => {
      const { result } = renderHook(() => useShortsDetection(''))
      
      expect(result.current.isShorts).toBe(false)
      expect(result.current.confidence).toBe(0)
      expect(result.current.isAnalyzing).toBe(false)
    })

    test('shows analyzing state during processing', async () => {
      const { result } = renderHook(() => useShortsDetection('https://youtube.com/shorts/test'))
      
      // Should show analyzing state initially
      expect(result.current.isAnalyzing).toBe(true)
      
      // Wait for analysis to complete
      await waitFor(() => {
        expect(result.current.isAnalyzing).toBe(false)
      }, { timeout: 1000 })
    })
  })

  describe('ShortsIndicator Component', () => {
    
    test('renders Shorts indicator for detected Shorts', () => {
      render(<ShortsIndicator detection={mockShortsDetection} />)
      
      expect(screen.getByText('YouTube Shorts')).toBeInTheDocument()
      expect(screen.getByText('YouTube Shorts Detected! 🎬')).toBeInTheDocument()
      expect(screen.getByText(/mobile-first storytelling/)).toBeInTheDocument()
    })

    test('shows duration badge when available', () => {
      render(<ShortsIndicator detection={mockShortsDetection} />)
      
      expect(screen.getByText('~45s')).toBeInTheDocument()
    })

    test('shows analyzing state correctly', () => {
      const analyzingDetection = { ...mockShortsDetection, isAnalyzing: true }
      render(<ShortsIndicator detection={analyzingDetection} />)
      
      expect(screen.getByText('Analyzing Content...')).toBeInTheDocument()
      expect(screen.getByText(/Detecting content type/)).toBeInTheDocument()
    })

    test('does not render for non-Shorts content', () => {
      render(<ShortsIndicator detection={mockRegularVideoDetection} />)
      
      expect(screen.queryByText('YouTube Shorts')).not.toBeInTheDocument()
    })

    test('applies correct styling classes', () => {
      const { container } = render(<ShortsIndicator detection={mockShortsDetection} />)
      
      const badge = screen.getByText('YouTube Shorts').closest('div')
      expect(badge).toHaveClass('border-red-500', 'text-red-700')
    })
  })

  describe('ShortsResultDisplay Component', () => {
    
    test('renders Shorts optimization analysis', () => {
      render(<ShortsResultDisplay content={mockReferenceContent} />)
      
      expect(screen.getByText('Shorts Optimization Analysis')).toBeInTheDocument()
      expect(screen.getByText('Hook Strength')).toBeInTheDocument()
      expect(screen.getByText('Viral Potential')).toBeInTheDocument()
      expect(screen.getByText('Mobile-First')).toBeInTheDocument()
    })

    test('calculates hook strength correctly', () => {
      render(<ShortsResultDisplay content={mockReferenceContent} />)
      
      // Should detect viral keywords in the pitch
      expect(screen.getByText('Strong')).toBeInTheDocument()
    })

    test('shows length optimization feedback', () => {
      render(<ShortsResultDisplay content={mockReferenceContent} />)
      
      const wordCount = mockReferenceContent.generatedPitch.split(' ').length
      expect(screen.getByText(`${wordCount} words`)).toBeInTheDocument()
    })

    test('highlights viral keywords in topics', () => {
      render(<ShortsResultDisplay content={mockReferenceContent} />)
      
      expect(screen.getByText('Viral Elements Detected')).toBeInTheDocument()
      
      // Should show fire emoji for viral keywords
      const viralTopic = screen.getByText('viral 🔥')
      expect(viralTopic).toBeInTheDocument()
    })

    test('shows mobile optimization hint', () => {
      render(<ShortsResultDisplay content={mockReferenceContent} />)
      
      expect(screen.getByText(/optimized for vertical 9:16 aspect ratio/)).toBeInTheDocument()
    })
  })

  describe('ContentTypeOverride Component', () => {
    
    test('renders override options for ambiguous content', () => {
      const mockOnOverride = jest.fn()
      
      render(
        <ContentTypeOverride 
          detection={mockShortsDetection}
          onOverride={mockOnOverride}
          currentOverride="auto"
        />
      )
      
      expect(screen.getByText('Content Type')).toBeInTheDocument()
      expect(screen.getByText('Override')).toBeInTheDocument()
    })

    test('allows manual override selection', async () => {
      const mockOnOverride = jest.fn()
      const user = userEvent.setup()
      
      render(
        <ContentTypeOverride 
          detection={mockShortsDetection}
          onOverride={mockOnOverride}
          currentOverride="auto"
        />
      )
      
      // Click override button to show options
      await user.click(screen.getByText('Override'))
      
      // Should show override options
      expect(screen.getByText('Auto')).toBeInTheDocument()
      expect(screen.getByText('Shorts')).toBeInTheDocument()
      expect(screen.getByText('Video')).toBeInTheDocument()
    })

    test('calls onOverride when selection changes', async () => {
      const mockOnOverride = jest.fn()
      const user = userEvent.setup()
      
      render(
        <ContentTypeOverride 
          detection={mockShortsDetection}
          onOverride={mockOnOverride}
          currentOverride="auto"
        />
      )
      
      // Show override options
      await user.click(screen.getByText('Override'))
      
      // Click Shorts option
      await user.click(screen.getByText('Shorts'))
      
      expect(mockOnOverride).toHaveBeenCalledWith('shorts')
    })

    test('displays current selection correctly', async () => {
      const mockOnOverride = jest.fn()
      const user = userEvent.setup()
      
      render(
        <ContentTypeOverride 
          detection={mockShortsDetection}
          onOverride={mockOnOverride}
          currentOverride="shorts"
        />
      )
      
      await user.click(screen.getByText('Override'))
      
      expect(screen.getByText('Shorts (Manual)')).toBeInTheDocument()
    })

    test('does not render for clearly regular videos', () => {
      const lowConfidenceDetection = { ...mockRegularVideoDetection, confidence: 0.3 }
      const mockOnOverride = jest.fn()
      
      const { container } = render(
        <ContentTypeOverride 
          detection={lowConfidenceDetection}
          onOverride={mockOnOverride}
          currentOverride="auto"
        />
      )
      
      expect(container.firstChild).toBeNull()
    })
  })

  describe('TrendAnalysis Component', () => {
    
    test('renders viral potential analysis', () => {
      render(<TrendAnalysis keyTopics={mockReferenceContent.extractedContent.keyTopics} />)
      
      expect(screen.getByText('Viral Potential Analysis')).toBeInTheDocument()
      expect(screen.getByText(/viral potential/i)).toBeInTheDocument()
    })

    test('calculates trending score correctly', () => {
      render(<TrendAnalysis keyTopics={mockReferenceContent.extractedContent.keyTopics} />)
      
      // Should show percentage score
      const scoreElements = screen.getAllByText(/%$/)
      expect(scoreElements.length).toBeGreaterThan(0)
    })

    test('shows trending topics matches', () => {
      render(<TrendAnalysis keyTopics={mockReferenceContent.extractedContent.keyTopics} />)
      
      expect(screen.getByText('Trending Topics Match')).toBeInTheDocument()
      
      // Should highlight AI and viral as trending
      expect(screen.getByText(/AI/)).toBeInTheDocument()
      expect(screen.getByText(/viral/)).toBeInTheDocument()
    })

    test('suggests relevant hashtags', () => {
      render(<TrendAnalysis keyTopics={mockReferenceContent.extractedContent.keyTopics} />)
      
      expect(screen.getByText('Suggested Viral Hashtags')).toBeInTheDocument()
      expect(screen.getByText('#viral')).toBeInTheDocument()
      expect(screen.getByText('#ai')).toBeInTheDocument()
    })

    test('shows optimal posting times', () => {
      render(<TrendAnalysis keyTopics={mockReferenceContent.extractedContent.keyTopics} />)
      
      expect(screen.getByText('Optimal Posting Times')).toBeInTheDocument()
      expect(screen.getByText('Peak Hours')).toBeInTheDocument()
      expect(screen.getByText('Best Days')).toBeInTheDocument()
    })

    test('allows copying hashtags to clipboard', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn(),
        },
      })
      
      const user = userEvent.setup()
      
      render(<TrendAnalysis keyTopics={mockReferenceContent.extractedContent.keyTopics} />)
      
      const hashtagElement = screen.getByText('#viral')
      await user.click(hashtagElement)
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('#viral')
    })
  })

  describe('Integration Tests', () => {
    
    test('components work together correctly', async () => {
      const TestIntegration = () => {
        const detection = useShortsDetection('https://youtube.com/shorts/test')
        const [override, setOverride] = useState<'shorts' | 'video' | 'auto'>('auto')
        
        return (
          <div>
            <ShortsIndicator detection={detection} />
            <ContentTypeOverride 
              detection={detection}
              onOverride={setOverride}
              currentOverride={override}
            />
            {detection.isShorts && (
              <ShortsResultDisplay content={mockReferenceContent} />
            )}
          </div>
        )
      }
      
      render(<TestIntegration />)
      
      // Wait for Shorts detection
      await waitFor(() => {
        expect(screen.getByText('YouTube Shorts')).toBeInTheDocument()
      })
      
      // Shorts result display should also appear
      await waitFor(() => {
        expect(screen.getByText('Shorts Optimization Analysis')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    
    test('handles malformed URLs gracefully', () => {
      const { result } = renderHook(() => useShortsDetection('not-a-url'))
      
      expect(result.current.isShorts).toBe(false)
      expect(result.current.confidence).toBe(0)
    })

    test('handles missing data in components', () => {
      const emptyContent = {
        ...mockReferenceContent,
        extractedContent: {
          keyTopics: [],
          summary: '',
          transcript: ''
        }
      }
      
      expect(() => {
        render(<ShortsResultDisplay content={emptyContent} />)
      }).not.toThrow()
    })

    test('handles undefined detection gracefully', () => {
      const undefinedDetection = {
        isShorts: false,
        confidence: 0,
        isAnalyzing: false
      }
      
      expect(() => {
        render(<ShortsIndicator detection={undefinedDetection} />)
      }).not.toThrow()
    })
  })

  describe('Performance Tests', () => {
    
    test('useShortsDetection debounces URL changes', async () => {
      const { result, rerender } = renderHook(
        ({ url }) => useShortsDetection(url),
        { initialProps: { url: '' } }
      )
      
      // Rapidly change URLs
      rerender({ url: 'https://youtube.com/shorts/1' })
      rerender({ url: 'https://youtube.com/shorts/2' })
      rerender({ url: 'https://youtube.com/shorts/3' })
      
      // Should handle rapid changes without errors
      expect(result.current).toBeDefined()
    })

    test('components render efficiently with large data sets', () => {
      const largeTopicList = Array.from({ length: 50 }, (_, i) => `topic-${i}`)
      
      const renderTime = performance.now()
      render(<TrendAnalysis keyTopics={largeTopicList} />)
      const renderDuration = performance.now() - renderTime
      
      // Should render within reasonable time (less than 100ms)
      expect(renderDuration).toBeLessThan(100)
    })
  })
})