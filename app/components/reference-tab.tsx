'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Loader2, 
  Upload, 
  Youtube, 
  FileText, 
  CheckCircle, 
  Copy,
  RefreshCw,
  Globe,
  TrendingUp
} from 'lucide-react'
import Image from 'next/image'
// Define types locally since they're not exported from process-reference
export interface ReferenceSource {
  id: string
  type: 'youtube' | 'audio_upload' | 'text_input'
  url?: string
  title?: string
  description?: string
  duration?: number
  thumbnail?: string
  transcript?: string
  processingStatus: 'pending' | 'processing' | 'completed' | 'error'
  errorMessage?: string
  videoAnalysis?: any
  hasVideoAnalysis?: boolean
  videoAnalysisQuality?: 'high' | 'medium' | 'low' | 'failed'
}

export interface ReferenceContent {
  id: string
  source: ReferenceSource
  extractedContent: {
    title: string
    description: string
    transcript: string
    keyTopics: string[]
    sentiment: string
    duration: number
  }
  generatedPitch: string
  contentQuality: 'full' | 'partial' | 'metadata-only'
  warning?: string
  createdAt: Date
  updatedAt: Date
  structuredPitch?: any
  isStructuredOutput?: boolean
}
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from 'lucide-react'
import { translateError, type UserFriendlyError } from '@/lib/error-utils'
import { ErrorDisplay } from '@/components/ui/error-display'
import { useShortsDetection } from '@/app/hooks/useShortsDetection'
import { ShortsIndicator } from '@/app/components/shorts-indicator'
import { ShortsResultDisplay } from '@/app/components/shorts-result-display'
import { ContentTypeOverride } from '@/app/components/content-type-override'
import { TrendAnalysis } from '@/app/components/trend-analysis'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { SUPPORTED_LANGUAGES } from '../constants/languages'

interface ReferenceTabProps {
  pitch: string
  setPitch: (pitch: string) => void
  style: string
  language: { name: string; code: string }
  onPitchGenerated?: (pitch: string) => void
}

// Using shared language constants for consistency

