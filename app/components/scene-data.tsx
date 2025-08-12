'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, RefreshCw, Video, Upload, Loader2, Maximize2 } from 'lucide-react'
import { EditSceneModal } from './edit-scene-modal'
import { AspectRatioContainer } from './aspect-ratio-container'
import Image from 'next/image'
import { VideoPlayer } from "./video-player"
import { Scene, type AspectRatio } from '../types'
import { cn } from '@/lib/utils'

interface SceneDataProps {
  scene: Scene;
  sceneNumber: number;
  aspectRatio?: AspectRatio;
  onUpdate: (updatedScene: SceneDataProps['scene']) => void;
  onRegenerateImage: () => void;
  onGenerateVideo: () => void;
  onUploadImage: (file: File) => void;
  isGenerating: boolean;
  showAspectRatioControls?: boolean;
}

export function SceneData({
  scene,
  sceneNumber,
  aspectRatio,
  onUpdate,
  onRegenerateImage,
  onGenerateVideo,
  onUploadImage,
  isGenerating,
  showAspectRatioControls: _showAspectRatioControls = false,
}: SceneDataProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    const getVideoUrl = async () => {
        console.log('Video URL change!')
        if (typeof scene.videoUri === 'string') {
          setVideoUrl(scene.videoUri);
        } else if (scene.videoUri instanceof Promise) {
          try {
            const resolvedUrl = await scene.videoUri;
            setVideoUrl(resolvedUrl);
          } catch (error) {
            console.error('Error resolving video URL:', error);
            setVideoUrl(null); // or some default error URL
          }
        } else {
          setVideoUrl(null);
        }
    }

    getVideoUrl();
  }, [scene.videoUri]);
  
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUploadImage(file)
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col">
        <AspectRatioContainer 
          aspectRatio={aspectRatio}
          className="relative group"
        >
          {isGenerating && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
          
          {/* Aspect ratio badge */}
          {aspectRatio && (
            <div className="absolute top-2 left-2 z-10">
              <Badge variant="secondary" className="bg-black/70 text-white border-0">
                <Maximize2 className="h-3 w-3 mr-1" />
                {aspectRatio.id}
              </Badge>
            </div>
          )}
          
          {videoUrl ? (
            <div className="absolute inset-0">
              <VideoPlayer 
                src={videoUrl} 
                aspectRatio={aspectRatio}
                className="h-full w-full"
              />
            </div>
          ) : scene.imageBase64 ? (
            <Image
              src={`data:image/png;base64,${scene.imageBase64}`}
              alt={`Scene ${sceneNumber}`}
              className="absolute inset-0 w-full h-full object-cover object-center"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder.svg";
                target.onerror = null; // Prevent infinite loop
              }}
            />
          ) : (
            <Image
              src='/placeholder.svg'
              alt={`Scene ${sceneNumber}`}
              className="absolute inset-0 w-full h-full object-cover object-center"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder.svg";
                target.onerror = null; // Prevent infinite loop
              }}
            />
          )}
          
          {/* Control buttons */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button
              variant="secondary"
              size="icon"
              className="bg-black/50 hover:bg-blue-500 hover:text-white"
              onClick={onGenerateVideo}
              disabled={isGenerating}
            >
              <Video className="h-4 w-4" />
              <span className="sr-only">Generate video for scene</span>
            </Button>
          </div>
          
          <div className={cn(
            "absolute top-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10",
            aspectRatio ? "left-2 mt-8" : "left-2" // Adjust position if aspect ratio badge is present
          )}>
            <Button
              variant="secondary"
              size="icon"
              className="bg-black/50 hover:bg-red-500 hover:text-white"
              onClick={onRegenerateImage}
              disabled={isGenerating}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Regenerate image</span>
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="bg-black/50 hover:bg-green-500 hover:text-white"
              onClick={handleUploadClick}
              disabled={isGenerating}
            >
              <Upload className="h-4 w-4" />
              <span className="sr-only">Upload image</span>
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>
        </AspectRatioContainer>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-primary">Scene {sceneNumber}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="text-secondary hover:text-primary hover:bg-primary/10"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{scene.description}</p>
        </CardContent>
      </div>
      <EditSceneModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        scene={scene}
        sceneNumber={sceneNumber}
        onUpdate={onUpdate}
      />
    </Card>
  )
}