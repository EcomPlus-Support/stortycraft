# Reference Tab Technical Implementation Specification

## Component Architecture

### 1. ReferenceTab Component Structure
```typescript
// app/components/reference-tab.tsx
interface ReferenceTabProps {
  onContentGenerated: (content: ReferenceContent) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

interface ReferenceContent {
  videoUrl: string;
  videoTitle: string;
  videoThumbnail: string;
  extractedTranscript: string;
  generatedPitch: string;
  suggestedGenre?: string;
  suggestedMood?: string;
  suggestedStyle?: string;
  confidence: number;
  analysisDate: Date;
}
```

### 2. Sub-Components Breakdown

#### VideoUrlInput Component
```typescript
interface VideoUrlInputProps {
  value: string;
  onChange: (url: string) => void;
  onSubmit: () => void;
  isValidating: boolean;
  validationError: string | null;
  isLoading: boolean;
}

// Features:
// - Real-time URL validation
// - YouTube URL format detection
// - Video availability checking
// - Thumbnail preview
```

#### AnalysisProgress Component
```typescript
interface AnalysisProgressProps {
  stage: 'extracting' | 'analyzing' | 'generating' | 'complete';
  progress: number; // 0-100
  estimatedTimeRemaining: number; // seconds
  currentOperation: string;
}

// Features:
// - Multi-stage progress visualization
// - Time estimation
// - Educational content during wait
// - Cancel operation option
```

#### ContentPreview Component
```typescript
interface ContentPreviewProps {
  content: ReferenceContent;
  onEdit: (field: keyof ReferenceContent, value: string) => void;
  onTransfer: () => void;
}

// Features:
// - Expandable content sections
// - Inline editing capabilities
// - Confidence indicators
// - Transfer to Create button
```

## API Integration Layer

### 1. YouTube Content Extraction Service
```typescript
// lib/youtube-extractor.ts
export class YouTubeExtractor {
  async extractContent(videoUrl: string): Promise<YouTubeContent> {
    // Method 1: Try youtube-transcript-api (faster, no auth)
    try {
      return await this.extractWithTranscriptAPI(videoUrl);
    } catch (error) {
      console.warn('Transcript API failed, trying YouTube Data API');
    }

    // Method 2: Fallback to YouTube Data API v3
    try {
      return await this.extractWithDataAPI(videoUrl);
    } catch (error) {
      console.error('All extraction methods failed');
      throw new ExtractionError('Unable to extract video content');
    }
  }

  private async extractWithTranscriptAPI(videoUrl: string) {
    const videoId = this.extractVideoId(videoUrl);
    const response = await fetch(`/api/youtube/transcript/${videoId}`);
    return await response.json();
  }

  private async extractWithDataAPI(videoUrl: string) {
    const videoId = this.extractVideoId(videoUrl);
    const response = await fetch(`/api/youtube/captions/${videoId}`);
    return await response.json();
  }
}

interface YouTubeContent {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  transcript: string;
  language: string;
  publishedAt: Date;
}
```

### 2. Gemini Analysis Service
```typescript
// lib/video-analyzer.ts
export class VideoAnalyzer {
  async analyzeContent(content: YouTubeContent): Promise<AnalysisResult> {
    const prompt = this.buildAnalysisPrompt(content);
    
    const { text } = await generateText({
      model: vertex("gemini-2.5-pro"),
      prompt,
      temperature: 0.7,
      maxTokens: 2000
    });

    return this.parseAnalysisResult(text);
  }

  private buildAnalysisPrompt(content: YouTubeContent): string {
    return `
      Analyze this YouTube video content and create a compelling story pitch suitable for video production.

      Video Title: ${content.title}
      Video Description: ${content.description}
      Transcript: ${content.transcript}

      Please provide:
      1. A compelling story pitch (2-3 paragraphs)
      2. Suggested visual style based on content
      3. Key characters mentioned or implied
      4. Primary settings/locations
      5. Emotional tone/mood
      6. Genre classification
      7. Confidence score (0-1) for the analysis

      Format as JSON with clear structure.
    `;
  }
}

interface AnalysisResult {
  pitch: string;
  style: string;
  characters: Array<{name: string, description: string}>;
  settings: Array<{name: string, description: string}>;
  mood: string;
  genre: string;
  confidence: number;
  reasoning: string;
}
```

## Server Actions Implementation

