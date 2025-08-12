'use client'

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SceneData } from './scene-data'
import { ResponsiveSceneGrid } from './responsive-scene-grid'
import { Loader2, FileSlidersIcon as Slideshow, Video, Maximize2 } from 'lucide-react'
import { Scene, type AspectRatio } from "../types"
import { SlideshowModal } from './slideshow-modal'
import { useState } from 'react'
import { type UserFriendlyError } from '@/lib/error-utils'
import { ErrorDisplay } from '@/components/ui/error-display'

interface StoryboardTabProps {
  scenes: Scene[]
  aspectRatio?: AspectRatio
  isLoading: boolean
  isVideoLoading: boolean
  generatingScenes: Set<number>
  errorMessage: UserFriendlyError | null
  onRegenerateAllImages: () => Promise<void>
  onGenerateAllVideos: () => Promise<void>
  onUpdateScene: (index: number, updatedScene: Scene) => void
  onRegenerateImage: (index: number) => Promise<void>
  onGenerateVideo: (index: number) => Promise<void>
  onUploadImage: (index: number, file: File) => Promise<void>
  onStartOver: () => void
}

export function StoryboardTab({
  scenes,
  aspectRatio,
  isLoading,
  isVideoLoading,
  generatingScenes,
  errorMessage,
  onRegenerateAllImages,
  onGenerateAllVideos,
  onUpdateScene,
  onRegenerateImage,
  onGenerateVideo,
  onUploadImage,
  onStartOver: _onStartOver,
}: StoryboardTabProps) {
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false)

  return (
    <div className="space-y-8">
      {/* Header with aspect ratio info and controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Aspect ratio info */}
        {aspectRatio && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Maximize2 className="h-3 w-3" />
              {aspectRatio.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {aspectRatio.description}
            </span>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setIsSlideshowOpen(true)}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            disabled={scenes.length === 0}
            size="sm"
          >
            <Slideshow className="mr-2 h-4 w-4" />
            Start Slideshow
          </Button>
          <Button 
            onClick={onRegenerateAllImages} 
            disabled={isLoading || generatingScenes.size > 0}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              'Generate Storyboard Images'
            )}
          </Button>
          <Button
            onClick={onGenerateAllVideos}
            disabled={isVideoLoading || scenes.length === 0 || generatingScenes.size > 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            size="sm"
          >
            {isVideoLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Videos...
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" />
                Generate Videos
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Responsive scene grid */}
      <ResponsiveSceneGrid 
        aspectRatio={aspectRatio}
        itemCount={scenes.length}
      >
        {scenes.map((scene, index) => (
          <SceneData
            key={index}
            sceneNumber={index + 1}
            scene={scene}
            aspectRatio={aspectRatio}
            onUpdate={(updatedScene) => onUpdateScene(index, updatedScene)}
            onRegenerateImage={() => onRegenerateImage(index)}
            onGenerateVideo={() => onGenerateVideo(index)}
            onUploadImage={(file) => onUploadImage(index, file)}
            isGenerating={generatingScenes.has(index)}
          />
        ))}
      </ResponsiveSceneGrid>
      {errorMessage && (
        <ErrorDisplay error={errorMessage} className="mt-4" />
      )}
      {scenes.length > 0 && (
        <SlideshowModal
          scenes={scenes}
          aspectRatio={aspectRatio}
          isOpen={isSlideshowOpen}
          onClose={() => setIsSlideshowOpen(false)}
        />
      )}
    </div>
  )
} 