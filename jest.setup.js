// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Learn more: https://jestjs.io/docs/configuration#setupfilesafterenv-array
// import '@testing-library/jest-dom' // Commented out due to dependency issues

// Mock Next.js router
const useRouter = jest.fn()
useRouter.mockReturnValue({
  route: '/',
  pathname: '/',
  query: {},
  asPath: '/',
  push: jest.fn(),
  pop: jest.fn(),
  reload: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn().mockResolvedValue(undefined),
  beforePopState: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  isFallback: false,
  isLocaleDomain: true,
  isReady: true,
  defaultLocale: 'en',
  domainLocales: [],
  isPreview: false,
})

jest.mock('next/router', () => ({
  useRouter,
}))

// Mock Framer Motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    section: 'section',
    article: 'article',
    main: 'main',
    nav: 'nav',
    aside: 'aside',
    header: 'header',
    footer: 'footer',
  },
  AnimatePresence: ({ children }) => children,
}))

// Mock window.matchMedia for responsive components (only if window exists)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock browser APIs only if in browser-like environment
if (typeof global !== 'undefined') {
  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    
    observe() {
      return null
    }
    
    disconnect() {
      return null
    }
    
    unobserve() {
      return null
    }
  }
  
  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    
    observe() {
      return null
    }
    
    disconnect() {
      return null
    }
    
    unobserve() {
      return null
    }
  }
}

// Setup global test utilities
global.testUtils = {
  mockAspectRatio: {
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
  
  mockScene: {
    imagePrompt: 'Test image prompt',
    videoPrompt: 'Test video prompt', 
    description: 'Test scene description',
    voiceover: 'Test voiceover text',
    charactersPresent: []
  },
  
  waitForAsync: () => new Promise(resolve => setTimeout(resolve, 0))
}