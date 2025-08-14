import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Youtube, Video, Settings, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ShortsDetectionState } from '@/app/hooks/useShortsDetection'

interface ContentTypeOverrideProps {
  detection: ShortsDetectionState
  onOverride: (forceType: 'shorts' | 'video' | 'auto') => void
  currentOverride: 'shorts' | 'video' | 'auto'
  className?: string
}

export function ContentTypeOverride({ 
  detection, 
  onOverride, 
  currentOverride, 
  className 
}: ContentTypeOverrideProps) {
  const [showOverride, setShowOverride] = useState(false)

  if (!detection.isShorts && detection.confidence < 0.5) {
    return null // Don't show override for clearly regular videos
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Override Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium">Content Type</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowOverride(!showOverride)}
          className="text-xs"
        >
          {showOverride ? 'Hide' : 'Override'}
        </Button>
      </div>

      {/* Override Options */}
      {showOverride && (
        <Card className="border-blue-200">
          <CardContent className="pt-4 space-y-3">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Auto-detection: {detection.isShorts ? 'Shorts' : 'Regular Video'} 
                (confidence: {Math.round(detection.confidence * 100)}%)
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-2">
              {/* Auto Detection */}
              <Button
                variant={currentOverride === 'auto' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onOverride('auto')}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <Settings className="w-4 h-4" />
                <span className="text-xs">Auto</span>
              </Button>

              {/* Force Shorts */}
              <Button
                variant={currentOverride === 'shorts' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onOverride('shorts')}
                className={cn(
                  "flex flex-col gap-1 h-auto py-3",
                  currentOverride === 'shorts' && "bg-red-500 hover:bg-red-600"
                )}
              >
                <Youtube className="w-4 h-4" />
                <span className="text-xs">Shorts</span>
              </Button>

              {/* Force Video */}
              <Button
                variant={currentOverride === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onOverride('video')}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <Video className="w-4 h-4" />
                <span className="text-xs">Video</span>
              </Button>
            </div>

            {/* Current Selection Display */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-xs text-gray-600">Processing as:</span>
              <Badge 
                variant="outline" 
                className={cn(
                  currentOverride === 'shorts' || (currentOverride === 'auto' && detection.isShorts)
                    ? "border-red-500 text-red-700"
                    : "border-blue-500 text-blue-700"
                )}
              >
                {currentOverride === 'auto' 
                  ? (detection.isShorts ? 'Shorts (Auto)' : 'Video (Auto)')
                  : currentOverride === 'shorts' 
                    ? 'Shorts (Manual)' 
                    : 'Video (Manual)'
                }
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}