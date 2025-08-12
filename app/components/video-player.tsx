"use client"

import { useRef, useEffect } from "react"
import { AspectRatioContainer } from './aspect-ratio-container'
import { type AspectRatio } from '../types'
import { cn } from '@/lib/utils'

interface VideoPlayerProps {
  src: string
  aspectRatio?: AspectRatio
  className?: string
  showAspectRatioLabel?: boolean
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
}

export function VideoPlayer({ 
  src, 
  aspectRatio,
  className,
  showAspectRatioLabel = false,
  autoPlay = false,
  muted = false,
  loop = false
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
    }
  }, [src])

  const videoElement = (
    <video 
      ref={videoRef} 
      controls 
      autoPlay={autoPlay}
      muted={muted || autoPlay} // Auto-mute if autoPlay is enabled
      loop={loop}
      className="w-full h-full object-cover rounded-lg"
      style={{ objectFit: 'cover' }}
    >
      <source src={src} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  )

  if (aspectRatio) {
    return (
      <div className={cn('w-full max-w-3xl mx-auto', className)}>
        <AspectRatioContainer 
          aspectRatio={aspectRatio}
          showLabel={showAspectRatioLabel}
          className="rounded-lg overflow-hidden shadow-lg"
        >
          {videoElement}
        </AspectRatioContainer>
      </div>
    )
  }

  return (
    <div className={cn('w-full max-w-3xl mx-auto', className)}>
      <div className="rounded-lg overflow-hidden shadow-lg">
        {videoElement}
      </div>
    </div>
  )
}

