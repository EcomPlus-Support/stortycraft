import { type AspectRatio } from '../types';

export const ASPECT_RATIOS: AspectRatio[] = [
  {
    id: '16:9',
    label: '16:9 Widescreen',
    ratio: 16/9,
    width: 16,
    height: 9,
    cssClass: 'aspect-[16/9]',
    icon: '📺',
    description: 'Standard widescreen format for movies and TV',
    imagenFormat: '16:9',
    veoFormat: '16:9',
    resolutionMappings: {
      low: { width: 960, height: 540 },
      medium: { width: 1280, height: 720 },
      high: { width: 1920, height: 1080 }
    },
    costMultiplier: 1.0,
    isSupported: {
      imagen: true,
      veo: true
    }
  },
  {
    id: '9:16',
    label: '9:16 Portrait',
    ratio: 9/16,
    width: 9,
    height: 16,
    cssClass: 'aspect-[9/16]',
    icon: '📱',
    description: 'Vertical format for mobile and social media',
    imagenFormat: '9:16',
    veoFormat: '9:16',
    resolutionMappings: {
      low: { width: 540, height: 960 },
      medium: { width: 720, height: 1280 },
      high: { width: 1080, height: 1920 }
    },
    costMultiplier: 1.1,
    isSupported: {
      imagen: true,
      veo: true
    }
  }
];

export const DEFAULT_ASPECT_RATIO = ASPECT_RATIOS[0]; // 16:9

export function getAspectRatioById(id: string): AspectRatio | undefined {
  return ASPECT_RATIOS.find(ar => ar.id === id);
}

export function getAspectRatioClass(aspectRatio?: AspectRatio): string {
  return aspectRatio?.cssClass || DEFAULT_ASPECT_RATIO.cssClass;
}

export function isValidAspectRatio(aspectRatio: unknown): aspectRatio is AspectRatio {
  if (!aspectRatio || typeof aspectRatio !== 'object') {
    return false;
  }
  
  const ar = aspectRatio as Record<string, unknown>;
  return !!(ar && 
    typeof ar.id === 'string' &&
    typeof ar.label === 'string' &&
    typeof ar.ratio === 'number' &&
    ar.ratio > 0 &&
    typeof ar.width === 'number' &&
    typeof ar.height === 'number' &&
    typeof ar.cssClass === 'string');
}

// Service compatibility checks
export function isImagenSupported(aspectRatio: AspectRatio): boolean {
  return aspectRatio.isSupported?.imagen === true;
}

export function isVeoSupported(aspectRatio: AspectRatio): boolean {
  return aspectRatio.isSupported?.veo === true;
}

export function getSupportedAspectRatios(service: 'imagen' | 'veo'): AspectRatio[] {
  return ASPECT_RATIOS.filter(ar => {
    if (service === 'imagen') return isImagenSupported(ar);
    if (service === 'veo') return isVeoSupported(ar);
    return false;
  });
}

// Resolution utilities
export function getResolution(aspectRatio: AspectRatio, quality: 'low' | 'medium' | 'high'): { width: number; height: number } | undefined {
  return aspectRatio.resolutionMappings?.[quality];
}

export function getOptimalResolution(aspectRatio: AspectRatio, maxWidth: number, maxHeight: number): { width: number; height: number } {
  // Find the best resolution that fits within the constraints
  const resolutions = aspectRatio.resolutionMappings;
  if (!resolutions) {
    // Fallback calculation based on aspect ratio
    const ratio = aspectRatio.ratio;
    let width, height;
    
    if (ratio >= 1) {
      // Landscape or square
      width = Math.min(maxWidth, Math.floor(maxHeight * ratio));
      height = Math.floor(width / ratio);
    } else {
      // Portrait
      height = Math.min(maxHeight, Math.floor(maxWidth / ratio));
      width = Math.floor(height * ratio);
    }
    
    return { width, height };
  }
  
  // Check each quality level
  for (const quality of ['low', 'medium', 'high'] as const) {
    const res = resolutions[quality];
    if (res && res.width <= maxWidth && res.height <= maxHeight) {
      return res;
    }
  }
  
  // If none fit, use the lowest resolution
  return resolutions.low || { width: 640, height: 480 };
}

// Cost utilities
export function estimateCost(aspectRatio: AspectRatio, basePrice: number): number {
  return basePrice * (aspectRatio.costMultiplier || 1.0);
}

export function getCostMultiplier(aspectRatio: AspectRatio): number {
  return aspectRatio.costMultiplier || 1.0;
}

// Format utilities
export function getImagenFormat(aspectRatio: AspectRatio): string {
  return aspectRatio.imagenFormat || aspectRatio.id;
}

export function getVeoFormat(aspectRatio: AspectRatio): string {
  return aspectRatio.veoFormat || aspectRatio.id;
}

// Aspect ratio analysis
export function analyzeAspectRatio(width: number, height: number): {
  ratio: number;
  matchedAspectRatio?: AspectRatio;
  isPortrait: boolean;
  isLandscape: boolean;
  isSquare: boolean;
} {
  const ratio = width / height;
  const tolerance = 0.01;
  
  const matchedAspectRatio = ASPECT_RATIOS.find(ar => 
    Math.abs(ar.ratio - ratio) < tolerance
  );
  
  return {
    ratio,
    matchedAspectRatio,
    isPortrait: ratio < 1,
    isLandscape: ratio > 1,
    isSquare: Math.abs(ratio - 1) < tolerance
  };
}

// Grouping utilities
export function groupAspectRatiosByOrientation(): {
  landscape: AspectRatio[];
  portrait: AspectRatio[];
  square: AspectRatio[];
} {
  return ASPECT_RATIOS.reduce((groups, ar) => {
    if (Math.abs(ar.ratio - 1) < 0.01) {
      groups.square.push(ar);
    } else if (ar.ratio > 1) {
      groups.landscape.push(ar);
    } else {
      groups.portrait.push(ar);
    }
    return groups;
  }, {
    landscape: [] as AspectRatio[],
    portrait: [] as AspectRatio[],
    square: [] as AspectRatio[]
  });
}

export function getPopularAspectRatios(): AspectRatio[] {
  // Return most commonly used aspect ratios
  return ASPECT_RATIOS.filter(ar => 
    ['16:9', '9:16'].includes(ar.id)
  );
}

export function getAspectRatioRecommendations(use_case: 'social' | 'web' | 'cinema' | 'mobile'): AspectRatio[] {
  switch (use_case) {
    case 'social':
      return ASPECT_RATIOS.filter(ar => ['9:16', '16:9'].includes(ar.id));
    case 'web':
      return ASPECT_RATIOS.filter(ar => ['16:9'].includes(ar.id));
    case 'cinema':
      return ASPECT_RATIOS.filter(ar => ['16:9'].includes(ar.id));
    case 'mobile':
      return ASPECT_RATIOS.filter(ar => ['9:16'].includes(ar.id));
    default:
      return getPopularAspectRatios();
  }
}