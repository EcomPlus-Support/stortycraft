'use client'

import { AspectRatioContainer } from './aspect-ratio-container'
import { type AspectRatio } from '../types'
import { cn } from '@/lib/utils'
import { Loader2, Maximize2 } from 'lucide-react'

interface AspectRatioLoadingProps {
  aspectRatio?: AspectRatio
  className?: string
  message?: string
  showIcon?: boolean
}

export function AspectRatioLoading({
  aspectRatio,
  className,
  message = 'Loading...',
  showIcon = true
}: AspectRatioLoadingProps) {
  return (
    <AspectRatioContainer
      aspectRatio={aspectRatio}
      className={className}
      showBorder={true}
    >
      <div className="absolute inset-0 bg-muted/50 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          {showIcon && <Loader2 className="h-6 w-6 animate-spin" />}
          <span className="text-sm font-medium">{message}</span>
        </div>
        {aspectRatio && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Maximize2 className="h-3 w-3" />
            <span>Adjusting to {aspectRatio.label}</span>
          </div>
        )}
      </div>
    </AspectRatioContainer>
  )
}

interface AspectRatioSkeletonProps {
  aspectRatio?: AspectRatio
  className?: string
  animated?: boolean
}

export function AspectRatioSkeleton({
  aspectRatio,
  className,
  animated = true
}: AspectRatioSkeletonProps) {
  return (
    <AspectRatioContainer
      aspectRatio={aspectRatio}
      className={className}
    >
      <div 
        className={cn(
          'absolute inset-0 bg-muted rounded',
          animated && 'animate-pulse'
        )}
      >
        {/* Skeleton content lines */}
        <div className="absolute inset-4 space-y-2">
          <div className="h-3 bg-muted-foreground/20 rounded" />
          <div className="h-3 bg-muted-foreground/20 rounded w-3/4" />
          <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
        </div>
        
        {/* Skeleton control buttons */}
        <div className="absolute top-2 right-2 flex gap-1">
          <div className="w-8 h-8 bg-muted-foreground/20 rounded" />
          <div className="w-8 h-8 bg-muted-foreground/20 rounded" />
        </div>
      </div>
    </AspectRatioContainer>
  )
}