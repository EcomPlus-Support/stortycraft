import { describe, test, expect, beforeEach } from '@jest/globals'

// We'll implement this handler later
import { POST } from '../../../app/api/auth/login/route'

// Helper to create mock Request
function createMockRequest(method: string, body?: any, headers?: any) {
  const url = 'http://localhost:3000/api/auth/login'
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }
  
  if (body) {
    init.body = JSON.stringify(body)
  }
  
  return new Request(url, init)
}

// Helper to parse Response
async function parseResponse(response: Response) {
  const text = await response.text()
  return {
    status: response.status,
    data: text ? JSON.parse(text) : null
  }
}

describe('/api/auth/login', () => {
  beforeEach(() => {
    // Mocks are automatically reset by jest.setup.api.js
  })

  test('should login user with valid credentials', async () => {
    const loginData = {
      email: 'user@example.com',
      password: 'SecurePassword123!'
    }

    const mockUser = global.createTestUser({
      email: loginData.email,
      password: 'hashed_SecurePassword123!_10', // bcrypt mock format
      creditTransactions: [
        global.createTestCreditTransaction({
          type: 'SIGNUP_BONUS',
          amount: 50,
          description: 'Welcome bonus'
        })
      ]
    })

    // Mock database calls
    global.testDb.user.findUnique.mockResolvedValue(mockUser)

    const request = createMockRequest('POST', loginData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(200)
    
    expect(responseData.success).toBe(true)
    expect(responseData.user.email).toBe(loginData.email)
    expect(responseData.user.password).toBeFalsy()
    expect(responseData.token).toBeDefined()
    expect(typeof responseData.token).toBe('string')

    // Verify database call
    expect(global.testDb.user.findUnique).toHaveBeenCalledWith({
      where: { email: loginData.email },
      include: {
        creditTransactions: { take: 10, orderBy: { createdAt: 'desc' } }
      }
    })
  })

  test('should reject login with invalid email', async () => {
    const loginData = {
      email: 'nonexistent@example.com',
      password: 'SecurePassword123!'
    }

    // Mock user not found
    global.testDb.user.findUnique.mockResolvedValue(null)

    const request = createMockRequest('POST', loginData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(401)
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toBe('Invalid credentials')
  })

  test('should reject login with invalid password', async () => {
    const loginData = {
      email: 'user@example.com',
      password: 'WrongPassword123!'
    }

    const mockUser = global.createTestUser({
      email: loginData.email,
      password: 'hashed_CorrectPassword123!_10'
    })

    global.testDb.user.findUnique.mockResolvedValue(mockUser)

    const request = createMockRequest('POST', loginData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(401)
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toBe('Invalid credentials')
  })

  test('should reject login for social auth users without password', async () => {
    const loginData = {
      email: 'social@example.com',
      password: 'SomePassword123!'
    }

    const mockUser = global.createTestUser({
      email: loginData.email,
      password: null, // Social auth user
      googleId: 'google-123'
    })

    global.testDb.user.findUnique.mockResolvedValue(mockUser)

    const request = createMockRequest('POST', loginData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(401)
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toBe('Please use social login')
  })

  test('should validate required fields', async () => {
    const loginData = {
      email: 'user@example.com'
      // Missing password
    }

    const request = createMockRequest('POST', loginData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(400)
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toContain('Required')
  })

  test('should validate email format', async () => {
    const loginData = {
      email: 'invalid-email',
      password: 'SecurePassword123!'
    }

    const request = createMockRequest('POST', loginData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(400)
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toContain('email')
  })

  test('should handle database errors gracefully', async () => {
    const loginData = {
      email: 'user@example.com',
      password: 'SecurePassword123!'
    }

    // Mock database error
    global.testDb.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

    const request = createMockRequest('POST', loginData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(500)
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toBe('Internal server error')
  })

  test('should only accept POST method', async () => {
    // This test should actually test the GET handler since we want to verify that non-POST methods fail
    const { GET } = await import('../../../app/api/auth/login/route')
    const response = await GET()
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(405)
    
    expect(responseData.success).toBe(false)
    expect(responseData.error).toBe('Method not allowed')
  })

  test('should include user credits and recent transactions in response', async () => {
    const loginData = {
      email: 'user@example.com',
      password: 'SecurePassword123!'
    }

    const mockUser = global.createTestUser({
      email: loginData.email,
      password: 'hashed_SecurePassword123!_10',
      credits: 75,
      creditTransactions: [
        global.createTestCreditTransaction({
          type: 'DEDUCTION_TEXT',
          amount: -1,
          description: 'Text processing'
        }),
        global.createTestCreditTransaction({
          type: 'PURCHASE',
          amount: 50,
          description: 'Credit purchase'
        })
      ]
    })

    global.testDb.user.findUnique.mockResolvedValue(mockUser)

    const request = createMockRequest('POST', loginData)
    const response = await POST(request)
    const { status, data: responseData } = await parseResponse(response)

    expect(status).toBe(200)
    
    expect(responseData.success).toBe(true)
    expect(responseData.user.credits).toBe(75)
    expect(responseData.user.creditTransactions).toHaveLength(2)
  })
})