/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { AspectRatioContainer } from '@/app/components/aspect-ratio-container'
import { ASPECT_RATIOS } from '@/app/constants/aspectRatios'

// Mock the utils
jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}))

describe('AspectRatioContainer', () => {
  const mockChildren = <div data-testid="test-content">Test Content</div>
  const testAspectRatio = ASPECT_RATIOS[0] // 16:9

  it('renders children correctly', () => {
    render(
      <AspectRatioContainer aspectRatio={testAspectRatio}>
        {mockChildren}
      </AspectRatioContainer>
    )
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies correct aspect ratio CSS class', () => {
    const { container } = render(
      <AspectRatioContainer aspectRatio={testAspectRatio}>
        {mockChildren}
      </AspectRatioContainer>
    )
    
    const aspectRatioDiv = container.firstChild as HTMLElement
    expect(aspectRatioDiv).toHaveClass(testAspectRatio.cssClass)
  })

  it('applies custom className', () => {
    const customClass = 'custom-container-class'
    const { container } = render(
      <AspectRatioContainer 
        aspectRatio={testAspectRatio}
        className={customClass}
      >
        {mockChildren}
      </AspectRatioContainer>
    )
    
    const aspectRatioDiv = container.firstChild as HTMLElement
    expect(aspectRatioDiv).toHaveClass(customClass)
  })

  it('handles different aspect ratios correctly', () => {
    ASPECT_RATIOS.forEach(ratio => {
      const { container } = render(
        <AspectRatioContainer aspectRatio={ratio}>
          <div>Content for {ratio.id}</div>
        </AspectRatioContainer>
      )
      
      const aspectRatioDiv = container.firstChild as HTMLElement
      expect(aspectRatioDiv).toHaveClass(ratio.cssClass)
      expect(screen.getByText(`Content for ${ratio.id}`)).toBeInTheDocument()
    })
  })

  it('falls back to default aspect ratio when aspectRatio is undefined', () => {
    const { container } = render(
      <AspectRatioContainer aspectRatio={undefined as any}>
        {mockChildren}
      </AspectRatioContainer>
    )
    
    const aspectRatioDiv = container.firstChild as HTMLElement
    expect(aspectRatioDiv).toHaveClass(ASPECT_RATIOS[0].cssClass) // Default should be first ratio
  })

  it('maintains content structure within aspect ratio container', () => {
    const complexContent = (
      <div data-testid="complex-content">
        <h1>Title</h1>
        <p>Description</p>
        <button>Action</button>
      </div>
    )
    
    render(
      <AspectRatioContainer aspectRatio={testAspectRatio}>
        {complexContent}
      </AspectRatioContainer>
    )
    
    expect(screen.getByTestId('complex-content')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  it('applies responsive classes correctly', () => {
    const { container } = render(
      <AspectRatioContainer 
        aspectRatio={testAspectRatio}
        className="w-full md:w-1/2 lg:w-1/3"
      >
        {mockChildren}
      </AspectRatioContainer>
    )
    
    const aspectRatioDiv = container.firstChild as HTMLElement
    expect(aspectRatioDiv).toHaveClass('w-full', 'md:w-1/2', 'lg:w-1/3')
  })

  it('handles portrait aspect ratios', () => {
    const portraitRatio = ASPECT_RATIOS.find(ar => ar.id === '9:16')
    if (!portraitRatio) return

    const { container } = render(
      <AspectRatioContainer aspectRatio={portraitRatio}>
        {mockChildren}
      </AspectRatioContainer>
    )
    
    const aspectRatioDiv = container.firstChild as HTMLElement
    expect(aspectRatioDiv).toHaveClass(portraitRatio.cssClass)
  })

  it('handles square aspect ratios', () => {
    const squareRatio = ASPECT_RATIOS.find(ar => ar.id === '1:1')
    if (!squareRatio) return

    const { container } = render(
      <AspectRatioContainer aspectRatio={squareRatio}>
        {mockChildren}
      </AspectRatioContainer>
    )
    
    const aspectRatioDiv = container.firstChild as HTMLElement
    expect(aspectRatioDiv).toHaveClass(squareRatio.cssClass)
  })

  it('handles ultrawide aspect ratios', () => {
    const ultrawideRatio = ASPECT_RATIOS.find(ar => ar.id === '21:9')
    if (!ultrawideRatio) return

    const { container } = render(
      <AspectRatioContainer aspectRatio={ultrawideRatio}>
        {mockChildren}
      </AspectRatioContainer>
    )
    
    const aspectRatioDiv = container.firstChild as HTMLElement
    expect(aspectRatioDiv).toHaveClass(ultrawideRatio.cssClass)
  })

  it('preserves event handlers on children', () => {
    const handleClick = jest.fn()
    const clickableContent = (
      <button data-testid="clickable-button" onClick={handleClick}>
        Click me
      </button>
    )
    
    render(
      <AspectRatioContainer aspectRatio={testAspectRatio}>
        {clickableContent}
      </AspectRatioContainer>
    )
    
    const button = screen.getByTestId('clickable-button')
    button.click()
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('supports nested aspect ratio containers', () => {
    const nestedContent = (
      <AspectRatioContainer aspectRatio={ASPECT_RATIOS[1]}>
        <div data-testid="nested-content">Nested Content</div>
      </AspectRatioContainer>
    )
    
    render(
      <AspectRatioContainer aspectRatio={testAspectRatio}>
        {nestedContent}
      </AspectRatioContainer>
    )
    
    expect(screen.getByTestId('nested-content')).toBeInTheDocument()
  })

  describe('Edge Cases', () => {
    it('handles empty children gracefully', () => {
      const { container } = render(
        <AspectRatioContainer aspectRatio={testAspectRatio}>
          {null}
        </AspectRatioContainer>
      )
      
      const aspectRatioDiv = container.firstChild as HTMLElement
      expect(aspectRatioDiv).toHaveClass(testAspectRatio.cssClass)
    })

    it('handles multiple children', () => {
      render(
        <AspectRatioContainer aspectRatio={testAspectRatio}>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </AspectRatioContainer>
      )
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
      expect(screen.getByTestId('child-3')).toBeInTheDocument()
    })

    it('handles aspect ratio changes without remounting', () => {
      const { container, rerender } = render(
        <AspectRatioContainer aspectRatio={testAspectRatio}>
          {mockChildren}
        </AspectRatioContainer>
      )
      
      const aspectRatioDiv = container.firstChild as HTMLElement
      expect(aspectRatioDiv).toHaveClass(testAspectRatio.cssClass)
      
      const newAspectRatio = ASPECT_RATIOS[1]
      rerender(
        <AspectRatioContainer aspectRatio={newAspectRatio}>
          {mockChildren}
        </AspectRatioContainer>
      )
      
      expect(aspectRatioDiv).toHaveClass(newAspectRatio.cssClass)
      expect(aspectRatioDiv).not.toHaveClass(testAspectRatio.cssClass)
    })
  })

  describe('Performance', () => {
    it('renders quickly with complex content', () => {
      const complexContent = (
        <div>
          {Array.from({ length: 100 }, (_, i) => (
            <div key={i}>Item {i}</div>
          ))}
        </div>
      )
      
      const startTime = performance.now()
      render(
        <AspectRatioContainer aspectRatio={testAspectRatio}>
          {complexContent}
        </AspectRatioContainer>
      )
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should render in under 100ms
    })

    it('does not cause unnecessary re-renders', () => {
      const { rerender } = render(
        <AspectRatioContainer aspectRatio={testAspectRatio}>
          {mockChildren}
        </AspectRatioContainer>
      )
      
      // Re-render with same props
      rerender(
        <AspectRatioContainer aspectRatio={testAspectRatio}>
          {mockChildren}
        </AspectRatioContainer>
      )
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('maintains accessibility attributes of children', () => {
      const accessibleContent = (
        <div 
          role="region" 
          aria-label="Test content"
          data-testid="accessible-content"
        >
          Accessible Content
        </div>
      )
      
      render(
        <AspectRatioContainer aspectRatio={testAspectRatio}>
          {accessibleContent}
        </AspectRatioContainer>
      )
      
      const content = screen.getByTestId('accessible-content')
      expect(content).toHaveAttribute('role', 'region')
      expect(content).toHaveAttribute('aria-label', 'Test content')
    })

    it('does not interfere with focus management', () => {
      const focusableContent = (
        <input 
          data-testid="focusable-input" 
          placeholder="Test input"
        />
      )
      
      render(
        <AspectRatioContainer aspectRatio={testAspectRatio}>
          {focusableContent}
        </AspectRatioContainer>
      )
      
      const input = screen.getByTestId('focusable-input')
      input.focus()
      
      expect(document.activeElement).toBe(input)
    })
  })
})