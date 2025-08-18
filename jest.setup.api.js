// Setup for API tests
const { beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals')

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-jwt-signing-very-long-and-secure'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/storycraft_test'
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook_secret'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
process.env.FACEBOOK_CLIENT_ID = 'test-facebook-client-id'
process.env.FACEBOOK_CLIENT_SECRET = 'test-facebook-client-secret'

// Mock Prisma client
const mockPrismaClient = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  account: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  creditTransaction: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  subscription: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}

// Mock the PrismaClient constructor to return our mock
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}))

// Mock Stripe
const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
  prices: {
    list: jest.fn(),
  },
  products: {
    list: jest.fn(),
  },
}

jest.mock('stripe', () => {
  return jest.fn(() => mockStripe)
})

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn((password, rounds) => Promise.resolve(`hashed_${password}_${rounds}`)),
  compare: jest.fn((password, hash) => {
    const expectedHash = `hashed_${password}_10`
    return Promise.resolve(hash === expectedHash)
  }),
}))

// Mock next-auth
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next-auth/providers/facebook', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// Mock JWT operations
let lastJWTPayload = null
jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation((payload) => {
    lastJWTPayload = payload
    return {
      setProtectedHeader: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      sign: jest.fn().mockResolvedValue(`mock-jwt-token.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`),
    }
  }),
  jwtVerify: jest.fn().mockImplementation((token) => {
    // Handle invalid tokens
    if (!token || token === 'invalid.jwt.token' || !token.startsWith('mock-jwt-token')) {
      throw new Error('Invalid token')
    }
    
    // Extract payload from the mock token or use last payload
    let payload = lastJWTPayload
    if (token.includes('.')) {
      try {
        const parts = token.split('.')
        if (parts.length >= 2) {
          payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
        }
      } catch (e) {
        // Fallback to last payload
      }
    }
    return Promise.resolve({
      payload: payload || { userId: 'test-user-id', email: 'test@example.com' },
    })
  }),
}))

// Global test utilities
global.testDb = mockPrismaClient
global.testStripe = mockStripe

// Test data factories
global.createTestUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  credits: 50,
  tier: 'FREE',
  image: null,
  password: null,
  googleId: null,
  facebookId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

global.createTestCreditTransaction = (overrides = {}) => ({
  id: 'txn-123',
  userId: 'user-123',
  amount: -1,
  type: 'DEDUCTION_TEXT',
  description: 'Text processing operation',
  createdAt: new Date(),
  ...overrides,
})

global.createTestPayment = (overrides = {}) => ({
  id: 'payment-123',
  userId: 'user-123',
  stripePaymentId: 'pi_test_123',
  amount: 1999,
  currency: 'usd',
  status: 'COMPLETED',
  creditsGranted: 50,
  createdAt: new Date(),
  ...overrides,
})

// Cleanup function
global.resetMocks = () => {
  jest.clearAllMocks()
  
  // Reset Prisma mocks
  Object.values(mockPrismaClient).forEach(model => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockReset()
        }
      })
    }
  })
  
  // Reset Stripe mocks
  Object.values(mockStripe).forEach(service => {
    if (typeof service === 'object' && service !== null) {
      Object.values(service).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockReset()
        }
      })
    }
  })
}

// Setup and teardown
beforeEach(() => {
  global.resetMocks()
})

afterEach(() => {
  jest.clearAllTimers()
})