import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Smartphone, TrendingUp, Zap, Eye, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReferenceContent } from '@/app/actions/process-reference'

interface ShortsResultDisplayProps {
  content: ReferenceContent
  className?: string
}

const VIRAL_KEYWORDS = [
  'hook', 'attention', 'viral', 'trending', 'engagement', 
  'quick', 'instant', 'grab', 'catch', 'wow'
]

const SHORTS_INSIGHTS = {
  hook_strength: 'Strong opening to grab attention',
  viral_potential: 'High shareability factor',
  mobile_optimized: 'Perfect for mobile viewing',
  quick_consumption: 'Digestible in under 60 seconds',
  engagement_focused: 'Designed for likes and shares'
}

export function ShortsResultDisplay({ content, className }: ShortsResultDisplayProps) {
  // Analyze pitch for Shorts-specific elements
  const pitch = content.generatedPitch.toLowerCase()
  const hasViralElements = VIRAL_KEYWORDS.some(keyword => pitch.includes(keyword))
  const wordCount = content.generatedPitch.split(' ').length
  const isOptimalLength = wordCount >= 20 && wordCount <= 50 // Optimal for 30-60 second Shorts

  return (
    <div className={cn("space-y-4", className)}>
      {/* Shorts Optimization Score */}
      <Card className="border-red-200 bg-gradient-to-r from-red-50 to-pink-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Smartphone className="w-5 h-5" />
            Shorts Optimization Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Hook Strength */}
            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
              <Zap className={cn(
                "w-4 h-4",
                hasViralElements ? "text-green-500" : "text-yellow-500"
              )} />
              <div>
                <div className="text-xs font-medium">Hook Strength</div>
                <div className="text-xs text-gray-600">
                  {hasViralElements ? "Strong" : "Moderate"}
                </div>
              </div>
            </div>

            {/* Length Optimization */}
            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
              <Eye className={cn(
                "w-4 h-4",
                isOptimalLength ? "text-green-500" : "text-orange-500"
              )} />
              <div>
                <div className="text-xs font-medium">Length</div>
                <div className="text-xs text-gray-600">
                  {wordCount} words {isOptimalLength ? "✓" : "⚠️"}
                </div>
              </div>
            </div>

            {/* Viral Potential */}
            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-xs font-medium">Viral Potential</div>
                <div className="text-xs text-gray-600">
                  {hasViralElements ? "High" : "Medium"}
                </div>
              </div>
            </div>

            {/* Engagement Focus */}
            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
              <Heart className="w-4 h-4 text-red-500" />
              <div>
                <div className="text-xs font-medium">Engagement</div>
                <div className="text-xs text-gray-600">
                  Mobile-First
                </div>
              </div>
            </div>
          </div>

          {/* Optimization Tips */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-red-700">Shorts Optimization Tips:</div>
            <div className="space-y-1">
              {!hasViralElements && (
                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border">
                  💡 Consider adding attention-grabbing words like "instant", "viral", or "trending"
                </div>
              )}
              {!isOptimalLength && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
                  📝 Optimal Shorts pitch: 20-50 words for 30-60 second videos
                </div>
              )}
              <div className="text-xs text-green-600 bg-green-50 p-2 rounded border">
                📱 This pitch is optimized for vertical mobile viewing and quick consumption
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shorts-Specific Key Topics */}
      {content.extractedContent.keyTopics.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Viral Elements Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {content.extractedContent.keyTopics.map((topic, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className={cn(
                    VIRAL_KEYWORDS.some(keyword => topic.toLowerCase().includes(keyword)) &&
                    "border-red-500 text-red-700 bg-red-50"
                  )}
                >
                  {topic}
                  {VIRAL_KEYWORDS.some(keyword => topic.toLowerCase().includes(keyword)) && " 🔥"}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Preview Hint */}
      <Card className="border-gray-200">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Smartphone className="w-4 h-4" />
            <span>This pitch is optimized for vertical 9:16 aspect ratio Shorts content</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}