export function ReferenceTab({
  setPitch,
  style,
  onPitchGenerated
}: ReferenceTabProps) {
  const [activeInputType, setActiveInputType] = useState<'youtube' | 'text' | 'audio'>('youtube')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [textContent, setTextContent] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const [currentSource, setCurrentSource] = useState<ReferenceSource | null>(null)
  const [generatedContent, setGeneratedContent] = useState<ReferenceContent | null>(null)
  const [error, setError] = useState<UserFriendlyError | null>(null)
  const [selectedPitchLanguage, setSelectedPitchLanguage] = useState(SUPPORTED_LANGUAGES[0]) // Default to Traditional Chinese
  // const audioInputRef = useRef<HTMLInputElement>(null) // For future audio upload feature
  
  // Shorts detection and manual override
  const shortsDetection = useShortsDetection(youtubeUrl)
  const [contentTypeOverride, setContentTypeOverride] = useState<'shorts' | 'video' | 'auto'>('auto')
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false)
  
  // Determine final content type (considering manual override)
  const finalContentType = contentTypeOverride === 'auto' 
    ? (shortsDetection.isShorts ? 'shorts' : 'video')
    : contentTypeOverride

  const handleYouTubeProcess = async () => {
    if (!youtubeUrl.trim()) return

    const requestId = `youtube_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    console.log(`🚀 [${requestId}] Starting YouTube processing:`, youtubeUrl)

    setIsProcessing(true)
    setError(null)
    setProgress(0)
    setProcessingStep('Extracting video metadata...')

    try {
      setProgress(25)
      setProcessingStep('Processing YouTube content...')
      
      console.log(`📡 [${requestId}] Sending request to API with:`, {
        url: youtubeUrl,
        targetLanguage: selectedPitchLanguage.name,
        contentType: finalContentType,
        useStructuredOutput: true
      })
      
      // Use API route instead of direct Server Action imports
      const response = await fetch('/api/process-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: youtubeUrl,
          targetLanguage: selectedPitchLanguage.name,
          useStructuredOutput: true
        })
      })

      console.log(`📨 [${requestId}] API response status:`, response.status, response.statusText)

      const result = await response.json()
      console.log(`📋 [${requestId}] API response data:`, {
        success: result.success,
        hasData: !!result.data,
        hasError: !!result.error,
        errorDetails: result.details,
        requestId: result.requestId
      })
      
      if (!response.ok) {
        console.error(`❌ [${requestId}] API request failed:`, {
          status: response.status,
          error: result.error,
          details: result.details,
          requestId: result.requestId
        })
        throw new Error(result.error || result.details || 'Failed to process YouTube content')
      }

      setProgress(75)
      setProcessingStep('Finalizing...')
      
      const content = result.data
      
      if (!content) {
        console.error(`❌ [${requestId}] No content data received from API`)
        throw new Error('No content data received from API')
      }
      
      console.log(`✅ [${requestId}] Content processed successfully:`, {
        hasSource: !!content.source,
        sourceTitle: content.source?.title,
        pitchLength: content.generatedPitch?.length || 0,
        isStructured: content.isStructuredOutput,
        contentQuality: content.contentQuality
      })
      
      setProgress(100)
      setProcessingStep('Complete!')

      setGeneratedContent(content)
      
      // Create source object for display
      const source: ReferenceSource = {
        id: generateId(),
        type: 'youtube',
        url: youtubeUrl,
        title: content.source?.title || 'YouTube Video',
        description: content.source?.description || '',
        transcript: content.source?.transcript || '',
        duration: content.source?.duration,
        thumbnail: content.source?.thumbnail,
        processingStatus: 'completed',
        videoAnalysis: content.source?.videoAnalysis,
        hasVideoAnalysis: content.source?.hasVideoAnalysis,
        videoAnalysisQuality: content.source?.videoAnalysisQuality
      }
      setCurrentSource(source)
      
      // Auto-populate the pitch
      if (onPitchGenerated && content.generatedPitch) {
        console.log(`🎯 [${requestId}] Auto-populating pitch (${content.generatedPitch.length} chars)`)
        onPitchGenerated(content.generatedPitch)
      }

    } catch (err) {
      console.error(`💥 [${requestId}] Error processing YouTube content:`, {
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined,
        url: youtubeUrl,
        timestamp: new Date().toISOString()
      })
      setError(translateError(err))
    } finally {
      setIsProcessing(false)
      console.log(`🏁 [${requestId}] YouTube processing completed`)
    }
  }

  const handleTextProcess = async () => {
    if (!textContent.trim()) return

    setIsProcessing(true)
    setError(null)
    setProgress(0)
    setProcessingStep('Analyzing text content...')

    try {
      const source: ReferenceSource = {
        id: generateId(),
        type: 'text_input',
        title: 'Text Input',
        description: textContent.substring(0, 200) + '...',
        transcript: textContent,
        processingStatus: 'processing'
      }

      setCurrentSource(source)
      setProgress(50)

      // Process text content using API route
      const response = await fetch('/api/process-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textContent,
          targetLanguage: selectedPitchLanguage.name,
          style
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.details || 'Failed to process text content')
      }

      const result = await response.json()
      const content = result.data
      setProgress(100)
      setProcessingStep('Complete!')

      setGeneratedContent(content)
      
      if (onPitchGenerated) {
        onPitchGenerated(content.generatedPitch)
      }

    } catch (err) {
      console.error('Error processing text content:', err)
      setError(translateError(err))
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const reset = () => {
    setCurrentSource(null)
    setGeneratedContent(null)
    setError(null)
    setProgress(0)
    setProcessingStep('')
    setYoutubeUrl('')
    setTextContent('')
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Reference Content</h2>
        <p className="text-gray-600">
          Transform existing content into compelling video pitches using AI
        </p>
      </div>

      {/* Language Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Globe className="w-5 h-5 text-gray-500" />
            <Label htmlFor="pitch-language" className="font-medium">
              Pitch 語言選擇 (Pitch Language):
            </Label>
            <Select
              value={selectedPitchLanguage.code}
              onValueChange={(code) => {
                const lang = SUPPORTED_LANGUAGES.find(l => l.code === code)
                if (lang) setSelectedPitchLanguage(lang)
              }}
            >
              <SelectTrigger id="pitch-language" className="w-[200px]">
                <SelectValue>{selectedPitchLanguage.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!generatedContent && (
        <Tabs value={activeInputType} onValueChange={(value) => setActiveInputType(value as 'youtube' | 'text' | 'audio')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Youtube className="w-4 h-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Text
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Audio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Youtube className="w-5 h-5 text-red-500" />
                  YouTube Video
                </CardTitle>
                <CardDescription>
                  Enter YouTube video or Shorts URL to extract content and generate a video pitch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="https://www.youtube.com/watch?v=... or https://youtube.com/shorts/..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={isProcessing}
                />
                
                {/* Shorts Detection Indicator */}
                <ShortsIndicator detection={shortsDetection} />
                
                {/* Content Type Override */}
                <ContentTypeOverride
                  detection={shortsDetection}
                  onOverride={setContentTypeOverride}
                  currentOverride={contentTypeOverride}
                />
                <Button 
                  onClick={handleYouTubeProcess}
                  disabled={!youtubeUrl.trim() || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    finalContentType === 'shorts' ? 'Process YouTube Shorts' : 'Process YouTube Video'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Text Content
                </CardTitle>
                <CardDescription>
                  Paste your content directly to generate a video pitch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste your article, blog post, script, or any text content here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  disabled={isProcessing}
                  rows={8}
                />
                <Button 
                  onClick={handleTextProcess}
                  disabled={!textContent.trim() || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Process Text Content'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audio" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-green-500" />
                  Audio File
                </CardTitle>
                <CardDescription>
                  Upload an audio file to transcribe and generate a pitch (Coming Soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-2">Audio transcription coming soon</p>
                  <p className="text-sm text-gray-400">
                    Will support MP3, WAV, M4A files
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">{processingStep}</span>
                {finalContentType === 'shorts' && (
                  <Badge variant="outline" className="border-red-500 text-red-700 ml-2">
                    Shorts Mode
                  </Badge>
                )}
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <ErrorDisplay error={error} onRetry={reset} />
      )}

      {/* Generated Content Display */}
      {generatedContent && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              Pitch Generated Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Content Quality Warning */}
            {generatedContent.warning && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <InfoIcon className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Limited Content Available</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  {generatedContent.warning}
                </AlertDescription>
              </Alert>
            )}
            {/* Source Info */}
            {currentSource && (
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-start gap-4">
                  {currentSource.thumbnail && (
                    <Image
                      src={currentSource.thumbnail}
                      alt="Thumbnail"
                      width={120}
                      height={68}
                      className="rounded-lg object-cover"
                      onError={(e) => {
                        // Hide the image on error by setting display to none
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                      unoptimized={currentSource.thumbnail.includes('ytimg.com')}
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">{currentSource.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {currentSource.description?.substring(0, 150)}...
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{currentSource.type}</Badge>
                      {currentSource.duration && (
                        <Badge variant="outline" className={finalContentType === 'shorts' ? "border-red-500 text-red-700" : ""}>
                          {Math.floor(currentSource.duration / 60)}:
                          {(currentSource.duration % 60).toString().padStart(2, '0')}
                          {finalContentType === 'shorts' && " Shorts"}
                        </Badge>
                      )}
                      {generatedContent.contentQuality === 'partial' && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                          Partial Content
                        </Badge>
                      )}
                      {generatedContent.contentQuality === 'metadata-only' && (
                        <Badge variant="outline" className="border-orange-500 text-orange-700">
                          Metadata Only
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shorts-Specific Analysis */}
            {finalContentType === 'shorts' && (
              <ShortsResultDisplay content={generatedContent} />
            )}
            
            {/* Advanced Features Toggle */}
            {finalContentType === 'shorts' && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedFeatures(!showAdvancedFeatures)}
                  className="text-purple-600 hover:text-purple-700"
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {showAdvancedFeatures ? 'Hide' : 'Show'} Trend Analysis
                </Button>
              </div>
            )}
            
            {/* Trend Analysis */}
            {finalContentType === 'shorts' && showAdvancedFeatures && (
              <TrendAnalysis keyTopics={generatedContent.extractedContent.keyTopics} />
            )}

            {/* Generated Pitch */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">
                  {finalContentType === 'shorts' ? "Shorts-Optimized Pitch" : "Generated Pitch"}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedContent.generatedPitch)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-gray-800">{generatedContent.generatedPitch}</p>
            </div>

            {/* Key Topics */}
            {generatedContent.extractedContent.keyTopics.length > 0 && (
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium mb-2">Key Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {generatedContent.extractedContent.keyTopics.map((topic, index) => (
                    <Badge key={index} variant="secondary">{topic}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setPitch(generatedContent.generatedPitch)
                  onPitchGenerated?.(generatedContent.generatedPitch)
                }}
                className="flex-1"
              >
                Use This Pitch
              </Button>
              <Button variant="outline" onClick={reset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}