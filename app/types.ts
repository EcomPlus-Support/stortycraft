export interface Scene {
  imagePrompt: string;
  videoPrompt: string;
  description: string;
  voiceover: string;
  charactersPresent: string[];
  imageBase64?: string;
  videoUri?: string | Promise<string>;
  aspectRatio?: AspectRatio;
  metadata?: {
    createdAt?: string;
    processingTime?: number;
    cost?: number;
    retryCount?: number;
    version?: string;
  };
}

export interface AspectRatio {
  id: string;
  label: string;
  ratio: number; // width/height
  width: number;
  height: number;
  cssClass: string;
  icon?: string;
  description?: string;
  imagenFormat?: string; // Format string for Imagen API
  veoFormat?: string; // Format string for Veo API
  resolutionMappings?: {
    low?: { width: number; height: number };
    medium?: { width: number; height: number };
    high?: { width: number; height: number };
  };
  costMultiplier?: number;
  isSupported?: {
    imagen?: boolean;
    veo?: boolean;
  };
}

export interface Scenario {
  scenario: string;
  genre: string;
  mood: string;
  music: string;
  language: Language;
  characters: Array<{ name: string, description: string, imageBase64?: string }>;
  settings: Array<{ name: string, description: string }>;
  logoOverlay?: string;
  scenes: Scene[];
  aspectRatio?: AspectRatio;
  metadata?: {
    id?: string;
    createdAt?: string;
    version?: string;
    totalCost?: number;
    processingTime?: number;
  };
}

export interface Language {
  name: string;
  code: string;
}

// API Types
export interface VideoGenerationRequest {
  scenes: Scene[];
  aspectRatio?: AspectRatio;
  options?: {
    quality?: 'low' | 'medium' | 'high';
    enableCaching?: boolean;
    priority?: 'low' | 'medium' | 'high';
    retryAttempts?: number;
    timeout?: number;
  };
}

export interface VideoGenerationResponse {
  success: boolean;
  videoUrls?: string[];
  error?: string;
  metadata?: {
    processingTime: number;
    cost: number;
    cacheHit?: boolean;
    aspectRatio: AspectRatio;
    warnings?: string[];
  };
}

// Cost Tracking
export interface CostEntry {
  id: string;
  timestamp: string;
  service: 'imagen' | 'veo' | 'gemini' | 'tts';
  operation: string;
  cost: number;
  aspectRatio?: string;
  metadata?: Record<string, any>;
}

export interface ServiceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalCost: number;
  aspectRatioBreakdown: Record<string, number>;
  lastUpdated: string;
}

// Error Types
export interface AspectRatioError {
  code: 'INVALID_ASPECT_RATIO' | 'UNSUPPORTED_ASPECT_RATIO' | 'ASPECT_RATIO_MISMATCH';
  message: string;
  aspectRatio?: string;
  supportedRatios?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Cache Types
export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: string;
  hitCount: number;
  aspectRatio?: string;
}

// Performance Monitoring
export interface PerformanceMetrics {
  service: string;
  operation: string;
  duration: number;
  timestamp: string;
  success: boolean;
  aspectRatio?: string;
  metadata?: Record<string, any>;
}

// Video Processing Types
export interface VideoProcessingOptions {
  aspectRatio: AspectRatio;
  quality?: 'low' | 'medium' | 'high';
  enableUpscaling?: boolean;
  enableAspectRatioConversion?: boolean;
  preserveAspectRatio?: boolean;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  aspectRatio: number;
  format: string;
  codec?: string;
  bitrate?: number;
  fileSize?: number;
} 