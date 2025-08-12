'use client'

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { VideoPlayer } from "./video-player"
import { Loader2, Video, Maximize2 } from 'lucide-react'
import { type AspectRatio } from '../types'

interface VideoTabProps {
  videoUri: string | null
  aspectRatio?: AspectRatio
  isVideoLoading: boolean
  withVoiceOver: boolean
  setWithVoiceOver: (value: boolean) => void
  onEditVideo: () => Promise<void>
  scenes: Array<{ videoUri?: string | Promise<string> }>
  generatingScenes: Set<number>
}

export function VideoTab({
  videoUri,
  aspectRatio,
  isVideoLoading,
  withVoiceOver,
  setWithVoiceOver,
  onEditVideo,
  scenes,
  generatingScenes
}: VideoTabProps) {
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
              Final video will be rendered in {aspectRatio.description?.toLowerCase()}
            </span>
          </div>
        )}
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="withVocieover" 
              checked={withVoiceOver} 
              onCheckedChange={(checked) => {
                const isChecked = typeof checked === "boolean" ? checked : false;
                setWithVoiceOver(isChecked);
              }} 
            />
            <label
              htmlFor="withVocieover"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Voiceover
            </label>
          </div>
          
          <Button
            onClick={onEditVideo}
            disabled={isVideoLoading || scenes.length === 0 || !scenes.every((scene) => typeof scene.videoUri === 'string') || generatingScenes.size > 0} 
            className="bg-purple-500 text-primary-foreground hover:bg-purple-600"
          >
            {isVideoLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Editing Final Video...
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" />
                Edit Final Video
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Video player with aspect ratio support */}
      {videoUri && (
        <div className="mb-8">
          <VideoPlayer 
            src={videoUri} 
            aspectRatio={aspectRatio}
            showAspectRatioLabel={true}
          />
        </div>
      )}
      
      {!videoUri && (
        <div className="text-center py-12 text-muted-foreground">
          <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Generate and edit your final video to see it here</p>
        </div>
      )}
    </div>
  )
} 