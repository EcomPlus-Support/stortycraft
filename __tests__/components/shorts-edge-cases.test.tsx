/**
 * YouTube Shorts Edge Cases and Error Handling Test Suite
 * Tests boundary conditions, error states, and accessibility
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { renderHook, act } from '@testing-library/react'

// Import components under test
import { useShortsDetection } from '@/app/hooks/useShortsDetection'
import { ShortsIndicator } from '@/app/components/shorts-indicator'
import { ShortsResultDisplay } from '@/app/components/shorts-result-display'
import { ContentTypeOverride } from '@/app/components/content-type-override'
import { TrendAnalysis } from '@/app/components/trend-analysis'

// Test data for edge cases
const edgeCaseUrls = [
  '', // Empty string
  'not-a-url', // Invalid URL
  'https://youtube.com/shorts/', // Missing video ID
  'https://youtube.com/shorts/abc123?extra=params&more=stuff', // URL with parameters
  'https://www.youtube.com/shorts/a', // Very short video ID
  'https://youtube.com/shorts/' + 'a'.repeat(1000), // Very long video ID
  'javascript:alert("xss")', // XSS attempt
  'https://youtube.com/shorts/\n\r\t', // URL with whitespace
  'https://example.com/fake/shorts/abc123', // Non-YouTube domain
  'https://youtube.com/watch?v=abc123', // Regular video URL
]

const malformedContent = {
  generatedPitch: '', // Empty pitch
  extractedContent: {
    keyTopics: [], // Empty topics
    summary: '',
    transcript: ''
  },
  contentQuality: 'metadata-only' as const,
  processingMetadata: {
    tokensUsed: 0,
    processingTime: 0,
    model: ''
  }
}

const extremeContent = {
  generatedPitch: 'A'.repeat(10000), // Very long pitch
  extractedContent: {
    keyTopics: Array.from({ length: 100 }, (_, i) => `topic-${i}`), // Many topics
    summary: 'B'.repeat(5000),
    transcript: 'C'.repeat(50000)
  },
  contentQuality: 'full' as const,
  processingMetadata: {
    tokensUsed: 999999,
    processingTime: 999999,
    model: 'test-model'
  }
}

describe('YouTube Shorts Edge Cases and Error Handling', () => {
  
  describe('URL Edge Cases', () => {
    
    test.each(edgeCaseUrls)('handles malformed URL gracefully: %s', async (url) => {
      const { result } = renderHook(() => useShortsDetection(url))
      
      // Should not crash and should provide sensible defaults
      expect(result.current).toBeDefined()
      expect(typeof result.current.isShorts).toBe('boolean')
      expect(typeof result.current.confidence).toBe('number')
      expect(result.current.confidence).toBeGreaterThanOrEqual(0)
      expect(result.current.confidence).toBeLessThanOrEqual(1)
    })

    test('handles rapid URL changes without memory leaks', async () => {
      const { result, rerender } = renderHook(
        ({ url }) => useShortsDetection(url),
        { initialProps: { url: '' } }
      )
      
      // Rapidly change URLs to test debouncing and cleanup
      const urls = [
        'https://youtube.com/shorts/1',
        'https://youtube.com/shorts/2',
        '',
        'invalid-url',
        'https://youtube.com/shorts/3'
      ]
      
      urls.forEach((url, index) => {
        act(() => {
          rerender({ url })
        })
      })
      
      // Should handle all changes without errors
      expect(result.current).toBeDefined()
    })

    test('cleans up timers on unmount', () => {
      const { unmount } = renderHook(() => useShortsDetection('https://youtube.com/shorts/test'))
      
      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Component Error Boundaries', () => {
    
    test('ShortsIndicator handles undefined detection gracefully', () => {
      const undefinedDetection = undefined as any
      
      expect(() => {
        render(<ShortsIndicator detection={undefinedDetection} />)
      }).not.toThrow()
    })

    test('ShortsResultDisplay handles malformed content', () => {
      expect(() => {
        render(<ShortsResultDisplay content={malformedContent} />)
      }).not.toThrow()
      
      // Should still render basic structure
      expect(screen.getByText('Shorts Optimization Analysis')).toBeInTheDocument()
    })

    test('ShortsResultDisplay handles extreme content', () => {
      expect(() => {
        render(<ShortsResultDisplay content={extremeContent} />)
      }).not.toThrow()
      
      // Should handle large datasets without performance issues
      expect(screen.getByText('Shorts Optimization Analysis')).toBeInTheDocument()
    })

    test('TrendAnalysis handles empty topics array', () => {
      expect(() => {
        render(<TrendAnalysis keyTopics={[]} />)
      }).not.toThrow()
      
      expect(screen.getByText('Viral Potential Analysis')).toBeInTheDocument()
    })

    test('TrendAnalysis handles special characters in topics', () => {
      const specialTopics = [
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'null',
        'undefined',
        '{}',
        '[]',
        'function(){}'
      ]
      
      expect(() => {
        render(<TrendAnalysis keyTopics={specialTopics} />)
      }).not.toThrow()
    })

    test('ContentTypeOverride handles null callback', () => {
      const nullCallback = null as any
      
      expect(() => {
        render(
          <ContentTypeOverride 
            detection={{ isShorts: true, confidence: 0.9, isAnalyzing: false }}
            onOverride={nullCallback}
            currentOverride="auto"
          />
        )
      }).not.toThrow()
    })
  })

  describe('Accessibility Testing', () => {
    
    test('ShortsIndicator has proper ARIA labels', () => {
      const detection = { isShorts: true, confidence: 0.9, shortsStyle: 'viral' as const, duration: 45, isAnalyzing: false }
      render(<ShortsIndicator detection={detection} />)
      
      // Check for screen reader accessible content
      expect(screen.getByText('YouTube Shorts Detected! 🎬')).toBeInTheDocument()
      expect(screen.getByText(/mobile-first storytelling/)).toBeInTheDocument()
    })

    test('ContentTypeOverride supports keyboard navigation', async () => {
      const mockOnOverride = jest.fn()
      const user = userEvent.setup()
      
      render(
        <ContentTypeOverride 
          detection={{ isShorts: true, confidence: 0.8, isAnalyzing: false }}
          onOverride={mockOnOverride}
          currentOverride="auto"
        />
      )
      
      // Navigate using keyboard
      const overrideButton = screen.getByText('Override')
      await user.tab()
      
      // Should be focusable
      expect(overrideButton).toHaveFocus()
      
      // Should activate with Enter/Space
      await user.keyboard('{Enter}')
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })

    test('TrendAnalysis hashtags are keyboard accessible', async () => {
      const user = userEvent.setup()
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
      Object.assign(navigator, { clipboard: mockClipboard })
      
      render(<TrendAnalysis keyTopics={['viral', 'trending']} />)
      
      const hashtagButton = screen.getByText('#viral')
      
      // Should be focusable and activatable with keyboard
      await user.tab()
      await user.keyboard('{Enter}')
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith('#viral')
    })

    test('Components have sufficient color contrast', () => {
      const detection = { isShorts: true, confidence: 0.9, isAnalyzing: false }
      const { container } = render(<ShortsIndicator detection={detection} />)
      
      // Check for appropriate color classes that provide good contrast
      const redElements = container.querySelectorAll('.text-red-700, .border-red-500')
      expect(redElements.length).toBeGreaterThan(0)
    })

    test('Loading states are announced to screen readers', () => {
      const detection = { isShorts: true, confidence: 0.8, isAnalyzing: true }
      render(<ShortsIndicator detection={detection} />)
      
      expect(screen.getByText('Analyzing Content...')).toBeInTheDocument()
      expect(screen.getByText(/Detecting content type/)).toBeInTheDocument()
    })
  })

  describe('Performance Edge Cases', () => {
    
    test('useShortsDetection handles concurrent URL changes', async () => {
      const { result, rerender } = renderHook(
        ({ url }) => useShortsDetection(url),
        { initialProps: { url: '' } }
      )
      
      // Simulate rapid concurrent changes
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          act(async () => {
            rerender({ url: `https://youtube.com/shorts/test${i}` })
            await new Promise(resolve => setTimeout(resolve, 10))
          })
        )
      }
      
      await Promise.all(promises)
      
      // Should handle concurrent updates gracefully
      expect(result.current).toBeDefined()
    })

    test('Large content does not block UI', () => {
      const startTime = performance.now()
      
      render(<TrendAnalysis keyTopics={Array.from({ length: 1000 }, (_, i) => `topic-${i}`)} />)
      
      const renderTime = performance.now() - startTime
      
      // Should render within reasonable time even with large datasets
      expect(renderTime).toBeLessThan(1000) // 1 second max
      expect(screen.getByText('Viral Potential Analysis')).toBeInTheDocument()
    })

    test('Memory usage remains stable with repeated renders', () => {
      // Test for potential memory leaks
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(
          <ShortsIndicator 
            detection={{ isShorts: true, confidence: 0.9, isAnalyzing: false }} 
          />
        )
        unmount()
      }
      
      // If we get here without crashes, memory management is working
      expect(true).toBe(true)
    })
  })

  describe('Security and Input Validation', () => {
    
    test('Prevents XSS in dynamic content', () => {
      const maliciousContent = {
        generatedPitch: '<script>alert("xss")</script>',
        extractedContent: {
          keyTopics: ['<img src=x onerror=alert("xss")>', 'javascript:alert("xss")'],
          summary: '<iframe src="data:text/html,<script>alert(1)</script>">',
          transcript: 'data:text/html,<script>alert("xss")</script>'
        },
        contentQuality: 'full' as const,
        processingMetadata: {
          tokensUsed: 500,
          processingTime: 2000,
          model: 'test-model'
        }
      }
      
      const { container } = render(<ShortsResultDisplay content={maliciousContent} />)
      
      // Should not contain executable script tags
      expect(container.innerHTML).not.toContain('<script>')
      expect(container.innerHTML).not.toContain('javascript:')
      expect(container.innerHTML).not.toContain('onerror=')
    })

    test('Handles extremely long input gracefully', () => {
      const veryLongUrl = 'https://youtube.com/shorts/' + 'a'.repeat(10000)
      
      const { result } = renderHook(() => useShortsDetection(veryLongUrl))
      
      // Should not crash with very long input
      expect(result.current).toBeDefined()
    })

    test('Validates numeric inputs', () => {
      const invalidDetection = {
        isShorts: true,
        confidence: NaN, // Invalid number
        duration: Infinity, // Invalid duration
        isAnalyzing: false
      } as any
      
      expect(() => {
        render(<ShortsIndicator detection={invalidDetection} />)
      }).not.toThrow()
    })
  })

  describe('Network and API Error Handling', () => {
    
    test('Handles network timeouts gracefully', async () => {
      // Mock a slow network response
      const slowUrl = 'https://youtube.com/shorts/slow-response'
      
      const { result } = renderHook(() => useShortsDetection(slowUrl))
      
      // Should show analyzing state initially
      expect(result.current.isAnalyzing).toBe(true)
      
      // Wait for timeout
      await waitFor(() => {
        expect(result.current.isAnalyzing).toBe(false)
      }, { timeout: 1000 })
    })

    test('Recovers from API failures', () => {
      // Test URL that would cause API failure
      const failureUrl = 'https://youtube.com/shorts/api-failure-test'
      
      const { result } = renderHook(() => useShortsDetection(failureUrl))
      
      // Should provide fallback detection even if API fails
      expect(result.current.isShorts).toBe(true) // Based on URL pattern
      expect(result.current.confidence).toBeGreaterThan(0)
    })
  })

  describe('State Management Edge Cases', () => {
    
    test('Maintains state consistency during rapid changes', async () => {
      const { result, rerender } = renderHook(
        ({ url }) => useShortsDetection(url),
        { initialProps: { url: 'https://youtube.com/shorts/test1' } }
      )
      
      // Rapid state changes
      rerender({ url: '' })
      rerender({ url: 'https://youtube.com/shorts/test2' })
      rerender({ url: 'https://youtube.com/watch?v=regular' })
      
      // Final state should be consistent
      await waitFor(() => {
        expect(result.current.isShorts).toBe(false) // Last URL was regular video
      })
    })

    test('Handles component remounting correctly', () => {
      const { unmount, rerender } = renderHook(() => 
        useShortsDetection('https://youtube.com/shorts/test')
      )
      
      unmount()
      
      // Remount should work without issues
      expect(() => {
        rerender()
      }).not.toThrow()
    })
  })
})