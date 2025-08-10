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
  Globe
} from 'lucide-react'
import Image from 'next/image'
import { extractYouTubeMetadata, processReferenceContent, type ReferenceSource, type ReferenceContent } from '../actions/process-reference'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from 'lucide-react'
import { translateError, type UserFriendlyError } from '@/lib/error-utils'
import { ErrorDisplay } from '@/components/ui/error-display'
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

  const handleYouTubeProcess = async () => {
    if (!youtubeUrl.trim()) return

    setIsProcessing(true)
    setError(null)
    setProgress(0)
    setProcessingStep('Extracting video metadata...')

    try {
      // Step 1: Extract metadata
      const metadata = await extractYouTubeMetadata(youtubeUrl)
      setProgress(25)

      if (metadata.processingStatus === 'error') {
        throw new Error(metadata.errorMessage || 'Failed to extract metadata')
      }

      const source: ReferenceSource = {
        id: generateId(),
        type: 'youtube',
        url: youtubeUrl,
        ...metadata,
        processingStatus: 'processing'
      }

      setCurrentSource(source)
      setProgress(50)
      setProcessingStep('Analyzing content with AI...')

      // Step 2: Process with AI
      const content = await processReferenceContent(source, style, selectedPitchLanguage.name)
      setProgress(100)
      setProcessingStep('Complete!')

      setGeneratedContent(content)
      
      // Auto-populate the pitch
      if (onPitchGenerated) {
        onPitchGenerated(content.generatedPitch)
      }

    } catch (err) {
      console.error('Error processing YouTube content:', err)
      setError(translateError(err))
    } finally {
      setIsProcessing(false)
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

      const content = await processReferenceContent(source, style, selectedPitchLanguage.name)
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
                  Enter a YouTube URL to extract content and generate a video pitch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={isProcessing}
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
                    'Process YouTube Video'
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
                        <Badge variant="outline">
                          {Math.floor(currentSource.duration / 60)}:
                          {(currentSource.duration % 60).toString().padStart(2, '0')}
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

            {/* Generated Pitch */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Generated Pitch</h4>
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