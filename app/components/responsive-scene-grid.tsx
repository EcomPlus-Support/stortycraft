'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { type AspectRatio } from '../types'

interface ResponsiveSceneGridProps {
  aspectRatio?: AspectRatio
  children: ReactNode
  className?: string
  itemCount?: number
}

export function ResponsiveSceneGrid({
  aspectRatio,
  children,
  className,
  itemCount = 1
}: ResponsiveSceneGridProps) {
  // Determine optimal grid layout based on aspect ratio and item count
  const getGridLayout = () => {
    if (!aspectRatio) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    
    const ratio = aspectRatio.ratio
    
    // For portrait ratios (< 1), use fewer columns to prevent too narrow items
    if (ratio < 1) {
      if (itemCount <= 2) return 'grid-cols-1 md:grid-cols-2'
      if (itemCount <= 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2'
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    }
    
    // For square ratio (= 1), use standard grid
    if (ratio === 1) {
      if (itemCount <= 4) return 'grid-cols-1 md:grid-cols-2'
      if (itemCount <= 9) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    }
    
    // For landscape ratios (> 1), can use more columns for wider items
    if (ratio <= 16/9) {
      if (itemCount <= 2) return 'grid-cols-1 md:grid-cols-2'
      if (itemCount <= 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    }
    
    // For ultrawide ratios (> 16/9), limit columns to prevent too small items
    if (itemCount <= 2) return 'grid-cols-1'
    if (itemCount <= 4) return 'grid-cols-1 md:grid-cols-2'
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  }
  
  // Determine gap based on aspect ratio
  const getGapClass = () => {
    if (!aspectRatio) return 'gap-6'
    
    const ratio = aspectRatio.ratio
    
    if (ratio < 0.6) return 'gap-4' // Tight vertical spacing for very tall items
    if (ratio < 1) return 'gap-5'   // Medium spacing for portrait
    if (ratio === 1) return 'gap-6' // Standard spacing for square
    if (ratio <= 16/9) return 'gap-6' // Standard spacing for standard landscape
    return 'gap-8' // More spacing for ultrawide to prevent cramping
  }

  return (
    <div 
      className={cn(
        'grid w-full',
        getGridLayout(),
        getGapClass(),
        className
      )}
    >
      {children}
    </div>
  )
}