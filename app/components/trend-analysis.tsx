import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Hash, Flame, Star, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendAnalysisProps {
  keyTopics: string[]
  className?: string
}

// Simulated trending data - in production this would come from APIs
const TRENDING_TOPICS = [
  { keyword: 'AI', score: 95, trend: 'rising' },
  { keyword: 'tech', score: 88, trend: 'hot' },
  { keyword: 'tutorial', score: 82, trend: 'stable' },
  { keyword: 'quick', score: 79, trend: 'rising' },
  { keyword: 'tips', score: 75, trend: 'hot' },
  { keyword: 'viral', score: 92, trend: 'hot' },
  { keyword: 'trending', score: 87, trend: 'rising' },
  { keyword: 'hack', score: 73, trend: 'stable' }
]

const VIRAL_HASHTAGS = [
  '#shorts', '#viral', '#trending', '#fyp', '#foryou', 
  '#quicktips', '#hack', '#tutorial', '#ai', '#tech'
]

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'hot': return <Flame className="w-3 h-3 text-red-500" />
    case 'rising': return <TrendingUp className="w-3 h-3 text-green-500" />
    default: return <Star className="w-3 h-3 text-yellow-500" />
  }
}

function analyzeTrendingPotential(topics: string[]): number {
  let score = 0
  topics.forEach(topic => {
    const trendingTopic = TRENDING_TOPICS.find(t => 
      topic.toLowerCase().includes(t.keyword.toLowerCase())
    )
    if (trendingTopic) {
      score += trendingTopic.score
    }
  })
  return Math.min(Math.round(score / topics.length) || 0, 100)
}

export function TrendAnalysis({ keyTopics, className }: TrendAnalysisProps) {
  const trendingScore = analyzeTrendingPotential(keyTopics)
  const matchingTopics = keyTopics.filter(topic => 
    TRENDING_TOPICS.some(t => topic.toLowerCase().includes(t.keyword.toLowerCase()))
  )
  
  const suggestedHashtags = VIRAL_HASHTAGS.filter(hashtag => 
    keyTopics.some(topic => 
      hashtag.toLowerCase().includes(topic.toLowerCase()) ||
      topic.toLowerCase().includes(hashtag.slice(1))
    )
  ).slice(0, 6)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Trending Score */}
      <Card className="border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <TrendingUp className="w-5 h-5" />
            Viral Potential Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Score Display */}
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-purple-600">
              {trendingScore}%
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700">Viral Potential</div>
              <div className={cn(
                "text-xs",
                trendingScore >= 80 ? "text-green-600" :
                trendingScore >= 60 ? "text-yellow-600" : "text-gray-600"
              )}>
                {trendingScore >= 80 ? "High potential for viral reach" :
                 trendingScore >= 60 ? "Good engagement potential" : "Standard reach expected"}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={cn(
                "h-2 rounded-full transition-all duration-500",
                trendingScore >= 80 ? "bg-green-500" :
                trendingScore >= 60 ? "bg-yellow-500" : "bg-gray-400"
              )}
              style={{ width: `${trendingScore}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Trending Topics Match */}
      {matchingTopics.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Flame className="w-4 h-4 text-red-500" />
              Trending Topics Match
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matchingTopics.map((topic, index) => {
                const trendData = TRENDING_TOPICS.find(t => 
                  topic.toLowerCase().includes(t.keyword.toLowerCase())
                )
                return (
                  <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded border">
                    <div className="flex items-center gap-2">
                      {trendData && getTrendIcon(trendData.trend)}
                      <span className="text-sm font-medium">{topic}</span>
                    </div>
                    {trendData && (
                      <Badge variant="outline" className="border-red-500 text-red-700">
                        {trendData.score}% trending
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggested Hashtags */}
      {suggestedHashtags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Hash className="w-4 h-4 text-blue-500" />
              Suggested Viral Hashtags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {suggestedHashtags.map((hashtag, index) => (
                <Badge 
                  key={index}
                  variant="outline" 
                  className="border-blue-500 text-blue-700 cursor-pointer hover:bg-blue-50"
                  onClick={() => navigator.clipboard.writeText(hashtag)}
                >
                  {hashtag}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              💡 Click hashtags to copy them
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Posting Times */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-green-500" />
            Optimal Posting Times
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 bg-green-50 rounded border">
              <div className="font-medium text-green-700">Peak Hours</div>
              <div className="text-green-600">6-9 PM, 12-2 PM</div>
            </div>
            <div className="p-2 bg-blue-50 rounded border">
              <div className="font-medium text-blue-700">Best Days</div>
              <div className="text-blue-600">Tue, Wed, Fri</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}