### 1. Video Analysis Action
```typescript
// app/actions/analyze-video.ts
'use server'

import { YouTubeExtractor } from '@/lib/youtube-extractor';
import { VideoAnalyzer } from '@/lib/video-analyzer';
import { ReferenceContent } from '@/app/types';

export async function analyzeVideo(videoUrl: string): Promise<ReferenceContent> {
  try {
    console.log('Starting video analysis for:', videoUrl);
    
    // Step 1: Extract video content
    const extractor = new YouTubeExtractor();
    const content = await extractor.extractContent(videoUrl);
    
    // Step 2: Analyze with Gemini
    const analyzer = new VideoAnalyzer();
    const analysis = await analyzer.analyzeContent(content);
    
    // Step 3: Format result
    return {
      videoUrl,
      videoTitle: content.title,
      videoThumbnail: content.thumbnail,
      extractedTranscript: content.transcript,
      generatedPitch: analysis.pitch,
      suggestedGenre: analysis.genre,
      suggestedMood: analysis.mood,
      suggestedStyle: analysis.style,
      confidence: analysis.confidence,
      analysisDate: new Date()
    };
    
  } catch (error) {
    console.error('Video analysis failed:', error);
    throw new Error(`Analysis failed: ${error.message}`);
  }
}
```

### 2. URL Validation Action
```typescript
// app/actions/validate-youtube-url.ts
'use server'

export async function validateYouTubeUrl(url: string): Promise<ValidationResult> {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      return { valid: false, error: 'Invalid YouTube URL format' };
    }

    // Check if video exists and is accessible
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${process.env.YOUTUBE_API_KEY}&part=snippet,status`
    );
    
    const data = await response.json();
    
    if (data.items.length === 0) {
      return { valid: false, error: 'Video not found or is private' };
    }

    const video = data.items[0];
    if (video.status.privacyStatus !== 'public') {
      return { valid: false, error: 'Video is not publicly accessible' };
    }

    return {
      valid: true,
      videoInfo: {
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.medium.url,
        duration: video.contentDetails.duration
      }
    };
    
  } catch (error) {
    return { valid: false, error: 'Failed to validate video URL' };
  }
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  videoInfo?: {
    title: string;
    thumbnail: string;
    duration: string;
  };
}
```

## State Management Integration

### 1. Updated Main App State
```typescript
// app/page.tsx - Additional state variables
export default function Home() {
  // Existing state...
  const [referenceContent, setReferenceContent] = useState<ReferenceContent | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleVideoAnalysis = async (videoUrl: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const content = await analyzeVideo(videoUrl);
      setReferenceContent(content);
      // Optionally auto-switch to create tab with pre-populated content
    } catch (error) {
      setAnalysisError(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTransferToCreate = (content: ReferenceContent) => {
    setPitch(content.generatedPitch);
    
    // Pre-populate other fields based on analysis
    if (content.suggestedStyle) {
      setStyle(content.suggestedStyle);
    }
    
    // Switch to create tab
    setActiveTab("create");
    
    // Store reference for later use
    localStorage.setItem('lastReference', JSON.stringify(content));
  };

  // ... rest of component
}
```

### 2. Reference Tab Integration
```typescript
// In the main app JSX, add before create tab:
<TabsContent value="reference">
  <ReferenceTab
    onContentGenerated={setReferenceContent}
    onTransferToCreate={handleTransferToCreate}
    isLoading={isAnalyzing}
    errorMessage={analysisError}
    referenceContent={referenceContent}
  />
</TabsContent>
```

## API Routes Implementation

### 1. YouTube Transcript API Route
```typescript
// app/api/youtube/transcript/[videoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;
    
    // Use youtube-transcript-api equivalent
    const transcriptResponse = await fetch(
      `https://youtubetranscript.com/api/transcript/${videoId}`
    );
    
    if (!transcriptResponse.ok) {
      throw new Error('Failed to fetch transcript');
    }
    
    const transcriptData = await transcriptResponse.json();
    
    return NextResponse.json({
      success: true,
      transcript: transcriptData.transcript,
      language: transcriptData.language,
      duration: transcriptData.duration
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### 2. Video Analysis API Route
```typescript
// app/api/analyze-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { analyzeVideo } from '@/app/actions/analyze-video';

export async function POST(request: NextRequest) {
  try {
    const { videoUrl } = await request.json();
    
    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: 'Video URL is required' },
        { status: 400 }
      );
    }
    
    const result = await analyzeVideo(videoUrl);
    
    return NextResponse.json({
      success: true,
      content: result
    });
    
  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

## UI Component Implementation

### 1. ReferenceTab Component
```typescript
// app/components/reference-tab.tsx
'use client'

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Youtube, ArrowRight, Edit, Check, X } from 'lucide-react';

export function ReferenceTab({
  onContentGenerated,
  onTransferToCreate,
  isLoading,
  errorMessage,
  referenceContent
}: ReferenceTabProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!isValidUrl) return;
    
    try {
      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl })
      });
      
      const data = await response.json();
      
      if (data.success) {
        onContentGenerated(data.content);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Youtube className="w-6 h-6 text-red-500" />
          <h2 className="text-2xl font-bold">Video Reference</h2>
        </div>
        <p className="text-muted-foreground">
          Transform any YouTube video into a compelling story pitch using AI analysis
        </p>
      </div>

      {/* URL Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="w-5 h-5" />
            YouTube Video URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleAnalyze}
              disabled={!isValidUrl || isLoading}
              className="px-6"
            >
              {isLoading ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>
          
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {errorMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {referenceContent && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Story Pitch</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Analysis complete - {Math.round(referenceContent.confidence * 100)}% confidence
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Generated Pitch */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Story Pitch</label>
              <Textarea
                value={referenceContent.generatedPitch}
                onChange={(e) => onContentGenerated({
                  ...referenceContent,
                  generatedPitch: e.target.value
                })}
                className="min-h-[120px]"
              />
            </div>

            {/* Video Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <label className="text-sm font-medium">Style</label>
                <p className="text-sm text-muted-foreground">{referenceContent.suggestedStyle}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Mood</label>
                <p className="text-sm text-muted-foreground">{referenceContent.suggestedMood}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Genre</label>
                <p className="text-sm text-muted-foreground">{referenceContent.suggestedGenre}</p>
              </div>
            </div>

            {/* Transfer Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => onTransferToCreate(referenceContent)}
                size="lg"
                className="px-8"
              >
                Use This Pitch
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## Error Handling & Edge Cases

### 1. Comprehensive Error Types
```typescript
// lib/errors.ts
export class VideoAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'VideoAnalysisError';
  }
}

export const ERROR_CODES = {
  INVALID_URL: 'invalid_url',
  VIDEO_NOT_FOUND: 'video_not_found',
  VIDEO_PRIVATE: 'video_private',
  NO_TRANSCRIPT: 'no_transcript',
  ANALYSIS_FAILED: 'analysis_failed',
  RATE_LIMITED: 'rate_limited',
  NETWORK_ERROR: 'network_error'
} as const;
```

### 2. Error Recovery Strategies
```typescript
// lib/error-recovery.ts
export class ErrorRecovery {
  static getRecoveryOptions(error: VideoAnalysisError): RecoveryOption[] {
    switch (error.code) {
      case ERROR_CODES.INVALID_URL:
        return [
          { type: 'retry', label: 'Check URL format' },
          { type: 'manual', label: 'Enter pitch manually' }
        ];
      
      case ERROR_CODES.NO_TRANSCRIPT:
        return [
          { type: 'manual', label: 'Create pitch manually' },
          { type: 'different_video', label: 'Try another video' }
        ];
      
      case ERROR_CODES.RATE_LIMITED:
        return [
          { type: 'wait', label: 'Try again in 5 minutes' },
          { type: 'manual', label: 'Create pitch manually' }
        ];
      
      default:
        return [
          { type: 'retry', label: 'Try again' },
          { type: 'manual', label: 'Enter pitch manually' }
        ];
    }
  }
}

interface RecoveryOption {
  type: 'retry' | 'manual' | 'wait' | 'different_video';
  label: string;
}
```

## Performance Optimization

### 1. Caching Strategy
```typescript
// lib/cache.ts
export class AnalysisCache {
  private static cache = new Map<string, CacheEntry>();
  
  static async get(videoUrl: string): Promise<ReferenceContent | null> {
    const entry = this.cache.get(videoUrl);
    if (!entry || this.isExpired(entry)) {
      return null;
    }
    return entry.content;
  }
  
  static set(videoUrl: string, content: ReferenceContent): void {
    this.cache.set(videoUrl, {
      content,
      timestamp: Date.now(),
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    });
  }
  
  private static isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
}

interface CacheEntry {
  content: ReferenceContent;
  timestamp: number;
  ttl: number;
}
```

### 2. Background Processing
```typescript
// lib/background-processor.ts
export class BackgroundProcessor {
  private static workers = new Map<string, Worker>();
  
  static async processVideo(
    videoUrl: string,
    onProgress: (stage: string, progress: number) => void
  ): Promise<ReferenceContent> {
    const workerId = `analysis-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const worker = new Worker('/workers/video-analysis.js');
      
      worker.postMessage({ videoUrl, workerId });
      
      worker.onmessage = (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'progress':
            onProgress(data.stage, data.progress);
            break;
          case 'complete':
            resolve(data.result);
            this.cleanup(workerId);
            break;
          case 'error':
            reject(new Error(data.error));
            this.cleanup(workerId);
            break;
        }
      };
      
      this.workers.set(workerId, worker);
    });
  }
  
  private static cleanup(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.terminate();
      this.workers.delete(workerId);
    }
  }
}
```

This technical specification provides a comprehensive foundation for implementing the Reference tab feature, ensuring robust error handling, optimal performance, and seamless integration with the existing StoryCraft application architecture.