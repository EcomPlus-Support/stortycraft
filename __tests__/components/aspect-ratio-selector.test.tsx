/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AspectRatioSelector } from '@/app/components/aspect-ratio-selector'
import { ASPECT_RATIOS } from '@/app/constants/aspectRatios'

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick, onMouseEnter, onMouseLeave, ...props }: any) => (
    <div 
      className={className} 
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-testid="aspect-ratio-card"
      {...props}
    >
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className} data-testid="card-content">{children}</div>
  ),
}))

jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}))

describe('AspectRatioSelector', () => {
  const mockOnSelect = jest.fn()
  const defaultProps = {
    onSelect: mockOnSelect,
  }

  beforeEach(() => {
    mockOnSelect.mockClear()
  })

  it('renders all available aspect ratios', () => {
    render(<AspectRatioSelector {...defaultProps} />)
    
    // Should render title
    expect(screen.getByText('Select Aspect Ratio')).toBeInTheDocument()
    
    // Should render exactly 2 aspect ratio cards (16:9 and 9:16)
    const cards = screen.getAllByTestId('aspect-ratio-card')
    expect(cards).toHaveLength(2)
    expect(ASPECT_RATIOS).toHaveLength(2)
    
    // Check that each aspect ratio label is present
    ASPECT_RATIOS.forEach(ratio => {
      expect(screen.getByText(ratio.label)).toBeInTheDocument()
      if (ratio.description) {
        expect(screen.getByText(ratio.description)).toBeInTheDocument()
      }
      expect(screen.getByText(`${ratio.width}:${ratio.height}`)).toBeInTheDocument()
    })
    
    // Verify we have both 16:9 and 9:16
    expect(screen.getByText('16:9 Widescreen')).toBeInTheDocument()
    expect(screen.getByText('9:16 Portrait')).toBeInTheDocument()
  })

  it('shows selected aspect ratio correctly', () => {
    const selectedRatio = ASPECT_RATIOS[0]
    render(
      <AspectRatioSelector 
        {...defaultProps} 
        selectedRatio={selectedRatio}
      />
    )
    
    // Should show selected text at bottom
    expect(screen.getByText(`Selected: ${selectedRatio.label} (${selectedRatio.width}:${selectedRatio.height})`)).toBeInTheDocument()
  })

  it('calls onSelect when an aspect ratio is clicked', async () => {
    const user = userEvent.setup()
    render(<AspectRatioSelector {...defaultProps} />)
    
    const cards = screen.getAllByTestId('aspect-ratio-card')
    await user.click(cards[1])
    
    expect(mockOnSelect).toHaveBeenCalledWith(ASPECT_RATIOS[1])
    expect(mockOnSelect).toHaveBeenCalledTimes(1)
  })

  it('does not call onSelect when disabled', async () => {
    const user = userEvent.setup()
    render(<AspectRatioSelector {...defaultProps} disabled />)
    
    const cards = screen.getAllByTestId('aspect-ratio-card')
    await user.click(cards[0])
    
    expect(mockOnSelect).not.toHaveBeenCalled()
  })

  it('applies correct CSS classes for selected state', () => {
    const selectedRatio = ASPECT_RATIOS[1]
    render(
      <AspectRatioSelector 
        {...defaultProps} 
        selectedRatio={selectedRatio}
      />
    )
    
    const cards = screen.getAllByTestId('aspect-ratio-card')
    
    // First card should not have selected class
    expect(cards[0]).not.toHaveClass('ring-2 ring-primary bg-primary/5')
    
    // Second card should have selected class
    expect(cards[1]).toHaveClass('ring-2 ring-primary bg-primary/5')
  })

  it('applies disabled styling when disabled', () => {
    render(<AspectRatioSelector {...defaultProps} disabled />)
    
    const cards = screen.getAllByTestId('aspect-ratio-card')
    cards.forEach(card => {
      expect(card).toHaveClass('opacity-50 cursor-not-allowed')
    })
  })

  it('shows hover effects on mouse enter/leave', async () => {
    render(<AspectRatioSelector {...defaultProps} />)
    
    const cards = screen.getAllByTestId('aspect-ratio-card')
    const firstCard = cards[0]
    
    // Mouse enter should add hover class
    fireEvent.mouseEnter(firstCard)
    await waitFor(() => {
      expect(firstCard).toHaveClass('ring-1 ring-primary/50')
    })
    
    // Mouse leave should remove hover class
    fireEvent.mouseLeave(firstCard)
    await waitFor(() => {
      expect(firstCard).not.toHaveClass('ring-1 ring-primary/50')
    })
  })

  it('shows preview when showPreview is true', () => {
    render(<AspectRatioSelector {...defaultProps} showPreview={true} />)
    
    // Should show aspect ratio icons
    ASPECT_RATIOS.forEach(ratio => {
      expect(screen.getByText(ratio.icon)).toBeInTheDocument()
    })
  })

  it('hides preview when showPreview is false', () => {
    render(<AspectRatioSelector {...defaultProps} showPreview={false} />)
    
    // Should not show aspect ratio icons in preview divs
    const previewDivs = screen.queryByRole('img')
    expect(previewDivs).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const customClass = 'custom-selector-class'
    const { container } = render(
      <AspectRatioSelector {...defaultProps} className={customClass} />
    )
    
    const rootElement = container.firstChild as HTMLElement
    expect(rootElement).toHaveClass(customClass)
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<AspectRatioSelector {...defaultProps} />)
    
    const cards = screen.getAllByTestId('aspect-ratio-card')
    
    // Focus first card and press Enter
    cards[0].focus()
    await user.keyboard('{Enter}')
    
    expect(mockOnSelect).toHaveBeenCalledWith(ASPECT_RATIOS[0])
  })

  it('displays correct aspect ratio information', () => {
    render(<AspectRatioSelector {...defaultProps} />)
    
    // Test 16:9 widescreen aspect ratio
    const widescreen = ASPECT_RATIOS.find(ar => ar.id === '16:9')
    expect(widescreen).toBeDefined()
    expect(screen.getByText(widescreen!.label)).toBeInTheDocument()
    expect(screen.getByText(widescreen!.description!)).toBeInTheDocument()
    expect(screen.getByText(widescreen!.icon!)).toBeInTheDocument()
    expect(screen.getByText('16:9')).toBeInTheDocument()
    
    // Test 9:16 portrait aspect ratio
    const portrait = ASPECT_RATIOS.find(ar => ar.id === '9:16')
    expect(portrait).toBeDefined()
    expect(screen.getByText(portrait!.label)).toBeInTheDocument()
    expect(screen.getByText(portrait!.description!)).toBeInTheDocument()
    expect(screen.getByText(portrait!.icon!)).toBeInTheDocument()
    expect(screen.getByText('9:16')).toBeInTheDocument()
  })

  it('handles the simplified two-option layout properly', () => {
    render(<AspectRatioSelector {...defaultProps} />)
    
    // Should only have exactly 2 options
    const cards = screen.getAllByTestId('aspect-ratio-card')
    expect(cards).toHaveLength(2)
    
    // Verify both required aspect ratios are present
    expect(screen.getByText('16:9 Widescreen')).toBeInTheDocument()
    expect(screen.getByText('9:16 Portrait')).toBeInTheDocument()
    
    // Verify descriptions are present
    expect(screen.getByText('Standard widescreen format for movies and TV')).toBeInTheDocument()
    expect(screen.getByText('Vertical format for mobile and social media')).toBeInTheDocument()
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<AspectRatioSelector {...defaultProps} />)
      
      const cards = screen.getAllByTestId('aspect-ratio-card')
      cards.forEach(card => {
        expect(card).toHaveAttribute('role', 'button')
        expect(card).toHaveAttribute('tabIndex', '0')
      })
    })

    it('supports screen readers', () => {
      render(<AspectRatioSelector {...defaultProps} />)
      
      // Check for descriptive text
      expect(screen.getByText('Select Aspect Ratio')).toBeInTheDocument()
      
      // Each ratio should have descriptive information
      ASPECT_RATIOS.forEach(ratio => {
        expect(screen.getByText(ratio.label)).toBeInTheDocument()
        expect(screen.getByText(`${ratio.width}:${ratio.height}`)).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<AspectRatioSelector {...defaultProps} />)
      
      // Re-render with same props
      rerender(<AspectRatioSelector {...defaultProps} />)
      
      // Should still show exactly 2 aspect ratios
      expect(screen.getAllByTestId('aspect-ratio-card')).toHaveLength(2)
    })

    it('renders the simplified selector efficiently', () => {
      const startTime = performance.now()
      render(<AspectRatioSelector {...defaultProps} />)
      const endTime = performance.now()
      
      // Should render very quickly with only 2 options (under 50ms)
      expect(endTime - startTime).toBeLessThan(50)
    })
  })
})