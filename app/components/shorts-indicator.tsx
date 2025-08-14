import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Youtube, Sparkles, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ShortsDetectionState, ShortsStyle } from '@/app/hooks/useShortsDetection'

interface ShortsIndicatorProps {
  detection: ShortsDetectionState
  className?: string
}

const SHORTS_STYLE_CONFIG = {
  quick_tips: { label: 'Quick Tips', icon: Zap, color: 'blue' },
  story: { label: 'Story', icon: Youtube, color: 'purple' },
  viral: { label: 'Viral', icon: Sparkles, color: 'red' },
  educational: { label: 'Educational', icon: Clock, color: 'green' },
  entertainment: { label: 'Entertainment', icon: Youtube, color: 'orange' }
}

export function ShortsIndicator({ detection, className }: ShortsIndicatorProps) {
  if (!detection.isShorts && !detection.isAnalyzing) return null

  const styleConfig = detection.shortsStyle ? SHORTS_STYLE_CONFIG[detection.shortsStyle] : null
  const Icon = styleConfig?.icon || Youtube

  return (
    <div className={cn("space-y-3", className)}>
      {/* Shorts Badge */}
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={cn(
            "transition-all duration-300 flex items-center gap-1",
            detection.confidence > 0.8 
              ? "border-red-500 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300" 
              : "border-orange-500 text-orange-700 bg-orange-50 dark:bg-orange-950 dark:text-orange-300",
            detection.isAnalyzing && "animate-pulse"
          )}
        >
          <Youtube className="w-3 h-3" />
          YouTube Shorts
          {detection.shortsStyle && styleConfig && (
            <span className="text-xs">• {styleConfig.label}</span>
          )}
        </Badge>

        {detection.duration && (
          <Badge variant="secondary" className="text-xs">
            ~{detection.duration}s
          </Badge>
        )}
      </div>

      {/* Shorts Detection Alert */}
      {detection.isShorts && !detection.isAnalyzing && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <Icon className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle className="text-red-800 dark:text-red-200">
            YouTube Shorts Detected! 🎬
          </AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-300">
            Optimizing for short-form content. We'll focus on quick hooks, viral elements, 
            and mobile-first storytelling to create an engaging pitch.
          </AlertDescription>
        </Alert>
      )}

      {/* Analyzing State */}
      {detection.isAnalyzing && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">
            Analyzing Content...
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            Detecting content type and optimizing processing strategy.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}