'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { type AspectRatio } from '../types'
import { getAspectRatioClass } from '../constants/aspectRatios'
import { AspectRatioErrorBoundary } from './aspect-ratio-error-boundary'

interface AspectRatioContainerProps {
  aspectRatio?: AspectRatio
  children: ReactNode
  className?: string
  showBorder?: boolean
  showLabel?: boolean
}

export function AspectRatioContainer({
  aspectRatio,
  children,
  className,
  showBorder = false,
  showLabel = false
}: AspectRatioContainerProps) {
  const aspectClass = getAspectRatioClass(aspectRatio)
  
  // Validate aspect ratio
  if (aspectRatio && (typeof aspectRatio.ratio !== 'number' || aspectRatio.ratio <= 0)) {
    console.error('Invalid aspect ratio:', aspectRatio)
    return (
      <div className={cn('relative w-full aspect-video bg-muted rounded border-2 border-dashed border-destructive/50', className)}>
        <div className="absolute inset-0 flex items-center justify-center text-destructive text-sm">
          Invalid aspect ratio: {aspectRatio?.label || 'Unknown'}
        </div>
      </div>
    )
  }
  
  return (
    <AspectRatioErrorBoundary>
      <div className={cn('relative w-full', className)}>
        {showLabel && aspectRatio && (
          <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {aspectRatio.icon} {aspectRatio.label}
          </div>
        )}
        <div 
          className={cn(
            aspectClass,
            'w-full overflow-hidden',
            showBorder && 'border-2 border-dashed border-gray-300',
            'transition-all duration-300 ease-in-out'
          )}
          style={{
            // Fallback for custom aspect ratios
            aspectRatio: aspectRatio ? `${aspectRatio.width} / ${aspectRatio.height}` : undefined
          }}
        >
          <div className="absolute inset-0">
            {children}
          </div>
        </div>
      </div>
    </AspectRatioErrorBoundary>
  )
}